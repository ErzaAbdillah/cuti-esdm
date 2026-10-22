"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { bisaDibatalkan, bisaDitolak, STATUS_DISETUJUI, STATUS_SETELAH_TAHAP } from "@/lib/domain/alur-cuti";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { StatusCuti } from "@/lib/generated/prisma/enums";
import { LABEL_STATUS_CUTI } from "@/lib/label";
import { formatTanggal, hariIniWita } from "@/lib/tanggal";
import type { HasilForm } from "@/lib/validasi/auth";
import { catatAudit } from "../audit";
import { punyaPeran, wajibLogin } from "../auth/pengguna";
import { db } from "../db";
import { periksaBerkas, simpanBerkas } from "../dokumen/penyimpanan";
import { kirimNotifikasi, userDariPegawai, userDenganPeran } from "../notifikasi";
import { batalkanPersetujuan, levelSuratPegawai, snapshotIdentitas, tahapPengajuan, terapkanPersetujuan, validasiPengajuan } from "../layanan/cuti";
import { bolehPutuskan, modeTahap, penerimaTahap } from "../layanan/wewenang-cuti";

const tanggal = (s: string) => new Date(`${s}T00:00:00Z`);
const isoDate = z.iso.date("Tanggal tidak valid.");

/** Hitung hari & cek saldo saat form diisi (tanpa menyimpan). */
export async function pratinjauCuti(input: { jenisCutiId: string; tanggalMulai: string; tanggalSelesai: string }) {
  const u = await wajibLogin();
  if (!u.pegawai) return { galat: "Akun tidak terhubung dengan data pegawai." };
  const p = z.object({ jenisCutiId: z.uuid(), tanggalMulai: isoDate, tanggalSelesai: isoDate }).safeParse(input);
  if (!p.success) return { galat: null };
  const h = await validasiPengajuan({ pegawaiId: u.pegawai.id, jenisCutiId: p.data.jenisCutiId, mulai: tanggal(p.data.tanggalMulai), selesai: tanggal(p.data.tanggalSelesai) });
  if (h.ok) return { jumlahHari: h.jumlahHari, satuan: h.satuan, sisaSetelah: h.sisaSetelah };
  return { galat: Object.values(h.galat)[0] ?? null, jumlahHari: h.jumlahHari };
}

const skemaAjukan = z.object({
  jenisCutiId: z.uuid("Pilih jenis cuti."),
  tanggalMulai: isoDate,
  tanggalSelesai: isoDate,
  alasan: z.string().trim().min(5, "Isi alasan cuti (min. 5 karakter).").max(500),
  alamatSelamaCuti: z.string().trim().min(5, "Isi alamat selama cuti.").max(300),
  noHpSelamaCuti: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^\+?\d{8,15}$/, "Nomor HP tidak valid.")),
  penanggungJawabId: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.uuid().nullable()),
});

async function beritahuTahap(p: { id: string; pegawaiId: string; atasanLangsungId: string | null; levelSurat: Parameters<typeof tahapPengajuan>[0]["levelSurat"]; status: StatusCuti }, nama: string, tx: Prisma.TransactionClient) {
  const tahap = await tahapPengajuan(p, tx);
  if (!tahap) return;
  await kirimNotifikasi(await penerimaTahap(p, tahap, tx), { judul: "Pengajuan cuti menunggu tindakan Anda", isi: `Pengajuan cuti ${nama} menunggu ${tahap === "ATASAN_LANGSUNG" ? "persetujuan atasan" : tahap === "KEPEGAWAIAN" ? "verifikasi" : "keputusan pejabat"}.`, tautan: `/cuti/${p.id}` }, tx);
}

export async function ajukanCuti(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const u = await wajibLogin();
  if (!u.pegawai) return { galat: "Akun ini tidak terhubung dengan data pegawai." };
  const pegawaiId = u.pegawai.id;
  const s = (k: string) => String(fd.get(k) ?? "");
  const nilai = { jenisCutiId: s("jenisCutiId"), tanggalMulai: s("tanggalMulai"), tanggalSelesai: s("tanggalSelesai"), alasan: s("alasan"), alamatSelamaCuti: s("alamatSelamaCuti"), noHpSelamaCuti: s("noHpSelamaCuti"), penanggungJawabId: s("penanggungJawabId") };
  const gagal = (galatField: Partial<Record<string, string>>, galat = "Periksa kembali isian yang ditandai."): HasilForm => ({ galat, galatField, nilai, stempel: Date.now() });

  const p = skemaAjukan.safeParse(nilai);
  if (!p.success) {
    const g: Record<string, string> = {};
    for (const i of p.error.issues) g[String(i.path[0])] ??= i.message;
    return gagal(g);
  }
  const d = p.data;
  if (d.penanggungJawabId === pegawaiId) return gagal({ penanggungJawabId: "Penanggung jawab tugas tidak boleh diri sendiri." });

  const jenis = await db.jenisCuti.findUnique({ where: { id: d.jenisCutiId } });
  const berkas = fd.get("lampiran");
  const adaBerkas = berkas instanceof File && berkas.size > 0;
  if (jenis?.wajibLampiran && !adaBerkas) return gagal({ lampiran: `${jenis.nama} wajib melampirkan dokumen pendukung (mis. surat keterangan dokter).` });
  let isiBerkas: Buffer | null = null;
  let infoBerkas: ReturnType<typeof periksaBerkas> | null = null;
  if (adaBerkas) {
    isiBerkas = Buffer.from(await berkas.arrayBuffer());
    infoBerkas = periksaBerkas(berkas.name, isiBerkas, berkas.type, undefined, ["pdf", "jpg", "jpeg", "png"]);
    if (!infoBerkas.ok) return gagal({ lampiran: infoBerkas.galat });
  }

  const mulai = tanggal(d.tanggalMulai);
  const selesai = tanggal(d.tanggalSelesai);
  let id: string;
  try {
    id = await db.$transaction(async (tx) => {
      // Kunci per pegawai: dua pengajuan bersamaan tidak boleh sama-sama lolos cek saldo/bentrok.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${pegawaiId}))`;
      const v = await validasiPengajuan({ pegawaiId, jenisCutiId: d.jenisCutiId, mulai, selesai }, tx);
      if (!v.ok) throw new GalatValidasi(v.galat);

      const pegawai = await tx.pegawai.findUniqueOrThrow({ where: { id: pegawaiId }, include: { jabatan: true } });
      const level = await levelSuratPegawai(pegawai);
      const baru = await tx.pengajuanCuti.create({
        data: {
          pegawaiId,
          jenisCutiId: d.jenisCutiId,
          tanggalMulai: mulai,
          tanggalSelesai: selesai,
          jumlahHari: v.jumlahHari,
          alasan: d.alasan,
          alamatSelamaCuti: d.alamatSelamaCuti,
          noHpSelamaCuti: d.noHpSelamaCuti,
          penanggungJawabId: d.penanggungJawabId,
          atasanLangsungId: pegawai.atasanLangsungId,
          levelSurat: level,
          tahunSaldo: v.tahunSaldo,
          snapshotIdentitas: await snapshotIdentitas(pegawaiId, tx),
        },
      });
      await tx.riwayatStatusCuti.create({ data: { pengajuanId: baru.id, dariStatus: null, keStatus: "DIAJUKAN", olehUserId: u.userId } });
      if (isiBerkas && infoBerkas?.ok) {
        const simpan = await simpanBerkas(isiBerkas, infoBerkas.ext, true);
        await tx.dokumen.create({
          data: { ruang: "LAMPIRAN_CUTI", pemilikPegawaiId: pegawaiId, pengajuanCutiId: baru.id, namaTampilan: (berkas as File).name.slice(0, 200), namaFileAsli: (berkas as File).name.slice(0, 200), diunggahOlehId: u.userId, ...simpan },
        });
      }
      await catatAudit({ userId: u.userId, aksi: "AJUKAN_CUTI", entitas: "pengajuan_cuti", entitasId: baru.id, sesudah: { ...d, jumlahHari: v.jumlahHari } }, tx);
      await beritahuTahap(baru, u.pegawai!.namaLengkap, tx);
      return baru.id;
    });
  } catch (e) {
    if (e instanceof GalatValidasi) return gagal(e.galat, e.galat._ ?? "Periksa kembali isian yang ditandai.");
    throw e;
  }
  revalidatePath("/cuti", "layout");
  redirect(`/cuti/${id}?baru=1`);
}

class GalatValidasi extends Error {
  constructor(public galat: Partial<Record<string, string>>) {
    super("validasi");
  }
}

async function ambil(id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  return db.pengajuanCuti.findUnique({ where: { id }, include: { jenisCuti: true, pegawai: true } });
}

function selesaiAksi(id: string) {
  revalidatePath("/cuti", "layout");
  revalidatePath(`/cuti/${id}`);
  revalidatePath("/beranda");
}

export async function setujuiCuti(id: string, catatan: string): Promise<HasilForm> {
  const u = await wajibLogin();
  const p = await ambil(id);
  if (!p) return { galat: "Pengajuan tidak ditemukan." };
  const tahap = await tahapPengajuan(p);
  if (!tahap) return { galat: `Pengajuan berstatus ${LABEL_STATUS_CUTI[p.status]}; tidak ada tahap yang menunggu.` };
  if (!(await bolehPutuskan(u, p, tahap))) return { galat: "Anda tidak berwenang memutuskan tahap ini." };
  if (tahap === "PEJABAT_BERWENANG" && (await modeTahap(p.levelSurat, tahap)) === "EKSTERNAL") {
    return { galat: "Keputusan tahap ini dari Gubernur/BKD; catat lewat form keputusan eksternal." };
  }
  const ke = STATUS_SETELAH_TAHAP[tahap];
  try {
    await db.$transaction(async (tx) => {
      const r = await tx.pengajuanCuti.updateMany({ where: { id, status: p.status }, data: { status: ke } });
      if (r.count === 0) throw new Error("BERUBAH");
      await tx.riwayatStatusCuti.create({ data: { pengajuanId: id, dariStatus: p.status, keStatus: ke, olehUserId: u.userId, catatan: catatan.trim().slice(0, 500) || null } });
      if (ke === "DISETUJUI") await terapkanPersetujuan(id, u.userId, tx);
      await catatAudit({ userId: u.userId, aksi: "SETUJUI_CUTI", entitas: "pengajuan_cuti", entitasId: id, sebelum: { status: p.status }, sesudah: { status: ke, tahap } }, tx);
      await kirimNotifikasi([await userDariPegawai(p.pegawaiId, tx)], { judul: `Cuti: ${LABEL_STATUS_CUTI[ke]}`, isi: `${p.jenisCuti.nama} ${formatTanggal(p.tanggalMulai)} – ${formatTanggal(p.tanggalSelesai)} kini berstatus ${LABEL_STATUS_CUTI[ke]}.`, tautan: `/cuti/${id}` }, tx);
      await beritahuTahap({ ...p, status: ke }, (p.snapshotIdentitas as { nama?: string } | null)?.nama ?? "", tx);
    });
  } catch (e) {
    if (e instanceof Error && e.message === "BERUBAH") return { galat: "Status pengajuan baru saja berubah. Muat ulang halaman." };
    if (e instanceof Error && e.message === "SALDO_TIDAK_ADA") return { galat: "Saldo cuti tahunan pegawai belum diatur." };
    throw e;
  }
  selesaiAksi(id);
  return { sukses: `Pengajuan ${LABEL_STATUS_CUTI[ke].toLowerCase()}.` };
}

export async function tolakCuti(id: string, alasan: string): Promise<HasilForm> {
  const u = await wajibLogin();
  const p = await ambil(id);
  if (!p) return { galat: "Pengajuan tidak ditemukan." };
  if (alasan.trim().length < 5) return { galat: "Alasan penolakan wajib diisi (min. 5 karakter)." };
  if (!bisaDitolak(p.status)) return { galat: "Pengajuan yang sudah diputuskan pejabat tidak bisa ditolak." };
  const tahap = await tahapPengajuan(p);
  const boleh = (tahap && (await bolehPutuskan(u, p, tahap))) || (punyaPeran(u, "KEPEGAWAIAN") && u.pegawai?.id !== p.pegawaiId);
  if (!boleh) return { galat: "Anda tidak berwenang menolak pengajuan ini." };

  await db.$transaction(async (tx) => {
    const r = await tx.pengajuanCuti.updateMany({ where: { id, status: p.status }, data: { status: "DITOLAK" } });
    if (r.count === 0) throw new Error("BERUBAH");
    await tx.riwayatStatusCuti.create({ data: { pengajuanId: id, dariStatus: p.status, keStatus: "DITOLAK", olehUserId: u.userId, catatan: alasan.trim().slice(0, 500) } });
    await catatAudit({ userId: u.userId, aksi: "TOLAK_CUTI", entitas: "pengajuan_cuti", entitasId: id, sebelum: { status: p.status }, sesudah: { status: "DITOLAK", alasan } }, tx);
    await kirimNotifikasi([await userDariPegawai(p.pegawaiId, tx)], { judul: "Cuti ditolak", isi: `${p.jenisCuti.nama} ${formatTanggal(p.tanggalMulai)} ditolak: ${alasan.trim()}`, tautan: `/cuti/${id}` }, tx);
  });
  selesaiAksi(id);
  return { sukses: "Pengajuan ditolak." };
}

export async function batalkanCuti(id: string, alasan: string): Promise<HasilForm> {
  const u = await wajibLogin();
  const p = await ambil(id);
  if (!p) return { galat: "Pengajuan tidak ditemukan." };
  if (u.pegawai?.id !== p.pegawaiId) return { galat: "Hanya pemohon yang bisa membatalkan pengajuannya." };
  if (!bisaDibatalkan(p.status, p.tanggalMulai, hariIniWita())) return { galat: "Cuti hanya bisa dibatalkan sebelum tanggal mulai." };

  await db.$transaction(async (tx) => {
    const r = await tx.pengajuanCuti.updateMany({ where: { id, status: p.status }, data: { status: "DIBATALKAN" } });
    if (r.count === 0) throw new Error("BERUBAH");
    if (STATUS_DISETUJUI.includes(p.status)) await batalkanPersetujuan(id, u.userId, tx);
    await tx.riwayatStatusCuti.create({ data: { pengajuanId: id, dariStatus: p.status, keStatus: "DIBATALKAN", olehUserId: u.userId, catatan: alasan.trim().slice(0, 500) || null } });
    await catatAudit({ userId: u.userId, aksi: "BATALKAN_CUTI", entitas: "pengajuan_cuti", entitasId: id, sebelum: { status: p.status }, sesudah: { status: "DIBATALKAN" } }, tx);
    const pihak = [await userDariPegawai(p.atasanLangsungId, tx), ...(STATUS_DISETUJUI.includes(p.status) || p.status === "DIVERIFIKASI" ? await userDenganPeran("KEPEGAWAIAN", tx) : [])];
    await kirimNotifikasi(pihak, { judul: "Cuti dibatalkan pemohon", isi: `${p.jenisCuti.nama} ${formatTanggal(p.tanggalMulai)} dibatalkan oleh pemohon.`, tautan: `/cuti/${id}` }, tx);
  });
  selesaiAksi(id);
  return { sukses: "Pengajuan dibatalkan." };
}

/** Eselon II–IV: Kepegawaian mencatat keputusan Gubernur/BKD beserta surat izinnya. */
export async function catatKeputusanEksternal(id: string, _: HasilForm, fd: FormData): Promise<HasilForm> {
  const u = await wajibLogin();
  const p = await ambil(id);
  if (!p) return { galat: "Pengajuan tidak ditemukan." };
  const tahap = await tahapPengajuan(p);
  if (tahap !== "PEJABAT_BERWENANG" || (await modeTahap(p.levelSurat, tahap)) !== "EKSTERNAL") return { galat: "Pengajuan ini tidak menunggu keputusan eksternal." };
  if (!(await bolehPutuskan(u, p, tahap))) return { galat: "Hanya Kepegawaian yang mencatat keputusan eksternal." };

  const nomor = String(fd.get("nomorSurat") ?? "").trim();
  const catatan = String(fd.get("catatan") ?? "").trim();
  if (nomor.length < 3) return { galatField: { nomorSurat: "Isi nomor surat izin dari BKD/Gubernur." } };
  const berkas = fd.get("berkas");
  if (!(berkas instanceof File) || berkas.size === 0) return { galatField: { berkas: "Unggah surat izin (PDF/JPG/PNG)." } };
  const isi = Buffer.from(await berkas.arrayBuffer());
  const cek = periksaBerkas(berkas.name, isi, berkas.type, undefined, ["pdf", "jpg", "jpeg", "png"]);
  if (!cek.ok) return { galatField: { berkas: cek.galat } };
  const simpan = await simpanBerkas(isi, cek.ext, true);

  try {
    await db.$transaction(async (tx) => {
      const r = await tx.pengajuanCuti.updateMany({ where: { id, status: p.status }, data: { status: "SURAT_TERBIT" } });
      if (r.count === 0) throw new Error("BERUBAH");
      await tx.dokumen.create({ data: { ruang: "LAMPIRAN_CUTI", pemilikPegawaiId: p.pegawaiId, pengajuanCutiId: id, namaTampilan: `Surat izin cuti ${nomor}`.slice(0, 200), namaFileAsli: berkas.name.slice(0, 200), diunggahOlehId: u.userId, ...simpan } });
      await tx.riwayatStatusCuti.create({ data: { pengajuanId: id, dariStatus: p.status, keStatus: "DISETUJUI", olehUserId: u.userId, catatan: `Keputusan eksternal no. ${nomor}${catatan ? ` — ${catatan}` : ""}` } });
      await terapkanPersetujuan(id, u.userId, tx);
      await tx.riwayatStatusCuti.create({ data: { pengajuanId: id, dariStatus: "DISETUJUI", keStatus: "SURAT_TERBIT", olehUserId: u.userId, catatan: "Surat izin diunggah" } });
      await catatAudit({ userId: u.userId, aksi: "SETUJUI_CUTI", entitas: "pengajuan_cuti", entitasId: id, sebelum: { status: p.status }, sesudah: { status: "SURAT_TERBIT", nomorSurat: nomor, eksternal: true } }, tx);
      await kirimNotifikasi([await userDariPegawai(p.pegawaiId, tx)], { judul: "Cuti disetujui", isi: `${p.jenisCuti.nama} ${formatTanggal(p.tanggalMulai)} disetujui (surat izin no. ${nomor}).`, tautan: `/cuti/${id}` }, tx);
    });
  } catch (e) {
    if (e instanceof Error && e.message === "BERUBAH") return { galat: "Status pengajuan baru saja berubah. Muat ulang halaman." };
    if (e instanceof Error && e.message === "SALDO_TIDAK_ADA") return { galat: "Saldo cuti tahunan pegawai belum diatur." };
    throw e;
  }
  selesaiAksi(id);
  return { sukses: "Keputusan dicatat; surat izin tersimpan dan status Surat Terbit." };
}

