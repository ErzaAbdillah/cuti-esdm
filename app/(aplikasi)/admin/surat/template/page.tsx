import { ChevronRightIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { NavSurat } from "@/components/admin/nav-surat";
import { Card } from "@/components/ui/card";
import { LABEL_LEVEL_SURAT, LABEL_STATUS_CUTI } from "@/lib/label";
import { formatTanggalJam } from "@/lib/tanggal";
import { wajibPeran } from "@/server/auth/pengguna";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Template Surat" };

const URUT_LEVEL = ["ESELON_II", "ESELON_III", "ESELON_IV", "STAF"] as const;

export default async function DaftarTemplate() {
  await wajibPeran("ADMIN");
  const template = await db.templateSurat.findMany({ include: { jenisCuti: true } });
  template.sort((a, b) => URUT_LEVEL.indexOf(a.level) - URUT_LEVEL.indexOf(b.level) || a.kodeDokumen.localeCompare(b.kodeDokumen));

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-judul">Surat cuti</h1>
        <p className="text-sm text-slate-700">Template per level eselon. Kop, nomor, tanggal, tanda tangan, tembusan, dan kotak disposisi disusun sistem; badan surat bisa diedit.</p>
      </div>
      <NavSurat aktif="/admin/surat/template" />
      <Card className="py-0">
        <ul className="divide-y divide-sky-100">
          {template.map((t) => (
            <li key={t.id}>
              <Link href={`/admin/surat/template/${t.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-sky-50/70 focus-visible:outline-2 focus-visible:outline-ring">
                <span className="w-24 shrink-0 text-xs font-semibold uppercase tracking-wide text-primary">{LABEL_LEVEL_SURAT[t.level]}</span>
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="font-medium text-slate-900">
                    {t.nama}
                    {t.jenisCuti && <span className="text-slate-600"> · khusus {t.jenisCuti.nama}</span>}
                  </span>
                  <span className="text-xs text-slate-600">
                    Bisa dicetak sejak {LABEL_STATUS_CUTI[t.dapatDicetakSejak]} · versi {t.versi} · diubah {formatTanggalJam(t.diubahPada)}
                  </span>
                </span>
                {!t.aktif && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">Nonaktif</span>}
                <ChevronRightIcon className="size-4 text-slate-500" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
