"use server";

import { revalidatePath } from "next/cache";
import { periksaFotoProfil } from "@/lib/foto-profil";
import type { HasilForm } from "@/lib/validasi/auth";
import { catatAudit } from "../audit";
import { wajibLogin } from "../auth/pengguna";
import { db } from "../db";

/** Mengunggah atau mengganti foto profil akun yang sedang login. */
export async function unggahFotoProfil(_: HasilForm, formData: FormData): Promise<HasilForm> {
  const u = await wajibLogin();
  const berkas = formData.get("foto");
  if (!(berkas instanceof File) || berkas.size === 0) {
    return { galat: "Pilih berkas foto terlebih dahulu." };
  }

  const isi = new Uint8Array(await berkas.arrayBuffer());
  const cek = periksaFotoProfil(berkas.name, isi, berkas.type);
  if (!cek.ok) return { galat: cek.galat };

  const data = Buffer.from(isi);
  await db.fotoProfil.upsert({
    where: { userId: u.userId },
    create: { userId: u.userId, data, mime: cek.mime, ukuran: isi.byteLength },
    update: { data, mime: cek.mime, ukuran: isi.byteLength },
  });

  await catatAudit({
    userId: u.userId,
    aksi: "UNGGAH_FOTO_PROFIL",
    entitas: "foto_profil",
    entitasId: u.userId,
    sesudah: { mime: cek.mime, ukuran: isi.byteLength },
  });

  revalidatePath("/", "layout");
  revalidatePath("/profil");
  return { sukses: "Foto profil berhasil disimpan.", stempel: Date.now() };
}

/** Menghapus foto profil akun yang sedang login. */
export async function hapusFotoProfil(_: HasilForm = {}): Promise<HasilForm> {
  const u = await wajibLogin();
  const lama = await db.fotoProfil.findUnique({
    where: { userId: u.userId },
    select: { mime: true, ukuran: true },
  });
  if (!lama) return { galat: "Anda belum memiliki foto profil." };

  await db.fotoProfil.delete({ where: { userId: u.userId } });
  await catatAudit({
    userId: u.userId,
    aksi: "HAPUS_FOTO_PROFIL",
    entitas: "foto_profil",
    entitasId: u.userId,
    sebelum: { mime: lama.mime, ukuran: lama.ukuran },
  });

  revalidatePath("/", "layout");
  revalidatePath("/profil");
  return { sukses: "Foto profil berhasil dihapus.", stempel: Date.now() };
}
