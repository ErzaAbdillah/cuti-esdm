import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { LencanaStatusCuti } from "@/components/umum/lencana";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { saldoTersedia, totalHak } from "@/lib/domain/saldo-cuti";
import { formatTanggal, formatTanggalJam } from "@/lib/tanggal";
import { wajibPeran } from "@/server/auth/pengguna";
import { dataCutiSaya } from "@/server/kueri/cuti";

export const metadata: Metadata = { title: "Cuti Saya" };

export default async function CutiSaya() {
  const u = await wajibPeran("PEGAWAI");
  const d = await dataCutiSaya(u.pegawai!.id);

  const kotak = d.saldo
    ? [
        ["Tersedia", saldoTersedia(d.saldo, d.dipesan)],
        ["Hak tahun ini", d.saldo.hakTahunIni],
        ["Sisa N-1 / N-2", `${d.saldo.sisaN1} / ${d.saldo.sisaN2}`],
        ["Terpakai", d.saldo.terpakai],
        ["Sedang diproses", d.dipesan],
      ]
    : [];

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-judul">Cuti Saya</h1>
          <p className="text-sm text-slate-700">
            Saldo cuti tahunan {d.tahun}
            {d.saldo && ` · total hak ${totalHak(d.saldo)} hari kerja`}
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/cuti/ajukan">
            <PlusIcon data-icon="inline-start" /> Ajukan cuti
          </Link>
        </Button>
      </div>

      {d.saldo ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {kotak.map(([k, v], i) => (
            <div key={k} className={i === 0 ? "kaca col-span-2 rounded-xl p-4 sm:col-span-1" : "kaca rounded-xl p-4"}>
              <p className="text-xs text-slate-600">{k}</p>
              <p className={i === 0 ? "text-3xl font-bold text-judul" : "text-2xl font-bold text-judul"}>{v}</p>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-sm text-slate-700">Saldo cuti tahunan {d.tahun} belum diatur Kepegawaian.</CardContent>
        </Card>
      )}

      <Card className="py-0">
        <ul className="divide-y divide-sky-100">
          {d.pengajuan.length === 0 && <li className="px-4 py-10 text-center text-slate-600">Belum ada pengajuan cuti.</li>}
          {d.pengajuan.map((p) => (
            <li key={p.id}>
              <Link href={`/cuti/${p.id}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-sky-50/70">
                <span className="min-w-0">
                  <span className="block font-semibold text-judul">{p.jenisCuti.nama}</span>
                  <span className="block text-sm text-slate-700">
                    {formatTanggal(p.tanggalMulai)} – {formatTanggal(p.tanggalSelesai)} · {p.jumlahHari} hari
                  </span>
                  <span className="block text-xs text-slate-500">Diajukan {formatTanggalJam(p.dibuatPada)}</span>
                </span>
                <LencanaStatusCuti status={p.status} />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
