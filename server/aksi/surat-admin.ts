"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { namaLengkap } from "@/lib/domain/pegawai";
import { PLACEHOLDER_SURAT } from "@/lib/surat/placeholder";
import { escapeHtml, hitungBlokIdentitas } from "@/lib/surat/render";
import type { HasilForm } from "@/lib/validasi/auth";
import { catatAudit } from "../audit";
import { punyaPeran, wajibLogin } from "../auth/pengguna";
import { db } from "../db";
import { sanitasiIsiSurat } from "../surat/sanitasi";

async function wajibAdmin() {
  const u = await wajibLogin();
  return punyaPeran(u, "ADMIN") ? u : null;
}

const KUNCI_SAH: ReadonlySet<string> = new Set(PLACEHOLDER_SURAT.map((p) => p.kunci));
const baris = (maks: number) => z.array(z.string().trim().min(1).max(200)).max(maks);

const skemaTemplate = z.object({
  id: z.uuid(),
  nama: z.string().trim().min(3, "Isi nama template.").max(150),
  hal: z.string().trim().min(3, "Isi hal surat.").max(300),
  sifat: z.string().trim().max(50),
  lampiran: z.string().trim().max(100),
  tujuan: baris(8),
  tembusan: baris(15),
  disposisi: baris(5),
  dapatDicetakSejak: z.enum(["DIVERIFIKASI", "DISETUJUI"]),
  formatNomor: z
    .string()
    .trim()
    .max(80)
    .refine((v) => v.includes("{urut}") && v.includes("{tahun}"), "Format nomor harus memuat {urut} dan {tahun}."),
  aktif: z.boolean(),
  isiHtml: z.string().max(100_000),
});

/** Template diubah Admin: placeholder divalidasi, HTML disanitasi, versi naik. Surat yang sudah dibuat tidak berubah. */
export async function simpanTemplate(masukan: z.input<typeof skemaTemplate>): Promise<HasilForm> {
  const u = await wajibAdmin();
  if (!u) return { galat: "Hanya Admin." };
  const v = skemaTemplate.safeParse(masukan);
  if (!v.success) return { galat: v.error.issues[0]?.message ?? "Data template tidak valid." };
  const m = v.data;

  const isiHtml = sanitasiIsiSurat(m.isiHtml);
  const asing = [m.hal, isiHtml, ...m.tujuan, ...m.tembusan]
    .flatMap((t) => [...t.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g)].map((x) => x[1]))
    .filter((k) => !KUNCI_SAH.has(k));
  if (asing.length) return { galat: `Placeholder tidak dikenal: ${[...new Set(asing)].map((k) => `{{${k}}}`).join(", ")}.` };
  if (hitungBlokIdentitas(isiHtml) > 1) return { galat: "Blok identitas hanya boleh satu." };
  if (!isiHtml.replace(/<[^>]*>/g, "").trim()) return { galat: "Isi surat kosong." };

  const lama = await db.templateSurat.findUnique({ where: { id: m.id } });
  if (!lama) return { galat: "Template tidak ditemukan." };
  const data = {
    nama: m.nama,
    hal: m.hal,
    sifat: m.sifat || null,
    lampiran: m.lampiran || null,
    tujuanHtml: m.tujuan.length ? `<p>${m.tujuan.map(escapeHtml).join("<br>")}</p>` : "",
    tembusan: m.tembusan,
    disposisi: m.disposisi,
    dapatDicetakSejak: m.dapatDicetakSejak,
    formatNomor: m.formatNomor,
    aktif: m.aktif,
    isiHtml,
  };
  await db.$transaction(async (tx) => {
    await tx.templateSurat.update({ where: { id: m.id }, data: { ...data, versi: { increment: 1 }, diubahOlehId: u.userId } });
    await catatAudit(
      { userId: u.userId, aksi: "UBAH_TEMPLATE_SURAT", entitas: "template_surat", entitasId: m.id, sebelum: { versi: lama.versi, hal: lama.hal, aktif: lama.aktif }, sesudah: { versi: lama.versi + 1, hal: data.hal, aktif: data.aktif } },
      tx,
    );
  });
  revalidatePath("/admin/surat/template");
  return { sukses: `Template disimpan (versi ${lama.versi + 1}).` };
}

const tanggalOpsional = z.union([z.literal(""), z.iso.date("Tanggal tidak valid.")]);
const skemaPejabat = z.object({
  level: z.enum(["", "ESELON_II", "ESELON_III", "ESELON_IV", "STAF"]),
  kodeDokumen: z.enum(["", "NOTA_DINAS_GUBERNUR", "NOTA_DINAS_SEKDA", "PERMOHONAN_BKD", "SURAT_IZIN"]),
  awalan: z.enum(["", "Plt.", "Plh.", "a.n."]),
  jabatanTeks: z.string().trim().min(5, "Isi jabatan penandatangan.").max(200),
  pegawaiId: z.union([z.literal(""), z.uuid()]),
  nama: z.string().trim().max(150),
  pangkat: z.string().trim().max(100),
  nip: z
    .string()
    .trim()
    .transform((s) => s.replace(/\s/g, ""))
    .pipe(z.union([z.literal(""), z.string().regex(/^\d{18}$/, "NIP harus 18 digit.")])),
  berlakuMulai: z.iso.date("Isi tanggal mulai berlaku."),
  berlakuSampai: tanggalOpsional,
});

/** Penandatangan baru — untuk Plt./Plh. isi periode berlaku; entri paling spesifik & terbaru yang dipakai. */
export async function tambahPenandatangan(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const u = await wajibAdmin();
  if (!u) return { galat: "Hanya Admin." };
  const v = skemaPejabat.safeParse(Object.fromEntries(fd));
  if (!v.success) return { galat: v.error.issues[0].message };
  const m = v.data;
  const mulai = new Date(`${m.berlakuMulai}T00:00:00Z`);
  const sampai = m.berlakuSampai ? new Date(`${m.berlakuSampai}T00:00:00Z`) : null;
  if (sampai && sampai < mulai) return { galat: "Tanggal akhir sebelum tanggal mulai." };

  let { nama, pangkat, nip } = m;
  if (m.pegawaiId) {
    const p = await db.pegawai.findUnique({ where: { id: m.pegawaiId }, include: { pangkatGolongan: true } });
    if (!p) return { galat: "Pegawai tidak ditemukan." };
    nama = namaLengkap(p);
    pangkat = p.pangkatGolongan?.namaPangkat ?? pangkat;
    nip = p.nip ?? nip;
  }
  if (nama.length < 3) return { galat: "Pilih pegawai atau isi nama penandatangan." };

  const baru = await db.pejabatPenandatangan.create({
    data: {
      level: m.level || null,
      kodeDokumen: m.kodeDokumen || null,
      awalan: m.awalan || null,
      jabatanTeks: m.jabatanTeks,
      pegawaiId: m.pegawaiId || null,
      nama,
      pangkat: pangkat || null,
      nip: nip || null,
      berlakuMulai: mulai,
      berlakuSampai: sampai,
    },
  });
  await catatAudit({ userId: u.userId, aksi: "TAMBAH_PENANDATANGAN", entitas: "pejabat_penandatangan", entitasId: baru.id, sesudah: baru });
  revalidatePath("/admin/surat/penandatangan");
  return { sukses: "Penandatangan ditambahkan." };
}

export async function ubahAktifPenandatangan(id: string, aktif: boolean): Promise<void> {
  const u = await wajibAdmin();
  if (!u || !z.uuid().safeParse(id).success) return;
  const p = await db.pejabatPenandatangan.update({ where: { id }, data: { aktif } }).catch(() => null);
  if (p) await catatAudit({ userId: u.userId, aksi: aktif ? "AKTIFKAN_PENANDATANGAN" : "NONAKTIFKAN_PENANDATANGAN", entitas: "pejabat_penandatangan", entitasId: id });
  revalidatePath("/admin/surat/penandatangan");
}

/** Nomor urut diberikan otomatis saat surat pertama kali dicetak, atau dibiarkan kosong untuk diisi tangan. */
export async function aturPenomoran(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const u = await wajibAdmin();
  if (!u) return { galat: "Hanya Admin." };
  const otomatis = fd.get("otomatis") === "ya";
  const lama = await db.pengaturan.findUnique({ where: { kunci: "surat.nomor_otomatis" } });
  await db.pengaturan.upsert({
    where: { kunci: "surat.nomor_otomatis" },
    update: { nilai: otomatis, diubahOlehId: u.userId },
    create: { kunci: "surat.nomor_otomatis", nilai: otomatis, deskripsi: "Nomor urut surat cuti otomatis saat dicetak", diubahOlehId: u.userId },
  });
  await catatAudit({ userId: u.userId, aksi: "UBAH_PENGATURAN", entitas: "pengaturan", entitasId: "surat.nomor_otomatis", sebelum: { nilai: lama?.nilai ?? true }, sesudah: { nilai: otomatis } });
  revalidatePath("/admin/surat/penomoran");
  return { sukses: otomatis ? "Nomor urut diberikan otomatis saat dicetak." : "Nomor urut dikosongkan untuk diisi tangan (kecuali diisi Kepegawaian)." };
}
