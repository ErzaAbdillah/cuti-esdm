"use client";

import { CircleCheckIcon, DownloadIcon, FileSearchIcon, SaveIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type HasilSimpanImpor, simpanImpor } from "@/server/aksi/impor-pegawai";
import type { HasilPratinjau } from "@/server/excel/impor-pegawai";

export function ImporPegawai() {
  const [pratinjau, setPratinjau] = useState<HasilPratinjau | null>(null);
  const [memeriksa, setMemeriksa] = useState(false);
  const [hanyaGalat, setHanyaGalat] = useState(false);
  const [hasil, setHasil] = useState<HasilSimpanImpor | null>(null);
  const [menyimpan, mulai] = useTransition();

  const baris = useMemo(() => pratinjau?.baris ?? [], [pratinjau]);
  const valid = useMemo(() => baris.filter((b) => b.galat.length === 0), [baris]);
  const ditampilkan = hanyaGalat ? baris.filter((b) => b.galat.length) : baris;

  async function periksa(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setHasil(null);
    setMemeriksa(true);
    try {
      const res = await fetch("/api/pegawai/impor", { method: "POST", body: new FormData(e.currentTarget) });
      const json = (await res.json()) as HasilPratinjau;
      setPratinjau(json);
      if (json.galat) toast.error(json.galat);
    } catch {
      toast.error("Gagal mengunggah berkas. Periksa koneksi lalu coba lagi.");
    } finally {
      setMemeriksa(false);
    }
  }

  function simpan() {
    mulai(async () => {
      const h = await simpanImpor({ baris: valid.map((b) => b.nilai), kolomAda: pratinjau?.kolomAda ?? [] });
      setHasil(h);
      if (h.galat) toast.error(h.galat);
      else {
        toast.success(`Impor selesai: ${h.baru} baru, ${h.ubah} diperbarui.`);
        setPratinjau(null);
      }
    });
  }

  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-judul">1. Siapkan berkas</CardTitle>
          <CardDescription>
            Unduh template, isi sheet <b>Pegawai</b> (satu baris per pegawai), lalu unggah. Pegawai yang NIP/ID-nya sudah ada akan diperbarui;
            kolom yang tidak ada di berkas tidak mengubah data lama. Hasil <b>Ekspor Excel</b> juga bisa diedit lalu diimpor kembali.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <Button asChild variant="outline" className="bg-white/70">
            <a href="/api/pegawai/template">
              <DownloadIcon data-icon="inline-start" /> Unduh template
            </a>
          </Button>
          <form onSubmit={periksa} className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-sm font-medium text-judul">
              Berkas .xlsx (maks. 5 MB)
              <input
                type="file"
                name="berkas"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                required
                className="block w-full max-w-xs text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-sky-100 file:px-3 file:py-2 file:font-semibold file:text-judul hover:file:bg-sky-200"
              />
            </label>
            <Button type="submit" disabled={memeriksa}>
              <FileSearchIcon data-icon="inline-start" /> {memeriksa ? "Memeriksa…" : "Periksa berkas"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {hasil && !hasil.galat && (
        <Alert className="border-emerald-300 bg-emerald-50" role="status">
          <CircleCheckIcon className="text-emerald-700" />
          <AlertTitle className="text-emerald-950">Impor tersimpan</AlertTitle>
          <AlertDescription className="text-emerald-900">
            {hasil.baru} pegawai baru dan {hasil.ubah} pegawai diperbarui.{" "}
            <Link href="/pegawai" className="font-semibold underline">
              Lihat data pegawai
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {baris.length > 0 && (
        <Card className="py-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-100 p-4">
            <div>
              <h2 className="font-semibold text-judul">2. Pratinjau</h2>
              <p className="text-sm text-slate-700">
                {baris.length} baris · <span className="font-semibold text-emerald-800">{valid.length} valid</span>
                {baris.length - valid.length > 0 && <span className="font-semibold text-destructive"> · {baris.length - valid.length} bermasalah</span>} ·{" "}
                {valid.filter((b) => b.aksi === "BARU").length} baru, {valid.filter((b) => b.aksi === "UBAH").length} diperbarui
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={hanyaGalat} onChange={(e) => setHanyaGalat(e.target.checked)} className="size-4 accent-primary" />
                Hanya baris bermasalah
              </label>
              <Button type="button" variant="penting" disabled={menyimpan || valid.length === 0} onClick={simpan}>
                <SaveIcon data-icon="inline-start" /> {menyimpan ? "Menyimpan…" : `Simpan ${valid.length} baris valid`}
              </Button>
            </div>
          </div>
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="sticky top-0 bg-sky-50 text-judul">
                <tr>
                  <th className="px-3 py-2 text-left">Baris</th>
                  <th className="px-3 py-2 text-left">Nama</th>
                  <th className="px-3 py-2 text-left">NIP / ID</th>
                  <th className="px-3 py-2 text-left">Aksi</th>
                  <th className="px-3 py-2 text-left">Hasil pemeriksaan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-100">
                {ditampilkan.map((b) => (
                  <tr key={b.baris} className={cn(b.galat.length && "bg-red-50/70")}>
                    <td className="px-3 py-2 tabular-nums">{b.baris}</td>
                    <td className="px-3 py-2 font-medium">{b.nama}</td>
                    <td className="px-3 py-2 font-mono text-xs">{b.identitas}</td>
                    <td className="px-3 py-2">{b.aksi === "BARU" ? "Baru" : "Perbarui"}</td>
                    <td className="px-3 py-2">
                      {b.galat.length === 0 ? (
                        <span className="inline-flex items-center gap-1 text-emerald-800">
                          <CircleCheckIcon className="size-4" /> Siap
                        </span>
                      ) : (
                        <ul className="grid gap-0.5 text-destructive">
                          {b.galat.map((g) => (
                            <li key={g} className="flex gap-1">
                              <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" /> {g}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
