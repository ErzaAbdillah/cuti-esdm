import { CalendarCheckIcon, CalendarOffIcon, CalendarXIcon, ClockIcon } from "lucide-react";
import type { Metadata } from "next";
import { JamWita, TombolAbsen } from "@/components/absen/tombol-absen";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LABEL_STATUS_ABSEN, WARNA_STATUS_ABSEN } from "@/lib/label";
import { formatJam, formatTanggal } from "@/lib/tanggal";
import { cn } from "@/lib/utils";
import { wajibPeran } from "@/server/auth/pengguna";
import { dataHalamanAbsen } from "@/server/kueri/absen";

export const metadata: Metadata = { title: "Absen Masuk" };

export default async function HalamanAbsen() {
  const u = await wajibPeran("PEGAWAI");
  const d = await dataHalamanAbsen(u.pegawai!.id);
  const status = d.hariIniData?.status ?? null;
  const sudah = status != null;
  const hadir = status === "HADIR" || status === "TERLAMBAT";
  const alpa = status === "ALPA";
  const keteranganAturan = d.aturan.jamMasuk
    ? `Jam masuk ${d.aturan.jamMasuk} WITA${d.aturan.toleransiMenit ? `, toleransi ${d.aturan.toleransiMenit} menit` : ""}.`
    : "Jam masuk belum diatur Admin — semua absen dihitung Hadir.";

  return (
    <div className="mx-auto grid w-full max-w-xl gap-5">
      <Card className="gap-4 text-center">
        <CardContent className="grid gap-4 pt-2">
          <p className="text-sm font-medium text-slate-600">{formatTanggal(d.hariIni, { hari: true })}</p>
          <JamWita />
          {!d.hariKerja ? (
            <div className="flex flex-col items-center gap-2 rounded-xl bg-sky-50 p-4 text-slate-700">
              <CalendarOffIcon className="size-6 text-primary" aria-hidden />
              <p>{d.libur ? `Hari libur: ${d.libur.nama}.` : "Hari ini bukan hari kerja."}</p>
            </div>
          ) : sudah ? (
            <div className={cn("flex flex-col items-center gap-2 rounded-xl p-4", hadir ? "bg-emerald-50" : alpa ? "bg-red-50" : "bg-sky-50")}>
              {alpa ? (
                <CalendarXIcon className="size-7 text-merah" aria-hidden />
              ) : (
                <CalendarCheckIcon className={cn("size-7", hadir ? "text-emerald-700" : "text-primary")} aria-hidden />
              )}
              <span className={cn("rounded-full px-3 py-1 text-sm font-semibold", WARNA_STATUS_ABSEN[status!])}>{LABEL_STATUS_ABSEN[status!]}</span>
              {d.hariIniData!.jamMasuk && <p className="text-sm text-slate-700">Tercatat pukul {formatJam(d.hariIniData!.jamMasuk)} WITA</p>}
              {d.hariIniData!.keterangan && <p className="text-sm text-slate-700">{d.hariIniData!.keterangan}</p>}
              {alpa && (
                <p className="text-sm text-slate-700">
                  Batas absen pukul {d.aturan.batasAlpa} WITA sudah lewat. Bila ada keterangan (dinas luar, sakit, izin), minta atasan atau Kepegawaian mencatatnya.
                </p>
              )}
            </div>
          ) : (
            <TombolAbsen />
          )}
          <p className="flex items-center justify-center gap-1.5 text-xs text-slate-600">
            <ClockIcon className="size-3.5" aria-hidden /> {keteranganAturan}
          </p>
        </CardContent>
      </Card>

      <Card className="gap-2 py-4">
        <CardHeader>
          <CardTitle className="text-base text-judul">Riwayat bulan ini</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {d.riwayat.length === 0 ? (
            <p className="px-4 text-sm text-slate-700">Belum ada hari kerja bulan ini.</p>
          ) : (
            <ul className="divide-y divide-sky-100">
              {d.riwayat.map((r) => (
                <li key={r.tanggal.toISOString()} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="block font-medium text-judul">{formatTanggal(r.tanggal, { hari: true })}</span>
                    {r.keterangan && <span className="block truncate text-xs text-slate-600">{r.keterangan}</span>}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {r.jamMasuk && <span className="tabular-nums text-slate-700">{formatJam(r.jamMasuk)}</span>}
                    {r.status ? (
                      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", WARNA_STATUS_ABSEN[r.status])}>{LABEL_STATUS_ABSEN[r.status]}</span>
                    ) : (
                      <span className="text-xs text-slate-500">Belum tercatat</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
