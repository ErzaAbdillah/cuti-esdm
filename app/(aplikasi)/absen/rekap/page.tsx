import { FileSpreadsheetIcon } from "lucide-react";
import type { Metadata } from "next";
import { Pilihan } from "@/components/form/pilihan";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LABEL_STATUS_ABSEN } from "@/lib/label";
import { formatTanggal } from "@/lib/tanggal";
import { cn } from "@/lib/utils";
import { wajibPeran } from "@/server/auth/pengguna";
import { lingkupRekap } from "@/server/kueri/lingkup-rekap";
import { KOLOM_REKAP, rekapBulanan, rentangBulan } from "@/server/kueri/rekap-absen";

export const metadata: Metadata = { title: "Rekap Absen" };

export default async function RekapAbsen({ searchParams }: PageProps<"/absen/rekap">) {
  const u = await wajibPeran("ATASAN", "KEPEGAWAIAN");
  const sp = await searchParams;
  const r = rentangBulan(typeof sp.bulan === "string" ? sp.bulan : undefined);
  const l = await lingkupRekap(u, sp.grup);
  const data = r.valid ? await rekapBulanan(l.pegawaiIds, r.dari, r.sampai) : { hariKerja: 0, baris: [] };
  const namaBulan = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" }).format(r.dari);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-judul">Rekap absen {namaBulan}</h1>
          <p className="text-sm text-slate-700">
            {l.judul} · {data.hariKerja} hari kerja{r.valid && ` (s.d. ${formatTanggal(r.sampai)})`}
          </p>
        </div>
        <Button asChild variant="outline" className="bg-white/70">
          <a href={`/api/ekspor/rekap-absen?bulan=${r.kunci}&grup=${l.grupId ?? ""}`}>
            <FileSpreadsheetIcon data-icon="inline-start" /> Ekspor Excel
          </a>
        </Button>
      </div>

      <Card>
        <CardContent>
          <form method="get" className="grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
            <label className="grid gap-1 text-xs font-medium text-slate-600">
              Unit kerja
              <Pilihan name="grup" defaultValue={l.grupId}>
                {l.pilihan.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.judul}
                  </option>
                ))}
              </Pilihan>
            </label>
            <label className="grid gap-1 text-xs font-medium text-slate-600">
              Bulan
              <Input type="month" name="bulan" defaultValue={r.kunci} className="h-10 bg-white" />
            </label>
            <Button type="submit" className="h-10">
              Tampilkan
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="py-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-sky-50/80 text-judul">
              <tr>
                <th className="px-3 py-2 text-left">No.</th>
                <th className="px-3 py-2 text-left">Nama / NIP</th>
                {KOLOM_REKAP.map((k) => (
                  <th key={k} className="px-2 py-2 text-center">
                    {LABEL_STATUS_ABSEN[k]}
                  </th>
                ))}
                <th className="px-2 py-2 text-center">Belum tercatat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-100">
              {data.baris.length === 0 && (
                <tr>
                  <td colSpan={KOLOM_REKAP.length + 3} className="px-3 py-8 text-center text-slate-600">
                    Tidak ada data.
                  </td>
                </tr>
              )}
              {data.baris.map((b, i) => (
                <tr key={b.id}>
                  <td className="px-3 py-2 tabular-nums">{i + 1}.</td>
                  <td className="px-3 py-2">
                    <span className="block font-medium text-judul">{b.nama}</span>
                    <span className="block text-xs text-slate-600">
                      {b.nip} · {b.jabatan}
                    </span>
                  </td>
                  {KOLOM_REKAP.map((k) => (
                    <td key={k} className={cn("px-2 py-2 text-center tabular-nums", b.jumlah[k] === 0 && "text-slate-400", k === "ALPA" && b.jumlah[k] > 0 && "font-bold text-merah")}>
                      {b.jumlah[k]}
                    </td>
                  ))}
                  <td className={cn("px-2 py-2 text-center tabular-nums", b.belum === 0 ? "text-slate-400" : "text-slate-700")}>{b.belum}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
