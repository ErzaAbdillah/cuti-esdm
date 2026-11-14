"use client";

import { CalendarPlusIcon, PencilIcon, UploadIcon } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";
import { Bidang } from "@/components/form/bidang";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { HasilForm } from "@/lib/validasi/auth";
import { bukaTahunSaldo, imporSaldo, ubahSaldo } from "@/server/aksi/saldo";

export function UbahSaldo({ pegawaiId, nama, tahun, saldo }: { pegawaiId: string; nama: string; tahun: number; saldo: { hakTahunIni: number; sisaN1: number; sisaN2: number; penyesuaian: number } | null }) {
  const [buka, setBuka] = useState(false);
  const [, aksi, proses] = useActionState<HasilForm, FormData>(async (s, fd) => {
    const h = await ubahSaldo(s, fd);
    if (h.galat) toast.error(h.galat);
    else {
      toast.success(`${nama}: ${h.sukses}`);
      setBuka(false);
    }
    return h;
  }, {});
  return (
    <Dialog open={buka} onOpenChange={setBuka}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Ubah saldo ${nama}`}>
          <PencilIcon />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-judul">Saldo cuti {tahun}</DialogTitle>
          <DialogDescription>{nama}. Setiap perubahan dicatat sebagai mutasi saldo dan di audit log.</DialogDescription>
        </DialogHeader>
        <form action={aksi} className="grid gap-3">
          <input type="hidden" name="pegawaiId" value={pegawaiId} />
          <input type="hidden" name="tahun" value={tahun} />
          <div className="grid grid-cols-2 gap-3">
            <Bidang label="Hak tahun ini" name="hakTahunIni" type="number" min={0} max={30} defaultValue={saldo?.hakTahunIni ?? 12} />
            <Bidang label={`Hak ${tahun - 1}`} name="sisaN1" type="number" min={0} max={30} defaultValue={saldo?.sisaN1 ?? 0} />
            <Bidang label={`Hak ${tahun - 2}`} name="sisaN2" type="number" min={0} max={30} defaultValue={saldo?.sisaN2 ?? 0} />
            <Bidang label="Penyesuaian (±)" name="penyesuaian" type="number" min={-30} max={30} defaultValue={saldo?.penyesuaian ?? 0} />
          </div>
          <Bidang label="Alasan perubahan" name="catatan" placeholder="mis. Koreksi sesuai SK cuti 2025" required />
          <Button type="submit" disabled={proses} className="justify-self-start">
            {proses ? "Menyimpan…" : "Simpan"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function BukaTahun({ tahun }: { tahun: number }) {
  const [proses, mulai] = useTransition();
  return (
    <Button
      variant="outline"
      className="bg-white/70"
      disabled={proses}
      onClick={() => {
        if (!confirm(`Buat saldo ${tahun + 1} untuk semua ASN aktif dari saldo ${tahun}? Sisa tahun ${tahun} dibawa sesuai batas akumulasi.`)) return;
        mulai(async () => {
          const h = await bukaTahunSaldo(tahun + 1);
          if (h.galat) toast.error(h.galat);
          else toast.success(h.sukses ?? "Selesai");
        });
      }}
    >
      <CalendarPlusIcon data-icon="inline-start" /> {proses ? "Memproses…" : `Buat saldo ${tahun + 1}`}
    </Button>
  );
}

export function ImporSaldo({ tahun }: { tahun: number }) {
  const [hasil, aksi, proses] = useActionState<HasilForm, FormData>(async (s, fd) => {
    const h = await imporSaldo(tahun, s, fd);
    if (h.sukses) toast.success(h.sukses);
    return h;
  }, {});
  return (
    <form action={aksi} className="flex flex-wrap items-end gap-2">
      <input type="file" name="berkas" accept=".xlsx" aria-label={`Berkas saldo ${tahun}`} className="max-w-56 text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-sky-100 file:px-3 file:py-2 file:font-semibold file:text-judul" />
      <Button type="submit" variant="outline" disabled={proses} className="bg-white/70">
        <UploadIcon data-icon="inline-start" /> {proses ? "Mengimpor…" : "Impor"}
      </Button>
      {hasil.galat && <p className="w-full text-sm font-medium text-destructive">{hasil.galat}</p>}
    </form>
  );
}
