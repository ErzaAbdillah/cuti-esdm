import { RotateCcwIcon } from "lucide-react";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatUkuran, LABEL_KATEGORI } from "@/lib/dokumen";
import { namaLengkap } from "@/lib/domain/pegawai";
import { formatTanggalJam } from "@/lib/tanggal";
import { pulihkanDokumen } from "@/server/aksi/dokumen";
import { wajibHakAkses } from "@/server/auth/pengguna";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Dokumen Terhapus" };

export default async function DokumenTerhapus() {
  await wajibHakAkses("PENGATURAN_ADMIN");
  const dokumen = await db.dokumen.findMany({
    where: { dihapusPada: { not: null }, ruang: { in: ["PRIBADI", "ORGANISASI"] } },
    include: { pemilik: true, folder: true, dihapusOleh: { include: { pegawai: true } } },
    orderBy: { dihapusPada: "desc" },
    take: 200,
  });

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-judul">Dokumen terhapus</h1>
        <p className="text-sm text-slate-700">Dokumen yang dihapus pegawai atau pengelola folder. Berkasnya masih tersimpan dan bisa dipulihkan.</p>
      </div>
      <Card className="py-0">
        <ul className="divide-y divide-sky-100">
          {dokumen.length === 0 && <li className="px-4 py-8 text-center text-sm text-slate-600">Tidak ada dokumen terhapus.</li>}
          {dokumen.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="grid min-w-0 flex-1 gap-0.5">
                <span className="truncate font-medium text-slate-900">{d.namaTampilan}</span>
                <span className="text-xs text-slate-600">
                  {d.ruang === "PRIBADI" ? `Pribadi · ${d.pemilik ? namaLengkap(d.pemilik) : "-"}${d.kategoriPribadi ? ` · ${LABEL_KATEGORI[d.kategoriPribadi]}` : ""}` : `Folder ${d.folder?.nama ?? "-"}`} · {d.ekstensi.toUpperCase()} {formatUkuran(d.ukuran)}
                </span>
                <span className="text-xs text-slate-600">
                  Dihapus {formatTanggalJam(d.dihapusPada)} oleh {d.dihapusOleh ? (d.dihapusOleh.pegawai ? namaLengkap(d.dihapusOleh.pegawai) : d.dihapusOleh.loginId) : "-"}
                </span>
              </div>
              <form action={pulihkanDokumen.bind(null, d.id)}>
                <Button type="submit" variant="outline" size="sm" className="bg-white/70">
                  <RotateCcwIcon data-icon="inline-start" /> Pulihkan
                </Button>
              </form>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
