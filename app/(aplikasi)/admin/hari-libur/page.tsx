import { Trash2Icon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FormLibur } from "@/components/admin/form-libur";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatTanggal, hariIniWita } from "@/lib/tanggal";
import { cn } from "@/lib/utils";
import { hapusLibur } from "@/server/aksi/admin";
import { wajibPeran } from "@/server/auth/pengguna";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Hari Libur" };

const LABEL_JENIS = { LIBUR_NASIONAL: "Libur nasional", CUTI_BERSAMA: "Cuti bersama", LIBUR_DAERAH: "Libur daerah" } as const;

export default async function HariLibur({ searchParams }: PageProps<"/admin/hari-libur">) {
  await wajibPeran("ADMIN");
  const sp = await searchParams;
  const tahunIni = hariIniWita().getUTCFullYear();
  const diminta = Number(sp.tahun);
  const tahun = diminta >= 2020 && diminta <= 2100 ? diminta : tahunIni;
  const libur = await db.hariLibur.findMany({
    where: { tanggal: { gte: new Date(Date.UTC(tahun, 0, 1)), lte: new Date(Date.UTC(tahun, 11, 31)) } },
    orderBy: { tanggal: "asc" },
  });

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-judul">Hari libur &amp; cuti bersama {tahun}</h1>
          <p className="text-sm text-slate-700">Tidak dihitung sebagai hari kerja untuk cuti dan absen. Isi sesuai SKB 3 Menteri tahun berjalan.</p>
        </div>
        <div className="flex gap-2">
          {[tahun - 1, tahun + 1].map((t) => (
            <Button key={t} asChild variant="outline" size="sm" className="bg-white/70">
              <Link href={`/admin/hari-libur?tahun=${t}`}>{t}</Link>
            </Button>
          ))}
        </div>
      </div>
      <Card>
        <CardContent>
          <FormLibur />
        </CardContent>
      </Card>
      <Card className="py-0">
        <ul className="divide-y divide-sky-100">
          {libur.length === 0 && <li className="px-4 py-8 text-center text-slate-600">Belum ada hari libur untuk {tahun}.</li>}
          {libur.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
              <span className="w-56 font-medium text-judul">{formatTanggal(l.tanggal, { hari: true })}</span>
              <span className="min-w-0 flex-1">{l.nama}</span>
              <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", l.jenis === "CUTI_BERSAMA" ? "bg-amber-100 text-amber-900" : "bg-sky-100 text-sky-900")}>
                {LABEL_JENIS[l.jenis]}
              </span>
              <form action={hapusLibur.bind(null, l.id)}>
                <Button type="submit" variant="ghost" size="icon-sm" aria-label={`Hapus ${l.nama}`}>
                  <Trash2Icon className="text-destructive" />
                </Button>
              </form>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
