import { DownloadIcon, FileSpreadsheetIcon, PrinterIcon } from "lucide-react";
import type { Metadata } from "next";
import { BukaTahun, ImporSaldo, UbahSaldo } from "@/components/cuti/kelola-saldo";
import { Pilihan } from "@/components/form/pilihan";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { hariIniWita } from "@/lib/tanggal";
import { cn } from "@/lib/utils";
import { wajibPeran } from "@/server/auth/pengguna";
import { rekapCutiTahunan } from "@/server/kueri/saldo";
import { GRUP_PJLP, semuaGrup } from "@/server/kueri/daftar-hadir";

export const metadata: Metadata = { title: "Saldo Cuti" };

export default async function SaldoCuti({ searchParams }: PageProps<"/cuti/saldo">) {
  await wajibPeran("KEPEGAWAIAN");
  const sp = await searchParams;
  const tahunIni = hariIniWita().getUTCFullYear();
  const t = Number(sp.tahun);
  const tahun = t >= 2020 && t <= 2100 ? t : tahunIni;
  const grup = (await semuaGrup()).filter((g) => g.id !== GRUP_PJLP);
  const grupId = grup.some((g) => g.id === sp.grup) ? (sp.grup as string) : undefined;
  const q = typeof sp.q === "string" && sp.q.trim() ? sp.q.trim().slice(0, 60) : undefined;
  const rekap = await rekapCutiTahunan(tahun, grupId, q);
  const kosong = rekap.reduce((n, g) => n + g.baris.filter((b) => !b.saldo).length, 0);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-judul">Saldo cuti tahunan {tahun}</h1>
          <p className="text-sm text-slate-700">
            Total hak = hak tahun ini + sisa N-1 + sisa N-2 (+ penyesuaian). {kosong > 0 && <b className="text-merah">{kosong} ASN belum punya saldo {tahun}.</b>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BukaTahun tahun={tahun} />
          <Button asChild variant="outline" className="bg-white/70">
            <a href={`/api/cuti/template-saldo?tahun=${tahun}`}>
              <DownloadIcon data-icon="inline-start" /> Unduh untuk diedit
            </a>
          </Button>
          <ImporSaldo tahun={tahun} />
          <Button asChild variant="outline" className="bg-white/70">
            <a href={`/cetak/rekap-cuti?tahun=${tahun}&grup=${grupId ?? ""}`} target="_blank" rel="noopener">
              <PrinterIcon data-icon="inline-start" /> Cetak rekap
            </a>
          </Button>
          <Button asChild variant="outline" className="bg-white/70">
            <a href={`/api/ekspor/rekap-cuti?tahun=${tahun}&grup=${grupId ?? ""}`}>
              <FileSpreadsheetIcon data-icon="inline-start" /> Ekspor rekap
            </a>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent>
          <form method="get" className="grid gap-3 sm:grid-cols-[1fr_1fr_8rem_auto] sm:items-end">
            <label className="grid gap-1 text-xs font-medium text-slate-600">
              Cari nama/NIP
              <Input name="q" defaultValue={q} className="h-10 bg-white" />
            </label>
            <label className="grid gap-1 text-xs font-medium text-slate-600">
              Unit
              <Pilihan name="grup" defaultValue={grupId ?? ""}>
                <option value="">Semua unit</option>
                {grup.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.judul}
                  </option>
                ))}
              </Pilihan>
            </label>
            <label className="grid gap-1 text-xs font-medium text-slate-600">
              Tahun
              <Input type="number" name="tahun" defaultValue={tahun} min={2020} max={2100} className="h-10 bg-white" />
            </label>
            <Button type="submit" className="h-10">
              Tampilkan
            </Button>
          </form>
        </CardContent>
      </Card>

      {rekap.map((g) => (
        <Card key={g.id} className="py-0">
          <h2 className="border-b border-sky-100 px-4 py-3 font-semibold text-judul">{g.judul}</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-sky-50/80 text-judul">
                <tr>
                  <th className="px-3 py-2 text-left">Nama / NIP</th>
                  <th className="px-2 py-2 text-center">N-2 ({tahun - 2})</th>
                  <th className="px-2 py-2 text-center">N-1 ({tahun - 1})</th>
                  <th className="px-2 py-2 text-center">Hak {tahun}</th>
                  <th className="px-2 py-2 text-center">Penyesuaian</th>
                  <th className="px-2 py-2 text-center">Jumlah</th>
                  <th className="px-2 py-2 text-center">Terpakai</th>
                  <th className="px-2 py-2 text-center">Sisa</th>
                  <th className="w-12 px-2 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-100">
                {g.baris.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-6 text-center text-slate-600">
                      Tidak ada pegawai.
                    </td>
                  </tr>
                )}
                {g.baris.map((b) => (
                  <tr key={b.pegawaiId}>
                    <td className="px-3 py-2">
                      <span className="block font-medium text-judul">{b.nama}</span>
                      <span className="block font-mono text-xs text-slate-600">{b.nip}</span>
                    </td>
                    {b.saldo ? (
                      <>
                        <td className="px-2 py-2 text-center tabular-nums">{b.saldo.sisaN2}</td>
                        <td className="px-2 py-2 text-center tabular-nums">{b.saldo.sisaN1}</td>
                        <td className="px-2 py-2 text-center tabular-nums">{b.saldo.hakTahunIni}</td>
                        <td className={cn("px-2 py-2 text-center tabular-nums", b.saldo.penyesuaian === 0 && "text-slate-400")}>{b.saldo.penyesuaian}</td>
                        <td className="px-2 py-2 text-center font-semibold tabular-nums">{b.totalHak}</td>
                        <td className="px-2 py-2 text-center tabular-nums">{b.saldo.terpakai}</td>
                        <td className="px-2 py-2 text-center font-bold tabular-nums text-judul">{b.sisa}</td>
                      </>
                    ) : (
                      <td colSpan={7} className="px-2 py-2 text-center text-sm text-merah">
                        Belum ada saldo {tahun}
                      </td>
                    )}
                    <td className="px-2 py-2 text-center">
                      <UbahSaldo pegawaiId={b.pegawaiId} nama={b.nama} tahun={tahun} saldo={b.saldo} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  );
}
