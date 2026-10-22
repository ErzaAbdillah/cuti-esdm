"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Pilihan } from "@/components/form/pilihan";
import { aturStatusManual } from "@/server/aksi/absen";

type Pilih = "HADIR" | "TERLAMBAT" | "ALPA" | "KOSONG";

/** Pencatatan kehadiran dari daftar hadir kertas (pegawai tanpa absen online). */
export function StatusManual({ pegawaiId, tanggal, nilai, nama }: { pegawaiId: string; tanggal: string; nilai: Pilih; nama: string }) {
  const [proses, mulai] = useTransition();
  return (
    <Pilihan
      aria-label={`Kehadiran ${nama}`}
      defaultValue={nilai}
      disabled={proses}
      className="h-9 w-36"
      onChange={(e) => {
        const status = e.target.value as Pilih;
        mulai(async () => {
          const h = await aturStatusManual({ pegawaiId, tanggal, status });
          if (h.galat) toast.error(h.galat);
          else toast.success(`${nama}: ${h.sukses}`);
        });
      }}
    >
      <option value="KOSONG">— belum dicatat</option>
      <option value="HADIR">Hadir (TTD kertas)</option>
      <option value="TERLAMBAT">Terlambat</option>
      <option value="ALPA">Alpa</option>
    </Pilihan>
  );
}
