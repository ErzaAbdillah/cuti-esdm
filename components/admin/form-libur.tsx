"use client";

import { PlusIcon } from "lucide-react";
import { useActionState } from "react";
import { toast } from "sonner";
import { Bidang } from "@/components/form/bidang";
import { Pilihan } from "@/components/form/pilihan";
import { Button } from "@/components/ui/button";
import type { HasilForm } from "@/lib/validasi/auth";
import { tambahLibur } from "@/server/aksi/admin";

export function FormLibur() {
  const [, aksi, proses] = useActionState<HasilForm, FormData>(async (s, fd) => {
    const h = await tambahLibur(s, fd);
    if (h.galat) toast.error(h.galat);
    else if (h.sukses) toast.success(h.sukses);
    return h;
  }, {});

  return (
    <form action={aksi} className="grid items-end gap-3 md:grid-cols-[11rem_1fr_12rem_auto]">
      <Bidang label="Tanggal" name="tanggal" type="date" required />
      <Bidang label="Nama hari libur" name="nama" placeholder="mis. Hari Jadi Provinsi Kalimantan Selatan" required />
      <label className="grid gap-1.5 text-sm font-medium text-judul">
        Jenis
        <Pilihan name="jenis" className="h-11" defaultValue="LIBUR_NASIONAL">
          <option value="LIBUR_NASIONAL">Libur nasional</option>
          <option value="CUTI_BERSAMA">Cuti bersama</option>
          <option value="LIBUR_DAERAH">Libur daerah</option>
        </Pilihan>
      </label>
      <Button type="submit" disabled={proses} className="h-11">
        <PlusIcon data-icon="inline-start" /> Tambah
      </Button>
    </form>
  );
}
