import type { Metadata } from "next";
import { SegeraHadir } from "@/components/umum/segera-hadir";
import { wajibLogin } from "@/server/auth/pengguna";

export const metadata: Metadata = { title: "Dokumen Organisasi" };

export default async function Halaman() {
  await wajibLogin();
  return <SegeraHadir judul="Dokumen Organisasi" tahap={7} isi="Folder dokumen organisasi (SK, Peta Jabatan, notulen) dengan hak akses per peran." />;
}
