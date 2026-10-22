import type { Metadata } from "next";
import { SegeraHadir } from "@/components/umum/segera-hadir";
import { wajibPeran } from "@/server/auth/pengguna";

export const metadata: Metadata = { title: "Daftar Hadir" };

export default async function Halaman() {
  await wajibPeran("ATASAN", "KEPEGAWAIAN");
  return <SegeraHadir judul="Daftar Hadir" tahap={4} isi="Daftar hadir per unit kerja per tanggal sesuai form fisik DAFTAR HADIR MASUK KERJA, pengisian keterangan, dan cetak." />;
}
