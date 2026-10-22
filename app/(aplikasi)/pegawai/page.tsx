import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, FileSpreadsheetIcon, PrinterIcon, UploadIcon, UserPlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FilterPegawaiForm } from "@/components/pegawai/filter-pegawai";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LABEL_STATUS_KEPEGAWAIAN } from "@/lib/domain/pegawai";
import { LABEL_LEVEL_SURAT } from "@/lib/label";
import { queryString } from "@/lib/url";
import { cn } from "@/lib/utils";
import { punyaPeran, wajibPeran } from "@/server/auth/pengguna";
import { bacaFilter, daftarPegawai, type FilterPegawai, opsiPegawai, PER_HALAMAN } from "@/server/kueri/pegawai";

export const metadata: Metadata = { title: "Data Pegawai" };

function paramFilter(f: FilterPegawai, ubah: Partial<FilterPegawai> = {}) {
  const g = { ...f, ...ubah };
  return {
    q: g.q,
    unit: g.unit,
    jabatan: g.jabatan,
    level: g.level,
    pangkat: g.pangkat,
    status: g.status,
    aktif: g.aktif === "ya" ? undefined : g.aktif,
    urut: g.urut === "nama" ? undefined : g.urut,
    arah: g.arah === "asc" ? undefined : g.arah,
    hal: g.hal === 1 ? undefined : g.hal,
  };
}

function KepalaKolom({ f, kolom, children }: { f: FilterPegawai; kolom: FilterPegawai["urut"]; children: React.ReactNode }) {
  const aktif = f.urut === kolom;
  const arahBaru = aktif && f.arah === "asc" ? "desc" : "asc";
  const Ikon = !aktif ? ArrowUpDownIcon : f.arah === "asc" ? ArrowUpIcon : ArrowDownIcon;
  return (
    <th scope="col" aria-sort={aktif ? (f.arah === "asc" ? "ascending" : "descending") : undefined} className="px-3 py-2.5 text-left font-semibold">
      <Link href={`/pegawai${queryString(paramFilter(f, { urut: kolom, arah: arahBaru, hal: 1 }))}`} className="inline-flex items-center gap-1 hover:text-primary">
        {children}
        <Ikon className={cn("size-3.5", !aktif && "opacity-40")} aria-hidden />
      </Link>
    </th>
  );
}

export default async function DaftarPegawai({ searchParams }: PageProps<"/pegawai">) {
  const u = await wajibPeran("KEPEGAWAIAN", "ADMIN");
  const f = bacaFilter(await searchParams);
  const [{ total, baris }, opsi] = await Promise.all([daftarPegawai(f), opsiPegawai()]);
  const jumlahHalaman = Math.max(1, Math.ceil(total / PER_HALAMAN));
  const qsEkspor = queryString({ ...paramFilter(f), hal: undefined });
  const kepegawaian = punyaPeran(u, "KEPEGAWAIAN");

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-judul">Data Pegawai</h1>
          <p className="text-sm text-slate-700">{total} pegawai sesuai filter</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="bg-white/70">
            <a href={`/api/ekspor/pegawai${qsEkspor}`}>
              <FileSpreadsheetIcon data-icon="inline-start" /> Ekspor Excel
            </a>
          </Button>
          {kepegawaian && (
            <Button asChild variant="outline" className="bg-white/70">
              <a href={`/api/ekspor/pegawai${qsEkspor}${qsEkspor ? "&" : "?"}pribadi=1`} title="Termasuk NIK, alamat, dan nomor HP. Tercatat di audit log.">
                <FileSpreadsheetIcon data-icon="inline-start" /> Ekspor + data pribadi
              </a>
            </Button>
          )}
          <Button asChild variant="outline" className="bg-white/70">
            <a href={`/cetak/pegawai${qsEkspor}`} target="_blank" rel="noopener">
              <PrinterIcon data-icon="inline-start" /> Cetak / PDF
            </a>
          </Button>
          <Button asChild variant="outline" className="bg-white/70">
            <Link href="/pegawai/impor">
              <UploadIcon data-icon="inline-start" /> Impor Excel
            </Link>
          </Button>
          {kepegawaian && (
            <Button asChild>
              <Link href="/pegawai/baru">
                <UserPlusIcon data-icon="inline-start" /> Tambah pegawai
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent>
          <FilterPegawaiForm f={f} opsi={opsi} />
        </CardContent>
      </Card>

      <Card className="py-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="border-b border-sky-100 bg-sky-50/80 text-judul">
              <tr>
                <KepalaKolom f={f} kolom="nama">Nama</KepalaKolom>
                <KepalaKolom f={f} kolom="nip">NIP / ID</KepalaKolom>
                <KepalaKolom f={f} kolom="jabatan">Jabatan</KepalaKolom>
                <KepalaKolom f={f} kolom="pangkat">Pangkat/Gol.</KepalaKolom>
                <th scope="col" className="px-3 py-2.5 text-left font-semibold">Eselon</th>
                <KepalaKolom f={f} kolom="unit">Unit kerja</KepalaKolom>
                <th scope="col" className="px-3 py-2.5 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-100">
              {baris.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-slate-600">
                    Tidak ada pegawai yang cocok dengan filter.
                  </td>
                </tr>
              )}
              {baris.map((p) => (
                <tr key={p.id} className={cn("hover:bg-sky-50/70", !p.aktif && "text-slate-500")}>
                  <td className="px-3 py-2.5">
                    <Link href={`/pegawai/${p.id}`} className="font-semibold text-judul hover:underline">
                      {p.nama}
                    </Link>
                    {!p.punyaAkun && p.status !== "NON_ASN" && <span className="ml-2 text-xs text-slate-500">(belum aktivasi)</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[0.8rem]">{p.nip ?? p.idNonAsn}</td>
                  <td className="px-3 py-2.5">
                    {p.jabatan}
                    {p.kelas != null && <span className="ml-1 text-xs text-slate-500">(kelas {p.kelas})</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">{p.pangkat}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">{LABEL_LEVEL_SURAT[p.level]}</td>
                  <td className="px-3 py-2.5">{p.unit}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    {LABEL_STATUS_KEPEGAWAIAN[p.status]}
                    {!p.aktif && <span className="ml-1 rounded bg-slate-200 px-1.5 text-xs">nonaktif</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <nav aria-label="Halaman" className="flex flex-wrap items-center justify-between gap-2 border-t border-sky-100 px-3 py-2.5 text-sm">
          <span className="text-slate-600">
            Halaman {Math.min(f.hal, jumlahHalaman)} dari {jumlahHalaman}
          </span>
          <span className="flex gap-2">
            <Button asChild={f.hal > 1} variant="outline" size="sm" disabled={f.hal <= 1} className="bg-white/70">
              {f.hal > 1 ? <Link href={`/pegawai${queryString(paramFilter(f, { hal: f.hal - 1 }))}`}>Sebelumnya</Link> : <span>Sebelumnya</span>}
            </Button>
            <Button asChild={f.hal < jumlahHalaman} variant="outline" size="sm" disabled={f.hal >= jumlahHalaman} className="bg-white/70">
              {f.hal < jumlahHalaman ? <Link href={`/pegawai${queryString(paramFilter(f, { hal: f.hal + 1 }))}`}>Berikutnya</Link> : <span>Berikutnya</span>}
            </Button>
          </span>
        </nav>
      </Card>
    </div>
  );
}
