import type { Metadata } from "next";
import { SegeraHadir } from "@/components/umum/segera-hadir";
import { wajibPeran } from "@/server/auth/pengguna";

export const metadata: Metadata = { title: "Cuti Saya" };

export default async function Halaman() {
  await wajibPeran("PEGAWAI");
  return <SegeraHadir judul="Cuti Saya" tahap={5} isi="Saldo cuti, daftar pengajuan, dan pembatalan sebelum tanggal mulai." />;
}
