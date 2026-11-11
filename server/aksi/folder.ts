"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PeranAkses } from "@/lib/generated/prisma/enums";
import type { HasilForm } from "@/lib/validasi/auth";
import { catatAudit } from "../audit";
import { punyaHakAkses, punyaPeran, wajibLogin } from "../auth/pengguna";
import { db } from "../db";

const PERAN: PeranAkses[] = ["PEGAWAI", "ATASAN", "KEPEGAWAIAN", "ADMIN"];
const namaFolder = z.string().trim().min(2, "Isi nama folder.").max(100);

async function wajibAdmin() {
  const u = await wajibLogin();
  return punyaHakAkses(u, "PENGATURAN_ADMIN") || punyaPeran(u, "ADMIN") ? u : null;
}

/** Matriks hak dari form: `lihat_PEGAWAI`, `kelola_KEPEGAWAIAN`, … (kelola menyiratkan lihat). */
function bacaAkses(fd: FormData) {
  return PERAN.map((peran) => {
    const bolehKelola = fd.get(`kelola_${peran}`) === "on";
    return { peran, bolehKelola, bolehLihat: bolehKelola || fd.get(`lihat_${peran}`) === "on" };
  }).filter((a) => a.bolehLihat);
}

function segarkan() {
  revalidatePath("/admin/folder-dokumen");
  revalidatePath("/dokumen/organisasi");
}

export async function buatFolder(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const u = await wajibAdmin();
  if (!u) return { galat: "Hanya Admin." };
  const nama = namaFolder.safeParse(fd.get("nama"));
  if (!nama.success) return { galatField: { nama: nama.error.issues[0].message } };
  const parentRaw = String(fd.get("parentId") ?? "");
  const parentId = parentRaw ? z.uuid().safeParse(parentRaw).data : null;
  if (parentRaw && !parentId) return { galat: "Folder induk tidak valid." };
  const induk = parentId ? await db.folderDokumen.findUnique({ where: { id: parentId }, include: { akses: true } }) : null;
  if (parentId && !induk) return { galat: "Folder induk tidak ditemukan." };
  if (induk?.parentId) return { galat: "Subfolder hanya satu tingkat." };

  // Subfolder mewarisi hak akses induknya; folder utama memakai isian form.
  const akses = induk ? induk.akses.map(({ peran, bolehLihat, bolehKelola }) => ({ peran, bolehLihat, bolehKelola })) : bacaAkses(fd);
  if (!akses.some((a) => a.bolehLihat)) return { galat: "Pilih minimal satu peran yang boleh melihat folder." };
  const urutan = (await db.folderDokumen.aggregate({ _max: { urutan: true }, where: { parentId } }))._max.urutan ?? 0;
  const f = await db.folderDokumen.create({ data: { nama: nama.data, parentId, urutan: urutan + 1, akses: { create: akses } } });
  await catatAudit({ userId: u.userId, aksi: "BUAT_FOLDER", entitas: "folder_dokumen", entitasId: f.id, sesudah: { nama: f.nama, parentId, akses } });
  segarkan();
  return { sukses: `Folder "${f.nama}" dibuat.`, stempel: Date.now() };
}

export async function ubahFolder(id: string, _: HasilForm, fd: FormData): Promise<HasilForm> {
  const u = await wajibAdmin();
  if (!u) return { galat: "Hanya Admin." };
  if (!z.uuid().safeParse(id).success) return { galat: "Folder tidak ditemukan." };
  const nama = namaFolder.safeParse(fd.get("nama"));
  if (!nama.success) return { galat: nama.error.issues[0].message };
  const akses = bacaAkses(fd);
  if (!akses.some((a) => a.bolehLihat)) return { galat: "Pilih minimal satu peran yang boleh melihat folder." };
  const lama = await db.folderDokumen.findUnique({ where: { id }, include: { akses: true } });
  if (!lama) return { galat: "Folder tidak ditemukan." };

  await db.$transaction(async (tx) => {
    await tx.folderDokumen.update({ where: { id }, data: { nama: nama.data } });
    await tx.aksesFolder.deleteMany({ where: { folderId: id } });
    await tx.aksesFolder.createMany({ data: akses.map((a) => ({ folderId: id, ...a })) });
    await catatAudit(
      { userId: u.userId, aksi: "UBAH_FOLDER", entitas: "folder_dokumen", entitasId: id, sebelum: { nama: lama.nama, akses: lama.akses.map(({ peran, bolehLihat, bolehKelola }) => ({ peran, bolehLihat, bolehKelola })) }, sesudah: { nama: nama.data, akses } },
      tx,
    );
  });
  segarkan();
  return { sukses: "Folder disimpan." };
}

/** Hanya folder kosong (tanpa subfolder dan tanpa dokumen, termasuk yang terhapus) yang bisa dihapus. */
export async function hapusFolder(id: string): Promise<HasilForm> {
  const u = await wajibAdmin();
  if (!u) return { galat: "Hanya Admin." };
  if (!z.uuid().safeParse(id).success) return { galat: "Folder tidak ditemukan." };
  const f = await db.folderDokumen.findUnique({ where: { id }, include: { _count: { select: { anak: true, dokumen: true } } } });
  if (!f) return { galat: "Folder tidak ditemukan." };
  if (f._count.anak || f._count.dokumen) return { galat: "Folder masih berisi subfolder atau dokumen (termasuk yang terhapus)." };
  await db.folderDokumen.delete({ where: { id } });
  await catatAudit({ userId: u.userId, aksi: "HAPUS_FOLDER", entitas: "folder_dokumen", entitasId: id, sebelum: { nama: f.nama } });
  segarkan();
  return { sukses: `Folder "${f.nama}" dihapus.` };
}
