"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { EKSTENSI_DOKUMEN, KATEGORI_PRIBADI } from "@/lib/dokumen";
import type { HasilForm } from "@/lib/validasi/auth";
import { catatAudit } from "../audit";
import { punyaPeran, wajibLogin } from "../auth/pengguna";
import { db } from "../db";
import { periksaBerkas, simpanBerkas } from "../dokumen/penyimpanan";
import { bolehDokumenPribadi, bolehKelolaDokumen, hakFolder } from "../layanan/akses-dokumen";
import { semuaPengaturan } from "../pengaturan";

const uuid = z.uuid();
const namaTampilan = z.string().trim().max(200, "Nama paling panjang 200 karakter.");
const kategori = z.enum(KATEGORI_PRIBADI as [string, ...string[]]);

async function maksByte(): Promise<number> {
  const mb = (await semuaPengaturan()).get("dokumen.maks_ukuran_mb");
  return (typeof mb === "number" && mb > 0 ? Math.min(mb, 10) : 10) * 1024 * 1024;
}

/** Baca & periksa berkas dari form (ekstensi, MIME, isi, ukuran). */
async function bacaUnggahan(fd: FormData): Promise<{ ok: true; isi: Buffer; nama: string; ext: (typeof EKSTENSI_DOKUMEN)[number] } | { ok: false; galat: string }> {
  const berkas = fd.get("berkas");
  if (!(berkas instanceof File) || berkas.size === 0) return { ok: false, galat: "Pilih berkas yang akan diunggah." };
  const isi = Buffer.from(await berkas.arrayBuffer());
  const cek = periksaBerkas(berkas.name, isi, berkas.type, await maksByte(), EKSTENSI_DOKUMEN);
  if (!cek.ok) return { ok: false, galat: cek.galat };
  return { ok: true, isi, nama: berkas.name.slice(0, 200), ext: cek.ext as (typeof EKSTENSI_DOKUMEN)[number] };
}

const tanpaEkstensi = (nama: string) => nama.replace(/\.[^.]+$/, "");

/** Unggah dokumen pribadi (dienkripsi). `pegawaiId` kosong = milik sendiri; Kepegawaian/Admin boleh untuk pegawai lain. */
export async function unggahDokumenPribadi(pegawaiId: string | null, _: HasilForm, fd: FormData): Promise<HasilForm> {
  const u = await wajibLogin();
  const pemilik = pegawaiId ?? u.pegawai?.id ?? null;
  if (!pemilik || !uuid.safeParse(pemilik).success || !bolehDokumenPribadi(u, pemilik)) return { galat: "Anda tidak berhak mengunggah ke ruang dokumen ini." };
  const k = kategori.safeParse(fd.get("kategori"));
  if (!k.success) return { galatField: { kategori: "Pilih kategori dokumen." } };
  const n = namaTampilan.safeParse(fd.get("nama") ?? "");
  if (!n.success) return { galatField: { nama: n.error.issues[0].message } };
  const b = await bacaUnggahan(fd);
  if (!b.ok) return { galatField: { berkas: b.galat } };

  const simpan = await simpanBerkas(b.isi, b.ext, true);
  const d = await db.dokumen.create({
    data: {
      ruang: "PRIBADI",
      pemilikPegawaiId: pemilik,
      kategoriPribadi: k.data as (typeof KATEGORI_PRIBADI)[number],
      namaTampilan: n.data || tanpaEkstensi(b.nama),
      namaFileAsli: b.nama,
      diunggahOlehId: u.userId,
      ...simpan,
    },
  });
  await catatAudit({ userId: u.userId, aksi: "UNGGAH_DOKUMEN", entitas: "dokumen", entitasId: d.id, sesudah: { ruang: d.ruang, pemilikPegawaiId: pemilik, kategori: d.kategoriPribadi, nama: d.namaTampilan, ukuran: d.ukuran } });
  revalidatePath("/dokumen");
  return { sukses: `"${d.namaTampilan}" diunggah.`, stempel: Date.now() };
}

/** Unggah ke folder organisasi (perlu hak kelola folder). */
export async function unggahDokumenOrganisasi(folderId: string, _: HasilForm, fd: FormData): Promise<HasilForm> {
  const u = await wajibLogin();
  if (!uuid.safeParse(folderId).success || !(await hakFolder(u, folderId)).kelola) return { galat: "Anda tidak berhak mengunggah ke folder ini." };
  const n = namaTampilan.safeParse(fd.get("nama") ?? "");
  if (!n.success) return { galatField: { nama: n.error.issues[0].message } };
  const b = await bacaUnggahan(fd);
  if (!b.ok) return { galatField: { berkas: b.galat } };

  const simpan = await simpanBerkas(b.isi, b.ext, false);
  const d = await db.dokumen.create({
    data: { ruang: "ORGANISASI", folderId, namaTampilan: n.data || tanpaEkstensi(b.nama), namaFileAsli: b.nama, diunggahOlehId: u.userId, ...simpan },
  });
  await catatAudit({ userId: u.userId, aksi: "UNGGAH_DOKUMEN", entitas: "dokumen", entitasId: d.id, sesudah: { ruang: d.ruang, folderId, nama: d.namaTampilan, ukuran: d.ukuran } });
  revalidatePath("/dokumen/organisasi");
  return { sukses: `"${d.namaTampilan}" diunggah.`, stempel: Date.now() };
}

const skemaUbah = z.object({ nama: namaTampilan.min(1, "Isi nama dokumen."), kategori: kategori.optional() });

/** Ganti nama (dan kategori untuk dokumen pribadi). */
export async function ubahDokumen(id: string, _: HasilForm, fd: FormData): Promise<HasilForm> {
  const u = await wajibLogin();
  if (!uuid.safeParse(id).success) return { galat: "Dokumen tidak ditemukan." };
  const d = await db.dokumen.findUnique({ where: { id } });
  if (!d || d.dihapusPada || !(await bolehKelolaDokumen(u, d))) return { galat: "Anda tidak berhak mengubah dokumen ini." };
  const v = skemaUbah.safeParse({ nama: fd.get("nama"), kategori: d.ruang === "PRIBADI" ? fd.get("kategori") : undefined });
  if (!v.success) return { galat: v.error.issues[0].message };
  const baru = await db.dokumen.update({
    where: { id },
    data: { namaTampilan: v.data.nama, ...(v.data.kategori ? { kategoriPribadi: v.data.kategori as (typeof KATEGORI_PRIBADI)[number] } : {}) },
  });
  await catatAudit({ userId: u.userId, aksi: "UBAH_DOKUMEN", entitas: "dokumen", entitasId: id, sebelum: { nama: d.namaTampilan, kategori: d.kategoriPribadi }, sesudah: { nama: baru.namaTampilan, kategori: baru.kategoriPribadi } });
  revalidatePath(d.ruang === "PRIBADI" ? "/dokumen" : "/dokumen/organisasi");
  return { sukses: "Dokumen diperbarui." };
}

/** Hapus lunak: berkas tetap tersimpan dan bisa dipulihkan Admin. */
export async function hapusDokumen(id: string): Promise<HasilForm> {
  const u = await wajibLogin();
  if (!uuid.safeParse(id).success) return { galat: "Dokumen tidak ditemukan." };
  const d = await db.dokumen.findUnique({ where: { id } });
  if (!d || d.dihapusPada || !(await bolehKelolaDokumen(u, d))) return { galat: "Anda tidak berhak menghapus dokumen ini." };
  await db.dokumen.update({ where: { id }, data: { dihapusPada: new Date(), dihapusOlehId: u.userId } });
  await catatAudit({ userId: u.userId, aksi: "HAPUS_DOKUMEN", entitas: "dokumen", entitasId: id, sebelum: { nama: d.namaTampilan, ruang: d.ruang } });
  revalidatePath(d.ruang === "PRIBADI" ? "/dokumen" : "/dokumen/organisasi");
  return { sukses: `"${d.namaTampilan}" dihapus. Admin dapat memulihkannya bila perlu.` };
}

export async function pulihkanDokumen(id: string): Promise<void> {
  const u = await wajibLogin();
  if (!punyaPeran(u, "ADMIN") || !uuid.safeParse(id).success) return;
  const d = await db.dokumen.update({ where: { id }, data: { dihapusPada: null, dihapusOlehId: null } }).catch(() => null);
  if (d) await catatAudit({ userId: u.userId, aksi: "PULIHKAN_DOKUMEN", entitas: "dokumen", entitasId: id, sesudah: { nama: d.namaTampilan, ruang: d.ruang } });
  revalidatePath("/admin/dokumen-terhapus");
}
