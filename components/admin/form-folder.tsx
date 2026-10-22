"use client";

import { PlusIcon, SaveIcon, Trash2Icon } from "lucide-react";
import { useActionState, useTransition } from "react";
import { toast } from "sonner";
import { Bidang } from "@/components/form/bidang";
import { Pilihan } from "@/components/form/pilihan";
import { Button } from "@/components/ui/button";
import type { HasilForm } from "@/lib/validasi/auth";
import { buatFolder, hapusFolder, ubahFolder } from "@/server/aksi/folder";

const PERAN = [
  ["PEGAWAI", "Pegawai"],
  ["ATASAN", "Atasan"],
  ["KEPEGAWAIAN", "Kepegawaian"],
  ["ADMIN", "Admin"],
] as const;

type Akses = Record<string, { lihat: boolean; kelola: boolean }>;

function useAksi(fn: (s: HasilForm, fd: FormData) => Promise<HasilForm>) {
  return useActionState<HasilForm, FormData>(async (s, fd) => {
    const h = await fn(s, fd);
    if (h.galat) toast.error(h.galat);
    else if (h.sukses) toast.success(h.sukses);
    return h;
  }, {});
}

function MatriksAkses({ akses, awalan }: { akses: Akses; awalan: string }) {
  return (
    <fieldset className="grid gap-1">
      <legend className="mb-1 text-sm font-medium text-judul">Hak akses per peran</legend>
      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 gap-y-1 text-sm">
        <span />
        <span className="text-xs text-slate-600">Lihat</span>
        <span className="text-xs text-slate-600">Kelola</span>
        {PERAN.map(([p, label]) => (
          <div key={p} className="contents">
            <span>{label}</span>
            <input type="checkbox" name={`lihat_${p}`} defaultChecked={akses[p]?.lihat} aria-label={`${label} boleh melihat`} id={`${awalan}-l-${p}`} className="size-4 accent-primary" />
            <input type="checkbox" name={`kelola_${p}`} defaultChecked={akses[p]?.kelola} aria-label={`${label} boleh mengelola`} id={`${awalan}-k-${p}`} className="size-4 accent-primary" />
          </div>
        ))}
      </div>
    </fieldset>
  );
}

export function FormFolderBaru({ induk }: { induk: { id: string; nama: string }[] }) {
  const [h, aksi, proses] = useAksi(buatFolder);
  return (
    <form key={h.stempel ?? 0} action={aksi} className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-start">
      <Bidang label="Nama folder" name="nama" required galat={h.galatField?.nama} />
      <label className="grid gap-1.5 text-sm font-medium text-judul">
        Di dalam folder
        <Pilihan name="parentId" className="h-11" defaultValue="">
          <option value="">— folder utama —</option>
          {induk.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nama}
            </option>
          ))}
        </Pilihan>
        <span className="text-xs font-normal text-slate-600">Subfolder mewarisi hak akses induknya.</span>
      </label>
      <div className="md:row-span-2 md:mt-6">
        <Button type="submit" disabled={proses} className="h-11">
          <PlusIcon data-icon="inline-start" /> Buat folder
        </Button>
      </div>
      <div className="md:col-span-2">
        <MatriksAkses awalan="baru" akses={{ PEGAWAI: { lihat: true, kelola: false }, KEPEGAWAIAN: { lihat: true, kelola: true }, ADMIN: { lihat: true, kelola: true } }} />
      </div>
    </form>
  );
}

export function FormFolder({ f }: { f: { id: string; nama: string; akses: Akses; jumlah: number } }) {
  const [, aksi, proses] = useAksi(ubahFolder.bind(null, f.id));
  const [hapusProses, mulai] = useTransition();
  return (
    <form action={aksi} className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
      <div className="grid gap-3">
        <Bidang label="Nama folder" name="nama" defaultValue={f.nama} required />
        <MatriksAkses awalan={f.id} akses={f.akses} />
      </div>
      <div className="flex gap-2 md:flex-col">
        <Button type="submit" disabled={proses}>
          <SaveIcon data-icon="inline-start" /> Simpan
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={hapusProses || f.jumlah > 0}
          title={f.jumlah > 0 ? "Folder berisi dokumen" : undefined}
          onClick={() =>
            window.confirm(`Hapus folder "${f.nama}"?`) &&
            mulai(async () => {
              const h = await hapusFolder(f.id);
              if (h.galat) toast.error(h.galat);
              else toast.success(h.sukses);
            })
          }
        >
          <Trash2Icon data-icon="inline-start" className="text-destructive" /> Hapus
        </Button>
      </div>
    </form>
  );
}
