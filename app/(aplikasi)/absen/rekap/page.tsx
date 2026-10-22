import type { Metadata } from "next";
import { SegeraHadir } from "@/components/umum/segera-hadir";
import { wajibPeran } from "@/server/auth/pengguna";

export const metadata: Metadata = { title: "Rekap Absen" };

export default async function Halaman() {
  await wajibPeran("ATASAN", "KEPEGAWAIAN");
  return <SegeraHadir judul="Rekap Absen" tahap={4} isi="Rekap bulanan per pegawai (hadir, terlambat, cuti, dinas luar, alpa) dengan ekspor Excel." />;
}
