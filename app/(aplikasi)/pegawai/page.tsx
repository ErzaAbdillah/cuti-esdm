import type { Metadata } from "next";
import { SegeraHadir } from "@/components/umum/segera-hadir";
import { wajibPeran } from "@/server/auth/pengguna";

export const metadata: Metadata = { title: "Data Pegawai" };

export default async function Halaman() {
  await wajibPeran("KEPEGAWAIAN", "ADMIN");
  return <SegeraHadir judul="Data Pegawai" tahap={3} isi="Database pegawai lengkap dengan pencarian, filter, impor dan ekspor Excel." />;
}
