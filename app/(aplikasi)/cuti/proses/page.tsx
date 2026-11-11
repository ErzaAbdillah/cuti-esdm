import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Pilihan } from "@/components/form/pilihan";
import { LencanaStatusCuti } from "@/components/umum/lencana";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { namaLengkap } from "@/lib/domain/pegawai";
import type { StatusCuti } from "@/lib/generated/prisma/enums";
import { LABEL_LEVEL_SURAT, LABEL_STATUS_CUTI, LABEL_TAHAP } from "@/lib/label";
import { formatTanggal, formatTanggalJam } from "@/lib/tanggal";
import { punyaHakAkses, punyaPeran, wajibLogin } from "@/server/auth/pengguna";
import { db } from "@/server/db";
import { antreanSaya } from "@/server/kueri/cuti";

export const metadata: Metadata = { title: "Proses Cuti" };

const SEMUA_STATUS = Object.keys(LABEL_STATUS_CUTI) as StatusCuti[];

export default async function ProsesCuti({ searchParams }: PageProps<"/cuti/proses">) {
  const u = await wajibLogin();
  if (!(punyaHakAkses(u, "PROSES_CUTI") || punyaPeran(u, "ATASAN"))) redirect("/akses-ditolak");
  const antrean = await antreanSaya(u);
  const staf = punyaHakAkses(u, "PROSES_CUTI");
  const sp = await searchParams;
  const status = SEMUA_STATUS.includes(sp.status as StatusCuti) ? (sp.status as StatusCuti) : undefined;
  const semua = staf
    ? await db.pengajuanCuti.findMany({ where: status ? { status } : {}, include: { jenisCuti: true, pegawai: true }, orderBy: { dibuatPada: "desc" }, take: 100 })
    : [];

  return (
    <div className="grid gap-5">
      <h1 className="text-2xl font-bold tracking-tight text-judul">Proses Cuti</h1>

      <Card className="py-0">
        <CardHeader className="pt-4">
          <CardTitle className="text-judul">Menunggu tindakan Anda ({antrean.length})</CardTitle>
        </CardHeader>
        <ul className="divide-y divide-sky-100">
          {antrean.length === 0 && <li className="px-4 py-8 text-center text-sm text-slate-600">Tidak ada pengajuan yang menunggu Anda.</li>}
          {antrean.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-judul">{namaLengkap(p.pegawai)}</span>
                <span className="block text-sm text-slate-700">
                  {p.jenisCuti.nama} · {formatTanggal(p.tanggalMulai)} – {formatTanggal(p.tanggalSelesai)} · {p.jumlahHari} hari · {LABEL_LEVEL_SURAT[p.levelSurat]}
                </span>
                <span className="block text-xs text-slate-500">
                  {LABEL_TAHAP[p.tahap]}
                  {p.eksternal && " (catat keputusan eksternal)"} · diajukan {formatTanggalJam(p.dibuatPada)}
                </span>
              </span>
              <Button asChild>
                <Link href={`/cuti/${p.id}`}>Tinjau</Link>
              </Button>
            </li>
          ))}
        </ul>
      </Card>

      {staf && (
        <Card className="py-0">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pt-4">
            <CardTitle className="text-judul">Semua pengajuan</CardTitle>
            <form method="get" className="flex items-center gap-2">
              <Pilihan name="status" defaultValue={status ?? ""} className="h-9 w-56">
                <option value="">Semua status</option>
                {SEMUA_STATUS.map((s) => (
                  <option key={s} value={s}>
                    {LABEL_STATUS_CUTI[s]}
                  </option>
                ))}
              </Pilihan>
              <Button type="submit" variant="outline" size="sm" className="h-9 bg-white/70">
                Terapkan
              </Button>
            </form>
          </CardHeader>
          <CardContent className="px-0">
            <ul className="divide-y divide-sky-100">
              {semua.length === 0 && <li className="px-4 py-8 text-center text-sm text-slate-600">Belum ada pengajuan.</li>}
              {semua.map((p) => (
                <li key={p.id}>
                  <Link href={`/cuti/${p.id}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 hover:bg-sky-50/70">
                    <span className="min-w-0">
                      <span className="block font-medium text-judul">{namaLengkap(p.pegawai)}</span>
                      <span className="block text-xs text-slate-600">
                        {p.jenisCuti.nama} · {formatTanggal(p.tanggalMulai)} – {formatTanggal(p.tanggalSelesai)} · {p.jumlahHari} hari
                      </span>
                    </span>
                    <LencanaStatusCuti status={p.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
