import type { Metadata } from "next";
import { SegeraHadir } from "@/components/umum/segera-hadir";
import { wajibPeran } from "@/server/auth/pengguna";

export const metadata: Metadata = { title: "Proses Cuti" };

export default async function Halaman() {
  await wajibPeran("ATASAN", "KEPEGAWAIAN", "ADMIN");
  return <SegeraHadir judul="Proses Cuti" tahap={5} isi="Antrean persetujuan atasan, verifikasi Kepegawaian, dan keputusan pejabat." />;
}
