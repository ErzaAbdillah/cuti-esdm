import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FormFormulir } from "@/components/cuti/form-formulir";
import { Card, CardContent } from "@/components/ui/card";
import { kunciTanggal } from "@/lib/domain/hari-kerja";
import { hariIniWita } from "@/lib/tanggal";
import { wajibPeran } from "@/server/auth/pengguna";
import { db } from "@/server/db";
import { bawaanFormulir } from "@/server/formulir/bawaan";
import { levelSuratPegawai } from "@/server/layanan/cuti";
import { opsiPengajuan } from "@/server/kueri/cuti";

export const metadata: Metadata = { title: "Formulir Cuti" };

export default async function AjukanCuti() {
  const u = await wajibPeran("PEGAWAI");
  const pegawaiId = u.pegawai!.id;
  const [o, pegawai] = await Promise.all([opsiPengajuan(pegawaiId), db.pegawai.findUniqueOrThrow({ where: { id: pegawaiId }, include: { jabatan: true } })]);
  const level = await levelSuratPegawai(pegawai);
  const isian = await bawaanFormulir(pegawaiId, level);

  return (
    <div className="grid gap-5">
      <div>
        <Link href="/cuti" className="mb-1 inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeftIcon className="size-4" /> Cuti Saya
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-judul">Formulir permintaan cuti</h1>
        <p className="text-sm text-slate-700">
          Isi dan periksa semua bagian formulir{isian.notaDinas ? " dan nota dinas" : ""}, lalu cetak. Berkas bertanda tangan diantar ke Kepegawaian (Sekretariat).
        </p>
      </div>
      {o.jenis.length === 0 ? (
        <Card>
          <CardContent className="text-sm text-slate-700">Belum ada jenis cuti yang berlaku untuk status kepegawaian Anda. Hubungi Kepegawaian.</CardContent>
        </Card>
      ) : (
        <FormFormulir
          id={null}
          jenis={o.jenis}
          level={level}
          hariIni={kunciTanggal(hariIniWita())}
          awal={{ isian, jenisCutiId: o.jenis[0].id, tanggalMulai: "", tanggalSelesai: "", alasan: "", alamat: o.alamat }}
        />
      )}
    </div>
  );
}
