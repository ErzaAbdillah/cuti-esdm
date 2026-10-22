import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ImporPegawai } from "@/components/pegawai/impor-pegawai";
import { wajibPeran } from "@/server/auth/pengguna";

export const metadata: Metadata = { title: "Impor Pegawai" };

export default async function HalamanImpor() {
  await wajibPeran("KEPEGAWAIAN", "ADMIN");
  return (
    <div className="grid gap-5">
      <div>
        <Link href="/pegawai" className="mb-1 inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeftIcon className="size-4" /> Data Pegawai
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-judul">Impor data pegawai dari Excel</h1>
      </div>
      <ImporPegawai />
    </div>
  );
}
