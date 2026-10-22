import type { Metadata } from "next";
import { SegeraHadir } from "@/components/umum/segera-hadir";
import { wajibPeran } from "@/server/auth/pengguna";

export const metadata: Metadata = { title: "Dokumen Saya" };

export default async function Halaman() {
  await wajibPeran("PEGAWAI");
  return <SegeraHadir judul="Dokumen Saya" tahap={7} isi="Ruang dokumen pribadi (SK, ijazah, KTP, KK) dan cetak beberapa file sekaligus." />;
}
