import type { Metadata } from "next";
import { FormPengaturan } from "@/components/admin/form-pengaturan";
import { DEF_PENGATURAN } from "@/lib/pengaturan";
import { wajibHakAkses } from "@/server/auth/pengguna";
import { semuaPengaturan } from "@/server/pengaturan";

export const metadata: Metadata = { title: "Pengaturan" };

const URUTAN = ["Cuti", "Surat", "Instansi", "Dokumen"] as const;

export default async function HalamanPengaturan() {
  await wajibHakAkses("PENGATURAN_ADMIN");
  const nilai = await semuaPengaturan();
  const kelompok = URUTAN.map((judul) => ({
    judul,
    item: DEF_PENGATURAN.filter((d) => d.kelompok === judul).map((d) => ({ ...d, nilai: nilai.get(d.kunci) ?? null })),
  }));

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-judul">Pengaturan</h1>
        <p className="text-sm text-slate-700">
          Nilai bertanda [ISI] belum ada di dokumen acuan dan perlu ditetapkan Admin. Semua perubahan tercatat di audit log.
        </p>
      </div>
      <FormPengaturan kelompok={kelompok} />
    </div>
  );
}
