import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormPegawai } from "@/components/pegawai/form-pegawai";
import { Card, CardContent } from "@/components/ui/card";
import { catatAudit } from "@/server/audit";
import { wajibHakAkses } from "@/server/auth/pengguna";
import { calonAtasan, nilaiFormPegawai } from "@/server/kueri/form-pegawai";
import { opsiPegawai } from "@/server/kueri/pegawai";

export const metadata: Metadata = { title: "Ubah Pegawai" };

export default async function UbahPegawai({ params }: PageProps<"/pegawai/[id]/ubah">) {
  const u = await wajibHakAkses("KELOLA_PEGAWAI");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const awal = await nilaiFormPegawai(id);
  if (!awal) notFound();
  // Form ubah memuat NIK, alamat, dan HP asli → dicatat sebagai akses data sensitif.
  await catatAudit({ userId: u.userId, aksi: "LIHAT_DATA_SENSITIF", entitas: "pegawai", entitasId: id, sesudah: { via: "form_ubah" } });
  const [opsi, atasan] = await Promise.all([opsiPegawai(), calonAtasan(id)]);

  return (
    <div className="grid gap-5">
      <h1 className="text-2xl font-bold tracking-tight text-judul">Ubah data pegawai</h1>
      <Card>
        <CardContent>
          <FormPegawai pegawaiId={id} awal={awal} opsi={opsi} calonAtasan={atasan} />
        </CardContent>
      </Card>
    </div>
  );
}
