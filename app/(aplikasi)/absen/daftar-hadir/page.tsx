import { ClipboardPenIcon, PrinterIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { StatusManual } from "@/components/absen/status-manual";
import { Pilihan } from "@/components/form/pilihan";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { kunciTanggal } from "@/lib/domain/hari-kerja";
import { LABEL_STATUS_ABSEN, WARNA_STATUS_ABSEN } from "@/lib/label";
import { formatJam, formatTanggal, hariIniWita } from "@/lib/tanggal";
import { cn } from "@/lib/utils";
import { punyaPeran, wajibPeran } from "@/server/auth/pengguna";
import { dataDaftarHadir, grupUntuk } from "@/server/kueri/daftar-hadir";

export const metadata: Metadata = { title: "Daftar Hadir" };

function tanggalDariParam(v: unknown): Date {
  const hariIni = hariIniWita();
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return hariIni;
  const t = new Date(`${v}T00:00:00Z`);
  return Number.isNaN(t.getTime()) || t > hariIni ? hariIni : t;
}

export default async function DaftarHadir({ searchParams }: PageProps<"/absen/daftar-hadir">) {
  const u = await wajibPeran("ATASAN", "KEPEGAWAIAN");
  const sp = await searchParams;
  const grup = await grupUntuk(u);
  const grupId = grup.some((g) => g.id === sp.grup) ? (sp.grup as string) : grup[0]?.id;
  const tanggal = tanggalDariParam(sp.tanggal);
  const t = kunciTanggal(tanggal);
  const d = grupId ? await dataDaftarHadir(grupId, tanggal) : null;
  const kepegawaian = punyaPeran(u, "KEPEGAWAIAN");

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-judul">Daftar Hadir Masuk Kerja</h1>
          <p className="text-sm text-slate-700">{formatTanggal(tanggal, { hari: true })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="bg-white/70">
            <Link href="/absen/keterangan">
              <ClipboardPenIcon data-icon="inline-start" /> Keterangan DL/Sakit/Izin
            </Link>
          </Button>
          {d && (
            <Button asChild>
              <a href={`/cetak/daftar-hadir?grup=${grupId}&tanggal=${t}`} target="_blank" rel="noopener">
                <PrinterIcon data-icon="inline-start" /> Cetak daftar hadir
              </a>
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent>
          <form method="get" className="grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
            <label className="grid gap-1 text-xs font-medium text-slate-600">
              Unit kerja
              <Pilihan name="grup" defaultValue={grupId}>
                {grup.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.judul}
                  </option>
                ))}
              </Pilihan>
            </label>
            <label className="grid gap-1 text-xs font-medium text-slate-600">
              Tanggal
              <Input type="date" name="tanggal" defaultValue={t} max={kunciTanggal(hariIniWita())} className="h-10 bg-white" />
            </label>
            <Button type="submit" className="h-10">
              Tampilkan
            </Button>
          </form>
        </CardContent>
      </Card>

      {!d ? (
        <Card>
          <CardContent className="text-sm text-slate-700">Tidak ada daftar hadir yang bisa Anda lihat.</CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <div className="border-b border-sky-100 px-4 py-3">
            <p className="font-semibold text-judul">NAMA UNIT KERJA : {d.judulUnit}</p>
            <p className="text-sm text-slate-700">
              {d.baris.length} pegawai · {d.baris.filter((b) => b.status === "HADIR" || b.status === "TERLAMBAT").length} hadir ·{" "}
              {d.baris.filter((b) => !b.online).length} tanda tangan kertas
              {!d.hariKerja && <span className="ml-2 rounded bg-amber-100 px-1.5 text-amber-900">bukan hari kerja</span>}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-sky-50/80 text-left text-judul">
                <tr>
                  <th className="w-10 px-3 py-2">No.</th>
                  <th className="px-3 py-2">Nama / NIP</th>
                  <th className="px-3 py-2">Jabatan / Pangkat / Golongan</th>
                  <th className="px-3 py-2">Kehadiran</th>
                  <th className="px-3 py-2">Ket.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-100">
                {d.baris.map((b, i) => {
                  // Hanya penanda tangan kertas; cuti/keterangan diubah lewat menunya sendiri.
                  const bisaManual =
                    !b.online &&
                    !["CUTI", "DINAS_LUAR", "SAKIT", "IZIN", "TUGAS"].includes(b.status ?? "") &&
                    (kepegawaian || b.atasanId === u.pegawai?.id);
                  return (
                    <tr key={b.pegawaiId} className="align-top">
                      <td className="px-3 py-2.5 tabular-nums">{i + 1}.</td>
                      <td className="px-3 py-2.5">
                        <span className="block font-medium text-judul">{b.nama}</span>
                        {b.nip && <span className="block font-mono text-xs text-slate-600">{b.nip}</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="block">{b.jabatan}</span>
                        {b.pangkat && <span className="block text-xs text-slate-600">{b.pangkat}</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        {bisaManual ? (
                          <StatusManual
                            pegawaiId={b.pegawaiId}
                            tanggal={t}
                            nama={b.nama}
                            nilai={b.status === "HADIR" || b.status === "TERLAMBAT" || b.status === "ALPA" ? b.status : "KOSONG"}
                          />
                        ) : (
                          <span className="flex flex-wrap items-center gap-2">
                            {b.status ? (
                              <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", WARNA_STATUS_ABSEN[b.status])}>{LABEL_STATUS_ABSEN[b.status]}</span>
                            ) : (
                              <span className="text-xs text-slate-500">Belum absen</span>
                            )}
                            {b.jamMasuk && <span className="tabular-nums text-slate-700">{formatJam(b.jamMasuk)}</span>}
                          </span>
                        )}
                        <span className="mt-1 block text-[0.7rem] text-slate-500">{b.online ? "Absen online" : "Tanda tangan kertas"}</span>
                      </td>
                      <td className="max-w-56 px-3 py-2.5 text-xs text-slate-700">{b.keterangan}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
