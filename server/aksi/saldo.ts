"use server";

import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import { z } from "zod";
import { normalisasiNip } from "@/lib/domain/nip";
import { saldoTahunBerikut } from "@/lib/domain/saldo-cuti";
import type { HasilForm } from "@/lib/validasi/auth";
import { catatAudit } from "../audit";
import { punyaPeran, wajibLogin } from "../auth/pengguna";
import { db } from "../db";
import { semuaPengaturan } from "../pengaturan";

async function wajibKepegawaian() {
  const u = await wajibLogin();
  return punyaPeran(u, "KEPEGAWAIAN") ? u : null;
}

const angka = (maks: number) => z.coerce.number().int("Harus bilangan bulat.").min(0, "Tidak boleh negatif.").max(maks);

const skemaUbah = z.object({
  pegawaiId: z.uuid(),
  tahun: z.coerce.number().int().min(2000).max(2100),
  hakTahunIni: angka(30),
  sisaN1: angka(30),
  sisaN2: angka(30),
  penyesuaian: z.coerce.number().int().min(-30).max(30),
  catatan: z.string().trim().min(5, "Isi alasan perubahan (min. 5 karakter).").max(300),
});

/** Ubah/buat saldo satu pegawai; setiap selisih dicatat sebagai mutasi PENYESUAIAN. */
export async function ubahSaldo(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const u = await wajibKepegawaian();
  if (!u) return { galat: "Hanya Kepegawaian." };
  const p = skemaUbah.safeParse(Object.fromEntries(fd));
  if (!p.success) return { galat: p.error.issues[0].message };
  const d = p.data;

  await db.$transaction(async (tx) => {
    const lama = await tx.saldoCuti.findUnique({ where: { pegawaiId_tahun: { pegawaiId: d.pegawaiId, tahun: d.tahun } } });
    const total = (s: { hakTahunIni: number; sisaN1: number; sisaN2: number; penyesuaian: number }) => s.hakTahunIni + s.sisaN1 + s.sisaN2 + s.penyesuaian;
    const baru = await tx.saldoCuti.upsert({
      where: { pegawaiId_tahun: { pegawaiId: d.pegawaiId, tahun: d.tahun } },
      update: { hakTahunIni: d.hakTahunIni, sisaN1: d.sisaN1, sisaN2: d.sisaN2, penyesuaian: d.penyesuaian },
      create: { pegawaiId: d.pegawaiId, tahun: d.tahun, hakTahunIni: d.hakTahunIni, sisaN1: d.sisaN1, sisaN2: d.sisaN2, penyesuaian: d.penyesuaian },
    });
    const selisih = total(baru) - (lama ? total(lama) : 0);
    await tx.mutasiSaldoCuti.create({ data: { saldoId: baru.id, jenis: lama ? "PENYESUAIAN" : "SALDO_AWAL", jumlah: selisih, catatan: d.catatan, olehUserId: u.userId } });
    await catatAudit({ userId: u.userId, aksi: "UBAH_SALDO_CUTI", entitas: "saldo_cuti", entitasId: baru.id, sebelum: lama ?? undefined, sesudah: baru }, tx);
  });
  revalidatePath("/cuti", "layout");
  return { sukses: "Saldo disimpan." };
}

/** Membuat saldo tahun baru untuk semua ASN aktif yang belum punya, dihitung dari saldo tahun sebelumnya. */
export async function bukaTahunSaldo(tahunBaru: number): Promise<HasilForm> {
  const u = await wajibKepegawaian();
  if (!u) return { galat: "Hanya Kepegawaian." };
  if (!Number.isInteger(tahunBaru) || tahunBaru < 2020 || tahunBaru > 2100) return { galat: "Tahun tidak valid." };

  const p = await semuaPengaturan();
  const batas = { maksSisaN1: Number(p.get("cuti.maks_sisa_n1") ?? 6), maksSisaN2: Number(p.get("cuti.maks_sisa_n2") ?? 6) };
  const [pegawai, aturanTahunan] = await Promise.all([
    db.pegawai.findMany({
      where: { aktif: true, statusKepegawaian: { not: "NON_ASN" }, saldoCuti: { none: { tahun: tahunBaru } } },
      include: { saldoCuti: { where: { tahun: tahunBaru - 1 } } },
    }),
    db.aturanCuti.findMany({ where: { jenisCuti: { kode: "TAHUNAN" } } }),
  ]);
  const hakPer = new Map(aturanTahunan.map((a) => [a.statusKepegawaian, a.berlaku ? (a.hakPerTahun ?? 12) : 0]));

  let dibuat = 0;
  await db.$transaction(
    async (tx) => {
      for (const pg of pegawai) {
        const hak = hakPer.get(pg.statusKepegawaian) ?? 12;
        const lama = pg.saldoCuti[0];
        const awal = lama ? saldoTahunBerikut(lama, hak, batas) : { hakTahunIni: hak, sisaN1: 0, sisaN2: 0 };
        const s = await tx.saldoCuti.create({ data: { pegawaiId: pg.id, tahun: tahunBaru, ...awal } });
        await tx.mutasiSaldoCuti.create({
          data: { saldoId: s.id, jenis: "TUTUP_TAHUN", jumlah: awal.hakTahunIni + awal.sisaN1 + awal.sisaN2, catatan: lama ? `Dari saldo ${tahunBaru - 1}` : "Hak tahun baru", olehUserId: u.userId },
        });
        dibuat++;
      }
      await catatAudit({ userId: u.userId, aksi: "BUKA_TAHUN_SALDO", entitas: "saldo_cuti", sesudah: { tahun: tahunBaru, dibuat, batas } }, tx);
    },
    { timeout: 120_000 },
  );
  revalidatePath("/cuti", "layout");
  return { sukses: dibuat ? `Saldo ${tahunBaru} dibuat untuk ${dibuat} pegawai.` : `Semua ASN aktif sudah punya saldo ${tahunBaru}.` };
}

/**
 * Impor saldo dari Excel (template diunduh dari halaman Saldo): kolom NIP, Sisa N-2,
 * Sisa N-1, Hak Tahun Ini, Terpakai. Semua baris divalidasi dulu; bila ada galat tidak ada yang disimpan.
 */
export async function imporSaldo(tahun: number, _: HasilForm, fd: FormData): Promise<HasilForm> {
  const u = await wajibKepegawaian();
  if (!u) return { galat: "Hanya Kepegawaian." };
  const berkas = fd.get("berkas");
  if (!(berkas instanceof File) || berkas.size === 0) return { galat: "Pilih berkas .xlsx." };
  if (berkas.size > 5 * 1024 * 1024 || !berkas.name.toLowerCase().endsWith(".xlsx")) return { galat: "Hanya .xlsx maks. 5 MB." };

  let baris: Record<string, unknown>[];
  try {
    const wb = XLSX.read(await berkas.arrayBuffer(), { type: "array" });
    baris = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
  } catch {
    return { galat: "Berkas tidak bisa dibaca." };
  }
  const nipKe = new Map((await db.pegawai.findMany({ where: { nip: { not: null } }, select: { id: true, nip: true } })).map((p) => [p.nip!, p.id]));

  const galat: string[] = [];
  const data: { pegawaiId: string; sisaN2: number; sisaN1: number; hakTahunIni: number; terpakai: number }[] = [];
  const bil = (v: unknown) => (v === "" || v == null ? 0 : Number(v));
  baris.forEach((r, i) => {
    const no = i + 2;
    const nipMentah = r["NIP"];
    if (typeof nipMentah === "number") return galat.push(`Baris ${no}: NIP tersimpan sebagai angka — ubah format sel menjadi Teks.`);
    const nip = normalisasiNip(String(nipMentah ?? ""));
    if (!nip) return;
    const pegawaiId = nipKe.get(nip);
    if (!pegawaiId) return galat.push(`Baris ${no}: NIP ${nip} tidak terdaftar.`);
    const v = { sisaN2: bil(r["Sisa N-2"]), sisaN1: bil(r["Sisa N-1"]), hakTahunIni: bil(r["Hak Tahun Ini"]), terpakai: bil(r["Terpakai"]) };
    if (Object.values(v).some((x) => !Number.isInteger(x) || x < 0 || x > 30)) return galat.push(`Baris ${no}: nilai harus bilangan bulat 0–30.`);
    if (v.terpakai > v.sisaN2 + v.sisaN1 + v.hakTahunIni) return galat.push(`Baris ${no}: terpakai melebihi total hak.`);
    data.push({ pegawaiId, ...v });
  });
  if (galat.length) return { galat: `${galat.length} baris bermasalah. ${galat.slice(0, 5).join(" ")}${galat.length > 5 ? " …" : ""}` };
  if (data.length === 0) return { galat: "Tidak ada baris berisi NIP." };

  await db.$transaction(
    async (tx) => {
      for (const d of data) {
        const s = await tx.saldoCuti.upsert({
          where: { pegawaiId_tahun: { pegawaiId: d.pegawaiId, tahun } },
          update: { sisaN2: d.sisaN2, sisaN1: d.sisaN1, hakTahunIni: d.hakTahunIni, terpakai: d.terpakai, penyesuaian: 0 },
          create: { pegawaiId: d.pegawaiId, tahun, sisaN2: d.sisaN2, sisaN1: d.sisaN1, hakTahunIni: d.hakTahunIni, terpakai: d.terpakai },
        });
        await tx.mutasiSaldoCuti.create({ data: { saldoId: s.id, jenis: "SALDO_AWAL", jumlah: d.sisaN2 + d.sisaN1 + d.hakTahunIni - d.terpakai, catatan: `Impor saldo ${tahun} (terpakai ${d.terpakai})`, olehUserId: u.userId } });
      }
      await catatAudit({ userId: u.userId, aksi: "IMPOR_SALDO_CUTI", entitas: "saldo_cuti", sesudah: { tahun, jumlah: data.length } }, tx);
    },
    { timeout: 120_000 },
  );
  revalidatePath("/cuti", "layout");
  return { sukses: `Saldo ${tahun} diimpor untuk ${data.length} pegawai.` };
}
