import type { Metadata } from "next";
import { FormPegawai } from "@/components/pegawai/form-pegawai";
import { Card, CardContent } from "@/components/ui/card";
import { wajibPeran } from "@/server/auth/pengguna";
import { calonAtasan, NILAI_KOSONG } from "@/server/kueri/form-pegawai";
import { opsiPegawai } from "@/server/kueri/pegawai";

export const metadata: Metadata = { title: "Tambah Pegawai" };

export default async function TambahPegawai() {
  await wajibPeran("KEPEGAWAIAN");
  const [opsi, atasan] = await Promise.all([opsiPegawai(), calonAtasan()]);
  return (
    <div className="grid gap-5">
      <h1 className="text-2xl font-bold tracking-tight text-judul">Tambah pegawai</h1>
      <Card>
        <CardContent>
          <FormPegawai pegawaiId={null} awal={NILAI_KOSONG} opsi={opsi} calonAtasan={atasan} />
        </CardContent>
      </Card>
    </div>
  );
}
