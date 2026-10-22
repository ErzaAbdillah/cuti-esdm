import type { Metadata } from "next";
import { SegeraHadir } from "@/components/umum/segera-hadir";
import { wajibPeran } from "@/server/auth/pengguna";

export const metadata: Metadata = { title: "Admin" };

export default async function Halaman() {
  await wajibPeran("ADMIN");
  return <SegeraHadir judul="Admin" tahap={3} isi="Pengelolaan pengguna, master data, hari libur, template surat, pejabat penandatangan, dan pengaturan absen." />;
}
