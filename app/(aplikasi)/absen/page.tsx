import type { Metadata } from "next";
import { SegeraHadir } from "@/components/umum/segera-hadir";
import { wajibPeran } from "@/server/auth/pengguna";

export const metadata: Metadata = { title: "Absen Masuk" };

export default async function Halaman() {
  await wajibPeran("PEGAWAI");
  return <SegeraHadir judul="Absen Masuk" tahap={4} isi="Tombol Absen Masuk sekali sehari, status Hadir/Terlambat otomatis, dan riwayat absen bulan ini." />;
}
