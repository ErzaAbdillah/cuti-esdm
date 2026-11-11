"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { bisaDibatalkan, bisaDitolak, STATUS_DISETUJUI, STATUS_SETELAH_TAHAP } from "@/lib/domain/alur-cuti";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { StatusCuti } from "@/lib/generated/prisma/enums";
import { perluNotaDinas } from "@/lib/formulir/nota-dinas";
import { LABEL_STATUS_CUTI } from "@/lib/label";
import { formatTanggal, hariIniWita } from "@/lib/tanggal";
import type { HasilForm } from "@/lib/validasi/auth";
import { catatAudit } from "../audit";
import { punyaHakAkses, punyaPeran, wajibLogin } from "../auth/pengguna";
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

const teks = (maks: number) => z.string().trim().max(maks);
const skemaPejabat = z.object({ jabatan: teks(300), nama: teks(150), nip: teks(30) });
const barisSisa = z.object({ tahun: teks(10), sisa: teks(10), keterangan: teks(100) });
const skemaNotaDinas = z.object({
  kepada: teks(300),
  dari: teks(300),
  nomor: teks(80),
  tanggal: isoDate,
  hariKosong: z.boolean(),
  hal: teks(200),
  isi: z.string().trim().min(20, "Isi nota dinas masih kosong.").max(3000),
  penandatangan: skemaPejabat.extend({ pangkat: teks(100) }),
  disposisi: z.array(teks(100)).max(4),
});
const skemaFormulir = z.object({
  jenisCutiId: z.uuid("Pilih jenis cuti."),
  tanggalMulai: isoDate,
  tanggalSelesai: isoDate,
  alasan: z.string().trim().min(5, "Isi alasan cuti (min. 5 karakter).").max(500),
  alamatSelamaCuti: z.string().trim().min(5, "Isi alamat selama cuti.").max(300),
  formulir: z.object({
    tanggalSurat: isoDate,
    hariKosong: z.boolean(),
    kepada: teks(600),
    nama: z.string().trim().min(3, "Isi nama.").max(150),
    nip: teks(30),
    jabatan: teks(200),
    masaKerja: teks(40),
    unitKerja: teks(200),
    lamanya: z.string().trim().min(1, "Isi lamanya cuti.").max(80),
    catatanTahunan: z.tuple([barisSisa, barisSisa, barisSisa]),
    catatanLain: z.tuple([teks(100), teks(100), teks(100), teks(100), teks(100)]),
    telp: z
      .string()
      .trim()
      .transform((v) => v.replace(/[\s-]/g, ""))
      .pipe(z.string().regex(/^\+?\d{8,15}$/, "Nomor telepon tidak valid.")),
    atasan: skemaPejabat,
    pejabat: skemaPejabat,
    notaDinas: skemaNotaDinas.optional(),
  }),
});
export type MasukanFormulir = z.input<typeof skemaFormulir>;

async function beritahuTahap(p: { id: string; pegawaiId: string; atasanLangsungId: string | null; levelSurat: Parameters<typeof tahapPengajuan>[0]["levelSurat"]; status: StatusCuti }, nama: string, tx: Prisma.TransactionClient) {
  const tahap = await tahapPengajuan(p, tx);
  if (!tahap) return;
  await kirimNotifikasi(await penerimaTahap(p, tahap, tx), { judul: tahap === "PEJABAT_BERWENANG" ? "Formulir cuti baru" : "Pengajuan cuti menunggu tindakan Anda", isi: `Pengajuan cuti ${nama} menunggu ${tahap === "ATASAN_LANGSUNG" ? "persetujuan atasan" : tahap === "KEPEGAWAIAN" ? "verifikasi" : "formulir bertanda tangan diantar ke Kepegawaian; setelah diterima, buat surat cutinya"}.`, tautan: `/cuti/${p.id}` }, tx);
}

/**
 * Formulir Permintaan dan Pemberian Cuti: pegawai mengisi lalu mencetaknya
 * tanpa verifikasi, kemudian mengantar formulir bertanda tangan ke Kepegawaian.
 * `id` null = pengajuan baru; selain itu ubah formulir selama belum diproses.
 */
export async function simpanFormulir(id: string | null, masukan: MasukanFormulir): Promise<{ galat?: string; id?: string }> {
  const u = await wajibLogin();
  const v = skemaFormulir.safeParse(masukan);
  if (!v.success) return { galat: v.error.issues[0]?.message ?? "Isian formulir tidak valid." };
  const d = v.data;
  const mulai = tanggal(d.tanggalMulai);
  const selesai = tanggal(d.tanggalSelesai);
  const formulir = { ...d.formulir, telp: masukan.formulir.telp.trim() };

  const lama = id ? await db.pengajuanCuti.findUnique({ where: { id } }) : null;
  if (id && !lama) return { galat: "Pengajuan tidak ditemukan." };
  if (lama && !(u.pegawai?.id === lama.pegawaiId || punyaHakAkses(u, "PROSES_CUTI") || punyaPeran(u, "KEPEGAWAIAN", "ADMIN"))) return { galat: "Anda tidak berhak mengubah formulir ini." };
  if (lama && lama.status !== "DIAJUKAN") return { galat: "Formulir sudah diproses Kepegawaian dan tidak bisa diubah lagi." };
  const pegawaiId = lama?.pegawaiId ?? u.pegawai?.id;
  if (!pegawaiId) return { galat: "Akun ini tidak terhubung dengan data pegawai." };

  try {
    const hasilId = await db.$transaction(async (tx) => {
      // Kunci per pegawai: dua pengajuan bersamaan tidak boleh sama-sama lolos cek saldo/bentrok.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${pegawaiId}))`;
      const cek = await validasiPengajuan({ pegawaiId, jenisCutiId: d.jenisCutiId, mulai, selesai, kecualiId: lama?.id }, tx);
      if (!cek.ok) throw new GalatValidasi(cek.galat);
      const pegawai = lama ? null : await tx.pegawai.findUniqueOrThrow({ where: { id: pegawaiId }, include: { jabatan: true } });
      const levelSurat = lama?.levelSurat ?? (await levelSuratPegawai(pegawai!));
      // Nota dinas hanya untuk Eselon II & III.
      const { notaDinas, ...isian } = formulir;
      const data = {
        jenisCutiId: d.jenisCutiId,
        tanggalMulai: mulai,
        tanggalSelesai: selesai,
        jumlahHari: cek.jumlahHari,
        alasan: d.alasan,
        alamatSelamaCuti: d.alamatSelamaCuti,
        noHpSelamaCuti: d.formulir.telp,
        tahunSaldo: cek.tahunSaldo,
        formulir: notaDinas && perluNotaDinas(levelSurat) ? { ...isian, notaDinas } : isian,
      };
      if (lama) {
        await tx.pengajuanCuti.update({ where: { id: lama.id }, data });
        await catatAudit({ userId: u.userId, aksi: "UBAH_FORMULIR_CUTI", entitas: "pengajuan_cuti", entitasId: lama.id, sesudah: { ...data, formulir: undefined } }, tx);
        return lama.id;
      }
      const baru = await tx.pengajuanCuti.create({
        data: { ...data, pegawaiId, atasanLangsungId: pegawai!.atasanLangsungId, levelSurat, snapshotIdentitas: await snapshotIdentitas(pegawaiId, tx) },
      });
      await tx.riwayatStatusCuti.create({ data: { pengajuanId: baru.id, dariStatus: null, keStatus: "DIAJUKAN", olehUserId: u.userId, catatan: "Formulir dibuat" } });
      await catatAudit({ userId: u.userId, aksi: "AJUKAN_CUTI", entitas: "pengajuan_cuti", entitasId: baru.id, sesudah: { ...data, formulir: undefined } }, tx);
      await beritahuTahap(baru, u.pegawai?.namaLengkap ?? d.formulir.nama, tx);
      return baru.id;
    });
    revalidatePath("/cuti", "layout");
    return { id: hasilId };
  } catch (e) {
    if (e instanceof GalatValidasi) return { galat: Object.values(e.galat)[0] ?? "Periksa kembali isian formulir." };
    throw e;
  }
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
  const boleh = (tahap && (await bolehPutuskan(u, p, tahap))) || ((punyaHakAkses(u, "PROSES_CUTI") || punyaPeran(u, "KEPEGAWAIAN")) && u.pegawai?.id !== p.pegawaiId);
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

