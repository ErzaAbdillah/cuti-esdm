"use client";

import { SaveIcon, Trash2Icon } from "lucide-react";
import { useActionState, useTransition } from "react";
import { toast } from "sonner";
import { Bidang } from "@/components/form/bidang";
import { Pilihan } from "@/components/form/pilihan";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { HasilForm } from "@/lib/validasi/auth";
import { catatKeterangan, hapusKeterangan } from "@/server/aksi/absen";

export function FormKeterangan({ pegawai, hariIni }: { pegawai: { id: string; label: string }[]; hariIni: string }) {
  const [hasil, aksi, proses] = useActionState<HasilForm, FormData>(async (s, fd) => {
    const h = await catatKeterangan(s, fd);
    if (h.sukses) toast.success(h.sukses);
    else if (h.galat && !h.galatField) toast.error(h.galat);
    return h;
  }, {});
  const g = hasil.galatField ?? {};

  return (
    <form action={aksi} className="grid gap-4 md:grid-cols-2" key={hasil.sukses}>
      <div className="grid gap-1.5 md:col-span-2">
        <Label htmlFor="k-pegawai" className="text-judul">
          Pegawai
        </Label>
        <Pilihan id="k-pegawai" name="pegawaiId" className="h-11" defaultValue="" aria-invalid={g.pegawaiId ? true : undefined}>
          <option value="">Pilih pegawai</option>
          {pegawai.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </Pilihan>
        {g.pegawaiId && <p className="text-xs font-medium text-destructive">{g.pegawaiId}</p>}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="k-jenis" className="text-judul">
          Jenis
        </Label>
        <Pilihan id="k-jenis" name="jenis" className="h-11" defaultValue="DINAS_LUAR">
          <option value="DINAS_LUAR">Dinas luar</option>
          <option value="TUGAS">Tugas lain</option>
          <option value="SAKIT">Sakit</option>
          <option value="IZIN">Izin</option>
        </Pilihan>
      </div>
      <Bidang label="Nomor surat tugas (opsional)" name="nomorSurat" galat={g.nomorSurat} />
      <Bidang label="Tanggal mulai" name="tanggalMulai" type="date" defaultValue={hariIni} galat={g.tanggalMulai} required />
      <Bidang label="Tanggal selesai" name="tanggalSelesai" type="date" defaultValue={hariIni} galat={g.tanggalSelesai} required />
      <Bidang label="Keterangan" name="keterangan" placeholder="mis. Rapat koordinasi di Kementerian ESDM, Jakarta" galat={g.keterangan} className="md:col-span-2" required />
      <Button type="submit" disabled={proses} className="justify-self-start">
        <SaveIcon data-icon="inline-start" /> {proses ? "Menyimpan…" : "Simpan keterangan"}
      </Button>
    </form>
  );
}

export function TombolHapusKeterangan({ id }: { id: string }) {
  const [proses, mulai] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Hapus keterangan"
      disabled={proses}
      onClick={() =>
        mulai(async () => {
          const h = await hapusKeterangan(id);
          if (h.galat) toast.error(h.galat);
          else toast.success(h.sukses ?? "Dihapus");
        })
      }
    >
      <Trash2Icon className="text-destructive" />
    </Button>
  );
}
