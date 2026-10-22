import type { Metadata } from "next";
import { FormKeterangan, TombolHapusKeterangan } from "@/components/absen/form-keterangan";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { kunciTanggal } from "@/lib/domain/hari-kerja";
import { namaLengkap } from "@/lib/domain/pegawai";
import type { Prisma } from "@/lib/generated/prisma/client";
import { LABEL_STATUS_ABSEN } from "@/lib/label";
import { formatTanggal, hariIniWita } from "@/lib/tanggal";
import { STATUS_DARI_KETERANGAN } from "@/lib/domain/status-absen";
import { punyaPeran, wajibPeran } from "@/server/auth/pengguna";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Keterangan Kehadiran" };

export default async function Keterangan() {
  const u = await wajibPeran("ATASAN", "KEPEGAWAIAN");
  const kepegawaian = punyaPeran(u, "KEPEGAWAIAN");
  const lingkup: Prisma.PegawaiWhereInput = kepegawaian ? { aktif: true } : { aktif: true, atasanLangsungId: u.pegawai?.id ?? "-" };

  const [pegawai, terbaru] = await Promise.all([
    db.pegawai.findMany({ where: lingkup, include: { jabatan: true }, orderBy: { nama: "asc" } }),
    db.keteranganKehadiran.findMany({
      where: { pegawai: lingkup },
      include: { pegawai: true },
      orderBy: { dibuatPada: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-judul">Keterangan kehadiran</h1>
        <p className="text-sm text-slate-700">
          Dinas luar, tugas lain, sakit, atau izin untuk rentang tanggal. Hari libur dilewati; hari yang sudah tercatat cuti tidak diubah.
          {!kepegawaian && " Anda dapat mencatat untuk bawahan langsung."}
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-judul">Catat keterangan</CardTitle>
        </CardHeader>
        <CardContent>
          <FormKeterangan
            hariIni={kunciTanggal(hariIniWita())}
            pegawai={pegawai.map((p) => ({ id: p.id, label: `${namaLengkap(p)} — ${p.jabatan?.namaSingkat ?? p.jabatan?.nama ?? "-"}` }))}
          />
        </CardContent>
      </Card>
      <Card className="py-0">
        <CardHeader className="pt-4">
          <CardTitle className="text-judul">Keterangan terbaru</CardTitle>
          <CardDescription>Menghapus keterangan mengembalikan status hari itu (absen online tetap tersimpan).</CardDescription>
        </CardHeader>
        <ul className="divide-y divide-sky-100">
          {terbaru.length === 0 && <li className="px-4 py-6 text-sm text-slate-600">Belum ada keterangan.</li>}
          {terbaru.map((k) => (
            <li key={k.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-judul">
                  {namaLengkap(k.pegawai)} · {LABEL_STATUS_ABSEN[STATUS_DARI_KETERANGAN[k.jenis]]}
                </span>
                <span className="block text-xs text-slate-600">
                  {formatTanggal(k.tanggalMulai)}
                  {k.tanggalSelesai > k.tanggalMulai && ` – ${formatTanggal(k.tanggalSelesai)}`} · {k.keterangan}
                  {k.nomorSurat && ` · No. ${k.nomorSurat}`}
                </span>
              </span>
              <TombolHapusKeterangan id={k.id} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
