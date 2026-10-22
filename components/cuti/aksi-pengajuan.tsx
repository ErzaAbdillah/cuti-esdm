"use client";

import { BanIcon, CheckIcon, FileUpIcon, XIcon } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";
import { Bidang } from "@/components/form/bidang";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { HasilForm } from "@/lib/validasi/auth";
import { batalkanCuti, catatKeputusanEksternal, setujuiCuti, tolakCuti } from "@/server/aksi/cuti";

type Jenis = "setujui" | "tolak" | "batal";

const TEKS: Record<Jenis, { tombol: string; judul: string; ket: string; label: string; wajib: boolean }> = {
  setujui: { tombol: "Setujui", judul: "Setujui pengajuan cuti", ket: "Pengajuan akan diteruskan ke tahap berikutnya.", label: "Catatan (opsional)", wajib: false },
  tolak: { tombol: "Tolak", judul: "Tolak pengajuan cuti", ket: "Pemohon akan menerima alasan penolakan ini.", label: "Alasan penolakan (wajib)", wajib: true },
  batal: { tombol: "Batalkan pengajuan", judul: "Batalkan pengajuan cuti", ket: "Saldo yang sudah dipotong akan dikembalikan.", label: "Alasan pembatalan (opsional)", wajib: false },
};

function DialogAksi({ id, jenis }: { id: string; jenis: Jenis }) {
  const [buka, setBuka] = useState(false);
  const [catatan, setCatatan] = useState("");
  const [proses, mulai] = useTransition();
  const t = TEKS[jenis];
  const Ikon = jenis === "setujui" ? CheckIcon : jenis === "tolak" ? XIcon : BanIcon;

  const kirim = () =>
    mulai(async () => {
      const fn = jenis === "setujui" ? setujuiCuti : jenis === "tolak" ? tolakCuti : batalkanCuti;
      const h = await fn(id, catatan);
      if (h.galat) toast.error(h.galat);
      else {
        toast.success(h.sukses ?? "Tersimpan");
        setBuka(false);
      }
    });

  return (
    <Dialog open={buka} onOpenChange={setBuka}>
      <DialogTrigger asChild>
        <Button variant={jenis === "setujui" ? "default" : "destructive"} size="lg">
          <Ikon data-icon="inline-start" /> {t.tombol}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-judul">{t.judul}</DialogTitle>
          <DialogDescription>{t.ket}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label htmlFor={`catatan-${jenis}`}>{t.label}</Label>
          <Textarea id={`catatan-${jenis}`} value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={3} className="bg-white" />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Batal</Button>
          </DialogClose>
          <Button onClick={kirim} disabled={proses || (t.wajib && catatan.trim().length < 5)} variant={jenis === "setujui" ? "default" : "destructive"}>
            {proses ? "Memproses…" : t.tombol}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AksiPengajuan({ id, bolehSetujui, bolehTolak, bolehBatal }: { id: string; bolehSetujui: boolean; bolehTolak: boolean; bolehBatal: boolean }) {
  if (!bolehSetujui && !bolehTolak && !bolehBatal) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {bolehSetujui && <DialogAksi id={id} jenis="setujui" />}
      {bolehTolak && <DialogAksi id={id} jenis="tolak" />}
      {bolehBatal && <DialogAksi id={id} jenis="batal" />}
    </div>
  );
}

export function FormKeputusanEksternal({ id, tujuan }: { id: string; tujuan: string }) {
  const [hasil, aksi, proses] = useActionState<HasilForm, FormData>(async (s, fd) => {
    const h = await catatKeputusanEksternal(id, s, fd);
    if (h.sukses) toast.success(h.sukses);
    else if (h.galat) toast.error(h.galat);
    return h;
  }, {});
  const g = hasil.galatField ?? {};
  return (
    <form action={aksi} className="grid gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
      <p className="text-sm font-semibold text-amber-950">Catat keputusan {tujuan}</p>
      <Bidang label="Nomor surat izin" name="nomorSurat" galat={g.nomorSurat} placeholder="mis. 800.1.11.4/1234/BKD/2026" />
      <div className="grid gap-1.5">
        <Label htmlFor={`berkas-${id}`}>Surat izin (PDF/JPG/PNG, maks. 10 MB)</Label>
        <input id={`berkas-${id}`} type="file" name="berkas" accept=".pdf,.jpg,.jpeg,.png" className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:font-semibold file:text-judul" />
        {g.berkas && <p className="text-xs font-medium text-destructive">{g.berkas}</p>}
      </div>
      <Bidang label="Catatan (opsional)" name="catatan" />
      <Button type="submit" variant="penting" disabled={proses} className="justify-self-start">
        <FileUpIcon data-icon="inline-start" /> {proses ? "Menyimpan…" : "Simpan keputusan & surat izin"}
      </Button>
    </form>
  );
}
