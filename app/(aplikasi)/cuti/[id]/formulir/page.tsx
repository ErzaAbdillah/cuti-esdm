import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FormFormulir } from "@/components/cuti/form-formulir";
import { kunciTanggal } from "@/lib/domain/hari-kerja";
import { hariIniWita } from "@/lib/tanggal";
import { punyaHakAkses, punyaPeran, wajibLogin } from "@/server/auth/pengguna";
import { db } from "@/server/db";
import { bawaanFormulir } from "@/server/formulir/bawaan";
import { isianFormulir } from "@/server/formulir/data";
import { opsiPengajuan } from "@/server/kueri/cuti";

export const metadata: Metadata = { title: "Ubah Formulir Cuti" };

/** Ubah formulir selama belum diproses Kepegawaian (pemohon, Kepegawaian, Admin). */
export default async function UbahFormulir({ params }: PageProps<"/cuti/[id]/formulir">) {
  const u = await wajibLogin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const p = await db.pengajuanCuti.findUnique({ where: { id }, include: { jenisCuti: true } });
  if (!p) notFound();
  if (!(u.pegawai?.id === p.pegawaiId || punyaHakAkses(u, "PROSES_CUTI") || punyaPeran(u, "KEPEGAWAIAN", "ADMIN"))) redirect("/akses-ditolak");
  if (p.status !== "DIAJUKAN") redirect(`/cuti/${id}`);
  const [o, isian, bawaan] = await Promise.all([
    opsiPengajuan(p.pegawaiId),
    isianFormulir(p),
    bawaanFormulir(p.pegawaiId, p.levelSurat, p.tahunSaldo ?? undefined),
  ]);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <div className="grid gap-5">
      <div>
        <Link href={`/cuti/${id}`} className="mb-1 inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeftIcon className="size-4" /> Detail cuti
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-judul">Ubah formulir permintaan cuti</h1>
      </div>
      <FormFormulir
        id={id}
        jenis={o.jenis}
        level={p.levelSurat}
        hariIni={kunciTanggal(hariIniWita())}
        awal={{
          isian,
          catatanAwal: bawaan.catatanTahunan,
          jenisCutiId: p.jenisCutiId,
          tanggalMulai: iso(p.tanggalMulai),
          tanggalSelesai: iso(p.tanggalSelesai),
          alasan: p.alasan,
          alamat: p.alamatSelamaCuti,
        }}
      />
    </div>
  );
}
