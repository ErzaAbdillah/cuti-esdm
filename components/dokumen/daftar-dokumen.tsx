"use client";

import { DownloadIcon, EyeIcon, FileIcon, PencilIcon, PrinterIcon, Trash2Icon } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";
import { Bidang } from "@/components/form/bidang";
import { Pilihan } from "@/components/form/pilihan";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatUkuran, KATEGORI_PRIBADI, LABEL_KATEGORI, MAKS_GABUNG } from "@/lib/dokumen";
import type { KategoriDokumenPribadi } from "@/lib/generated/prisma/enums";
import { formatTanggalJam } from "@/lib/tanggal";
import type { HasilForm } from "@/lib/validasi/auth";
import { hapusDokumen, ubahDokumen } from "@/server/aksi/dokumen";

export interface BarisDokumen {
  id: string;
  namaTampilan: string;
  ekstensi: string;
  ukuran: number;
  diunggahPada: Date;
  kategori: KategoriDokumenPribadi | null;
  kelola: boolean;
}

const bisaPratinjau = (ext: string) => ["pdf", "jpg", "jpeg", "png"].includes(ext);

function DialogUbah({ d }: { d: BarisDokumen }) {
  const [buka, setBuka] = useState(false);
  const [, aksi, proses] = useActionState<HasilForm, FormData>(async (s, fd) => {
    const h = await ubahDokumen(d.id, s, fd);
    if (h.galat) toast.error(h.galat);
    else {
      toast.success(h.sukses);
      setBuka(false);
    }
    return h;
  }, {});
  return (
    <Dialog open={buka} onOpenChange={setBuka}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Ubah ${d.namaTampilan}`}>
          <PencilIcon />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-judul">Ubah dokumen</DialogTitle>
        </DialogHeader>
        <form action={aksi} className="grid gap-3">
          <Bidang label="Nama dokumen" name="nama" defaultValue={d.namaTampilan} required maxLength={200} />
          {d.kategori && (
            <label className="grid gap-1.5 text-sm font-medium text-judul">
              Kategori
              <Pilihan name="kategori" className="h-11" defaultValue={d.kategori}>
                {KATEGORI_PRIBADI.map((k) => (
                  <option key={k} value={k}>
                    {LABEL_KATEGORI[k]}
                  </option>
                ))}
              </Pilihan>
            </label>
          )}
          <DialogFooter>
            <Button type="submit" disabled={proses}>
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TombolHapus({ d }: { d: BarisDokumen }) {
  const [proses, mulai] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Hapus ${d.namaTampilan}`}>
          <Trash2Icon className="text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus &quot;{d.namaTampilan}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>Dokumen disembunyikan dari daftar. Admin masih dapat memulihkannya.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            disabled={proses}
            onClick={() =>
              mulai(async () => {
                const h = await hapusDokumen(d.id);
                if (h.galat) toast.error(h.galat);
                else toast.success(h.sukses);
              })
            }
          >
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Daftar dokumen dengan pilihan untuk cetak gabungan (urutan cetak = urutan daftar). */
export function DaftarDokumen({ dokumen, kosong }: { dokumen: BarisDokumen[]; kosong: string }) {
  const [pilih, setPilih] = useState<Set<string>>(new Set());
  const [proses, mulai] = useTransition();
  const semua = dokumen.length > 0 && pilih.size === dokumen.length;
  const ubahPilih = (id: string, v: boolean) =>
    setPilih((s) => {
      const n = new Set(s);
      if (v) n.add(id);
      else n.delete(id);
      return n;
    });

  function cetak() {
    const ids = dokumen.filter((d) => pilih.has(d.id)).map((d) => d.id);
    // Tab dibuka saat klik agar tidak diblokir; isinya PDF setelah selesai digabung.
    const tab = window.open("about:blank", "_blank");
    mulai(async () => {
      const r = await fetch("/api/dokumen/cetak-gabungan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
      if (!r.ok) {
        tab?.close();
        toast.error(await r.text());
        return;
      }
      const url = URL.createObjectURL(await r.blob());
      if (tab) tab.location.href = url;
      else {
        const a = document.createElement("a");
        a.href = url;
        a.download = "dokumen-gabungan.pdf";
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    });
  }

  if (dokumen.length === 0) return <p className="px-4 py-8 text-center text-sm text-slate-600">{kosong}</p>;

  return (
    <div className="grid">
      <div className="flex flex-wrap items-center gap-3 border-b border-sky-100 px-4 py-2.5">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <Checkbox checked={semua} onCheckedChange={(v) => setPilih(v === true ? new Set(dokumen.map((d) => d.id)) : new Set())} aria-label="Pilih semua dokumen" />
          Pilih semua
        </label>
        <Button type="button" size="sm" className="ml-auto" disabled={pilih.size === 0 || pilih.size > MAKS_GABUNG.berkas || proses} onClick={cetak}>
          <PrinterIcon data-icon="inline-start" /> {proses ? "Menggabungkan…" : `Cetak gabungan${pilih.size ? ` (${pilih.size})` : ""}`}
        </Button>
      </div>
      <ul className="divide-y divide-sky-100">
        {dokumen.map((d) => (
          <li key={d.id} className="flex items-center gap-3 px-4 py-2.5">
            <Checkbox checked={pilih.has(d.id)} onCheckedChange={(v) => ubahPilih(d.id, v === true)} aria-label={`Pilih ${d.namaTampilan}`} />
            <FileIcon className="size-5 shrink-0 text-primary" aria-hidden />
            <div className="grid min-w-0 flex-1 gap-0.5">
              <span className="truncate text-sm font-medium text-slate-900">{d.namaTampilan}</span>
              <span className="text-xs text-slate-600">
                {d.kategori && `${LABEL_KATEGORI[d.kategori]} · `}
                {d.ekstensi.toUpperCase()} · {formatUkuran(d.ukuran)} · {formatTanggalJam(d.diunggahPada)}
              </span>
            </div>
            <div className="flex shrink-0 items-center">
              {bisaPratinjau(d.ekstensi) && (
                <Button asChild variant="ghost" size="icon-sm" aria-label={`Lihat ${d.namaTampilan}`}>
                  <a href={`/api/dokumen/${d.id}/berkas`} target="_blank" rel="noopener">
                    <EyeIcon />
                  </a>
                </Button>
              )}
              <Button asChild variant="ghost" size="icon-sm" aria-label={`Unduh ${d.namaTampilan}`}>
                <a href={`/api/dokumen/${d.id}/berkas?unduh=1`}>
                  <DownloadIcon />
                </a>
              </Button>
              {d.kelola && (
                <>
                  <DialogUbah d={d} />
                  <TombolHapus d={d} />
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
