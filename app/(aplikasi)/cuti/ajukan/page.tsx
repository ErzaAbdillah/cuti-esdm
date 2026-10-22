import type { Metadata } from "next";
import { SegeraHadir } from "@/components/umum/segera-hadir";
import { wajibPeran } from "@/server/auth/pengguna";

export const metadata: Metadata = { title: "Ajukan Cuti" };

export default async function Halaman() {
  await wajibPeran("PEGAWAI");
  return <SegeraHadir judul="Ajukan Cuti" tahap={5} isi="Form pengajuan dengan perhitungan hari kerja otomatis, validasi saldo, dan lampiran." />;
}
