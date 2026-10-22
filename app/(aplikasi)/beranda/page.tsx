import {
  ArrowRightIcon,
  CalendarCheckIcon,
  FileTextIcon,
  PlaneIcon,
  StampIcon,
  TriangleAlertIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saldoTersedia, totalHak } from "@/lib/domain/saldo-cuti";
import { LABEL_STATUS_ABSEN, LABEL_STATUS_CUTI, WARNA_STATUS_ABSEN, WARNA_STATUS_CUTI } from "@/lib/label";
import { formatJam, formatTanggal, formatTanggalJam, ZONA_WAKTU } from "@/lib/tanggal";
import { cn } from "@/lib/utils";
import { wajibLogin } from "@/server/auth/pengguna";
import { dataBeranda } from "@/server/kueri/beranda";

export const metadata: Metadata = { title: "Beranda" };

function salam(): string {
  const jam = Number(new Intl.DateTimeFormat("en-GB", { timeZone: ZONA_WAKTU, hour: "2-digit", hour12: false }).format(new Date()));
  if (jam < 11) return "Selamat pagi";
  if (jam < 15) return "Selamat siang";
  if (jam < 18) return "Selamat sore";
  return "Selamat malam";
}

function Kartu({ judul, ikon, children, aksi }: { judul: string; ikon: ReactNode; children: ReactNode; aksi?: ReactNode }) {
  return (
    <Card className="gap-3">
      <CardHeader className="flex flex-row items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-primary [&_svg]:size-5">{ikon}</span>
        <CardTitle className="text-base font-semibold text-judul">{judul}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="flex-1">{children}</div>
        {aksi}
      </CardContent>
    </Card>
  );
}

function Lencana({ className, children }: { className: string; children: ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", className)}>{children}</span>;
}

export default async function Beranda() {
  const u = await wajibLogin();
  const d = await dataBeranda(u);
  const nama = u.pegawai?.namaLengkap ?? u.loginId;
  const akhirPekan = [0, 6].includes(d.hariIni.getUTCDay());

  return (
    <div className="grid gap-6">
      <section>
        <p className="text-sm font-medium text-slate-600">{formatTanggal(d.hariIni, { hari: true })}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-judul sm:text-3xl">
          {salam()}, {nama.split(",")[0]}
        </h1>
        {u.pegawai && (
          <p className="mt-1 text-sm text-slate-700">
            {u.pegawai.jabatan} · {u.pegawai.unit}
          </p>
        )}
      </section>

      {d.pengaturanKosong.length > 0 && (
        <Alert className="border-emas bg-amber-50">
          <TriangleAlertIcon className="text-amber-700" />
          <AlertTitle className="text-amber-950">Pengaturan absen belum lengkap [ISI]</AlertTitle>
          <AlertDescription className="text-amber-950">
            {d.pengaturanKosong.join(", ")} belum diisi. Selama kosong, status Terlambat dan Alpa tidak dihitung.{" "}
            <Link href="/admin/pengaturan" className="font-semibold underline underline-offset-4">
              Buka pengaturan
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {u.pegawai && (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ringkasan saya">
          <Kartu judul="Absen hari ini" ikon={<CalendarCheckIcon />}
            aksi={!d.absen && !d.libur && !akhirPekan ? (
              <Button asChild variant="penting" size="lg" className="w-full">
                <Link href="/absen">Absen Masuk</Link>
              </Button>
            ) : undefined}
          >
            {d.libur ? (
              <p className="text-sm text-slate-700">Hari libur: {d.libur.nama}</p>
            ) : akhirPekan ? (
              <p className="text-sm text-slate-700">Akhir pekan — tidak ada absen.</p>
            ) : d.absen ? (
              <div className="grid gap-1">
                <Lencana className={WARNA_STATUS_ABSEN[d.absen.status]}>{LABEL_STATUS_ABSEN[d.absen.status]}</Lencana>
                {d.absen.jamMasuk && <p className="text-2xl font-bold text-judul">{formatJam(d.absen.jamMasuk)} <span className="text-sm font-medium text-slate-600">WITA</span></p>}
              </div>
            ) : (
              <p className="text-sm text-slate-700">Anda belum absen masuk hari ini.</p>
            )}
          </Kartu>

          <Kartu judul={`Saldo cuti tahunan ${d.tahun}`} ikon={<WalletIcon />}
            aksi={<Button asChild variant="outline" className="w-full bg-white/70"><Link href="/cuti">Lihat cuti saya <ArrowRightIcon data-icon="inline-end" /></Link></Button>}
          >
            {d.saldo ? (
              <div>
                <p className="text-3xl font-bold text-judul">
                  {saldoTersedia(d.saldo, d.dipesan)} <span className="text-base font-medium text-slate-600">hari tersedia</span>
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Hak {totalHak(d.saldo)} hari (N-2: {d.saldo.sisaN2}, N-1: {d.saldo.sisaN1}, {d.tahun}: {d.saldo.hakTahunIni}) · terpakai {d.saldo.terpakai}
                  {d.dipesan > 0 && ` · diproses ${d.dipesan}`}
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-700">Saldo cuti belum diatur Kepegawaian.</p>
            )}
          </Kartu>

          <Kartu judul="Pengajuan cuti" ikon={<PlaneIcon />}
            aksi={<Button asChild className="w-full"><Link href="/cuti/ajukan">Ajukan cuti</Link></Button>}
          >
            {d.pengajuan.length === 0 ? (
              <p className="text-sm text-slate-700">Belum ada pengajuan.</p>
            ) : (
              <ul className="grid gap-2">
                {d.pengajuan.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-2 text-sm">
                    <Link href={`/cuti/${p.id}`} className="min-w-0 hover:underline">
                      <span className="block truncate font-medium text-judul">{p.jenisCuti.nama}</span>
                      <span className="block text-xs text-slate-600">{formatTanggal(p.tanggalMulai)} · {p.jumlahHari} hari</span>
                    </Link>
                    <Lencana className={WARNA_STATUS_CUTI[p.status]}>{LABEL_STATUS_CUTI[p.status]}</Lencana>
                  </li>
                ))}
              </ul>
            )}
          </Kartu>

          <Kartu judul="Dokumen terbaru" ikon={<FileTextIcon />}
            aksi={<Button asChild variant="outline" className="w-full bg-white/70"><Link href="/dokumen">Ruang dokumen <ArrowRightIcon data-icon="inline-end" /></Link></Button>}
          >
            {d.dokumen.length === 0 ? (
              <p className="text-sm text-slate-700">Belum ada dokumen yang diunggah.</p>
            ) : (
              <ul className="grid gap-1.5 text-sm">
                {d.dokumen.map((dok) => (
                  <li key={dok.id} className="truncate">
                    <span className="font-medium text-judul">{dok.namaTampilan}</span>
                    <span className="block text-xs text-slate-600">{formatTanggalJam(dok.diunggahPada)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Kartu>
        </section>
      )}

      {(d.atasan !== null || d.kepegawaian) && (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Tugas saya">
          {d.atasan !== null && (
            <Kartu judul="Menunggu persetujuan Anda" ikon={<StampIcon />}
              aksi={<Button asChild variant="outline" className="w-full bg-white/70"><Link href="/cuti/proses">Buka antrean <ArrowRightIcon data-icon="inline-end" /></Link></Button>}
            >
              <p className="text-3xl font-bold text-judul">{d.atasan} <span className="text-base font-medium text-slate-600">pengajuan bawahan</span></p>
            </Kartu>
          )}
          {d.kepegawaian && (
            <>
              <Kartu judul="Menunggu verifikasi" ikon={<StampIcon />}
                aksi={<Button asChild variant="outline" className="w-full bg-white/70"><Link href="/cuti/proses">Buka antrean <ArrowRightIcon data-icon="inline-end" /></Link></Button>}
              >
                <p className="text-3xl font-bold text-judul">{d.kepegawaian.menungguVerifikasi} <span className="text-base font-medium text-slate-600">pengajuan</span></p>
              </Kartu>
              <Kartu judul="Kehadiran hari ini" ikon={<UsersIcon />}
                aksi={<Button asChild variant="outline" className="w-full bg-white/70"><Link href="/absen/daftar-hadir">Daftar hadir <ArrowRightIcon data-icon="inline-end" /></Link></Button>}
              >
                <p className="text-3xl font-bold text-judul">
                  {d.kepegawaian.hadir} <span className="text-base font-medium text-slate-600">dari {d.kepegawaian.jumlahPegawai} pegawai</span>
                </p>
              </Kartu>
            </>
          )}
        </section>
      )}
    </div>
  );
}
