import {
  ArrowRightIcon,
  CalendarCheck2Icon,
  CalendarDaysIcon,
  ClockIcon,
  FileTextIcon,
  LayersIcon,
  PlaneIcon,
  PlusIcon,
  ShieldCheckIcon,
  StampIcon,
  TableIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { FilterTahunBeranda } from "@/components/beranda/filter-tahun";
import {
  GrafikBatangBulanan,
  GrafikDonatKomposisi,
  GrafikTrenPengajuanDinas,
  GrafikTrenSaldo,
} from "@/components/beranda/grafik-beranda";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NAMA_BULAN_SINGKAT } from "@/lib/domain/beranda-analitik";
import type { JenisHariLibur } from "@/lib/generated/prisma/enums";
import { LABEL_STATUS_CUTI, WARNA_STATUS_CUTI } from "@/lib/label";
import { LABEL_PERAN } from "@/lib/peran";
import { formatTanggal, formatTanggalJam, ZONA_WAKTU } from "@/lib/tanggal";
import { cn } from "@/lib/utils";
import { wajibLogin } from "@/server/auth/pengguna";
import { dataBeranda, type ItemHariLiburBeranda, type ItemPengajuanBeranda } from "@/server/kueri/beranda";

export const metadata: Metadata = { title: "Beranda" };

const LABEL_JENIS_LIBUR: Record<JenisHariLibur, string> = {
  LIBUR_NASIONAL: "Libur Nasional",
  CUTI_BERSAMA: "Cuti Bersama",
  LIBUR_DAERAH: "Libur Daerah",
};

const WARNA_JENIS_LIBUR: Record<JenisHariLibur, string> = {
  LIBUR_NASIONAL: "bg-red-100 text-red-900",
  CUTI_BERSAMA: "bg-amber-100 text-amber-900",
  LIBUR_DAERAH: "bg-sky-100 text-sky-900",
};

function salam(): string {
  const jam = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: ZONA_WAKTU, hour: "2-digit", hour12: false }).format(new Date()),
  );
  if (jam < 11) return "Selamat pagi";
  if (jam < 15) return "Selamat siang";
  if (jam < 18) return "Selamat sore";
  return "Selamat malam";
}

function Lencana({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", className)}>
      {children}
    </span>
  );
}

function KartuRingkasan({
  label,
  angka,
  satuan,
  keterangan,
  ikon,
  tautan,
}: {
  label: string;
  angka: number;
  satuan: string;
  keterangan: ReactNode;
  ikon: ReactNode;
  tautan?: { href: string; teks: string };
}) {
  return (
    <Card className="justify-between gap-3">
      <CardContent className="flex flex-1 flex-col justify-between gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1.5 text-3xl font-bold tracking-tight text-judul">
              {angka} <span className="text-sm font-medium text-muted-foreground">{satuan}</span>
            </p>
          </div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-primary [&_svg]:size-5">
            {ikon}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="min-w-0 flex-1">{keterangan}</div>
          {tautan && (
            <Link
              href={tautan.href}
              className="inline-flex shrink-0 items-center gap-1 font-semibold text-judul hover:underline"
            >
              {tautan.teks} <ArrowRightIcon className="size-3.5" aria-hidden />
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function KartuAgendaLibur({
  hariLibur,
  tahun,
  tahunSekarang,
}: {
  hariLibur: readonly ItemHariLiburBeranda[];
  tahun: number;
  tahunSekarang: number;
}) {
  return (
    <Card className="gap-3">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-primary">
            <CalendarDaysIcon className="size-4" aria-hidden />
          </span>
          <CardTitle className="text-base font-semibold text-judul">
            {tahun === tahunSekarang ? "Hari Libur Terdekat" : `Hari Libur ${tahun}`}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {hariLibur.length === 0 ? (
          <div className="flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 px-4 py-5 text-center">
            <p className="text-sm font-medium text-judul">Belum ada jadwal libur terdaftar</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Jadwal hari libur nasional &amp; cuti bersama akan muncul setelah diisi Admin.
            </p>
          </div>
        ) : (
          <ul className="grid gap-2.5">
            {hariLibur.map((h) => {
              const tgl = String(h.tanggal.getUTCDate()).padStart(2, "0");
              const bln = NAMA_BULAN_SINGKAT[h.tanggal.getUTCMonth()];
              return (
                <li
                  key={h.id}
                  className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/35 p-2.5"
                >
                  <div className="flex w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-card py-1 text-center ring-1 ring-border">
                    <span className="text-base font-bold leading-none text-judul">{tgl}</span>
                    <span className="mt-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                      {bln}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-judul">{h.nama}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Lencana className={WARNA_JENIS_LIBUR[h.jenis]}>{LABEL_JENIS_LIBUR[h.jenis]}</Lencana>
                      <span className="text-[0.7rem] text-muted-foreground">
                        {formatTanggal(h.tanggal, { hari: true }).split(",")[0]}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function KartuRiwayatPengajuan({
  judul,
  pengajuan,
  hrefSemua,
  teksKosong,
}: {
  judul: string;
  pengajuan: readonly ItemPengajuanBeranda[];
  hrefSemua: string;
  teksKosong: string;
}) {
  return (
    <Card className="gap-3">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-primary">
            <PlaneIcon className="size-4" aria-hidden />
          </span>
          <CardTitle className="text-base font-semibold text-judul">{judul}</CardTitle>
        </div>
        <Link
          href={hrefSemua}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-judul hover:underline"
        >
          Lihat Semua <ArrowRightIcon className="size-3.5" aria-hidden />
        </Link>
      </CardHeader>
      <CardContent className="flex-1">
        {pengajuan.length === 0 ? (
          <div className="flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 px-4 py-5 text-center">
            <p className="text-sm font-medium text-judul">{teksKosong}</p>
          </div>
        ) : (
          <ul className="grid gap-2.5">
            {pengajuan.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/cuti/${p.id}`}
                  className="flex items-start justify-between gap-2 rounded-xl border border-border/70 bg-muted/35 p-2.5 transition-colors hover:bg-accent/70"
                >
                  <div className="min-w-0">
                    {p.namaPegawai && (
                      <span className="block truncate text-xs font-semibold text-muted-foreground">
                        {p.namaPegawai}
                      </span>
                    )}
                    <span className="block truncate text-sm font-semibold text-judul">{p.jenisCuti.nama}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {formatTanggal(p.tanggalMulai)} · {p.jumlahHari} hari
                    </span>
                  </div>
                  <Lencana className={WARNA_STATUS_CUTI[p.status]}>{LABEL_STATUS_CUTI[p.status]}</Lencana>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default async function Beranda({ searchParams }: PageProps<"/beranda">) {
  const u = await wajibLogin();
  const sp = await searchParams;
  const tahunParam = typeof sp.tahun === "string" ? sp.tahun : undefined;
  const d = await dataBeranda(u, tahunParam);

  const nama = u.pegawai?.namaLengkap ?? u.loginId;
  const subJudul = u.pegawai
    ? [u.pegawai.jabatan, u.pegawai.unit].filter(Boolean).join(" · ")
    : [...u.peran].map((p) => LABEL_PERAN[p]).join(", ");

  const tombolUtamaHref =
    d.mode === "pegawai" ? "/cuti/ajukan" : d.izin.prosesCuti ? "/cuti/proses" : "/admin";
  const tombolUtamaLabel =
    d.mode === "pegawai" ? "Ajukan Cuti" : d.izin.prosesCuti ? "Proses Cuti" : "Pengaturan Admin";

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6">
      {/* Baris 0 — Header Sambutan + Filter Tahun + Tombol Cepat */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{formatTanggal(d.hariIni, { hari: true })}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-judul sm:text-3xl">
            {salam()}, {nama.split(",")[0]}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{subJudul}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterTahunBeranda tahun={d.tahun} daftarTahun={d.tahunTersedia} />
          <Button asChild>
            <Link href={tombolUtamaHref}>
              {d.mode === "pegawai" ? (
                <PlusIcon data-icon="inline-start" aria-hidden />
              ) : (
                <StampIcon data-icon="inline-start" aria-hidden />
              )}
              {tombolUtamaLabel}
            </Link>
          </Button>
        </div>
      </section>

      {d.mode === "pegawai" ? (
        <>
          {/* Baris 1 — 4 Kartu Ringkasan Angka (Mode Pegawai) */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ringkasan cuti saya">
            {/* Kartu 1 Solid Utama (tanpa .kaca agar selalu solid primary di semua 4 tema) */}
            <div className="flex flex-col justify-between gap-3 rounded-xl border border-primary/20 bg-primary p-4 text-primary-foreground shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary-foreground/80">
                    Sisa Cuti Tersedia
                  </p>
                  <p className="mt-1.5 text-3xl font-bold tracking-tight">
                    {d.analitik.ringkasan.tersedia}{" "}
                    <span className="text-sm font-medium text-primary-foreground/80">hari</span>
                  </p>
                </div>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15 text-primary-foreground">
                  <WalletIcon className="size-5" aria-hidden />
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-xs text-primary-foreground/85">
                <span className="min-w-0 leading-snug">
                  {d.saldo
                    ? `Dari total hak ${d.analitik.ringkasan.totalHak} hari (${d.tahun})`
                    : `Saldo ${d.tahun} belum diatur`}
                </span>
                <Link
                  href="/cuti"
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-foreground/15 px-2.5 py-1 font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/25"
                >
                  Rincian <ArrowRightIcon className="size-3" aria-hidden />
                </Link>
              </div>
            </div>

            <KartuRingkasan
              label={`Cuti Terpakai (${d.tahun})`}
              angka={d.analitik.ringkasan.terpakai}
              satuan="hari"
              ikon={<CalendarCheck2Icon aria-hidden />}
              keterangan={
                <div className="grid gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span>{d.analitik.ringkasan.persenTerpakai}% dari hak tahunan</span>
                    {d.analitik.ringkasan.terpakaiAwalImpor > 0 && (
                      <span>+{d.analitik.ringkasan.terpakaiAwalImpor} awal</span>
                    )}
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${d.analitik.ringkasan.persenTerpakai}%` }}
                    />
                  </div>
                </div>
              }
            />

            <KartuRingkasan
              label="Sedang Diproses"
              angka={d.analitik.ringkasan.dipesan}
              satuan="hari"
              ikon={<ClockIcon aria-hidden />}
              keterangan={
                d.analitik.ringkasan.totalPengajuanDiproses > 0
                  ? `${d.analitik.ringkasan.totalPengajuanDiproses} pengajuan menunggu selesai`
                  : "Tidak ada pengajuan tertunda"
              }
              tautan={{ href: "/cuti", teks: "Cuti Saya" }}
            />

            {d.menunggu !== null || d.sedangCuti !== null ? (
              <KartuRingkasan
                label="Tugas & Pantauan"
                angka={d.menunggu ?? d.sedangCuti ?? 0}
                satuan={d.menunggu !== null ? "menunggu" : "cuti hari ini"}
                ikon={<StampIcon aria-hidden />}
                keterangan={
                  d.menunggu !== null && d.sedangCuti !== null
                    ? `${d.sedangCuti} pegawai sedang cuti hari ini`
                    : d.menunggu !== null
                      ? "Antrean persetujuan Anda"
                      : "Pegawai sedang menjalani cuti"
                }
                tautan={{
                  href: d.menunggu !== null ? "/cuti/proses" : "/cuti/saldo",
                  teks: d.menunggu !== null ? "Buka Antrean" : "Lihat Rekap",
                }}
              />
            ) : (
              <KartuRingkasan
                label={`Cuti Lainnya (${d.tahun})`}
                angka={d.analitik.ringkasan.cutiLainnyaHari}
                satuan="hari"
                ikon={<LayersIcon aria-hidden />}
                keterangan="Sakit, Alasan Penting, Melahirkan, dll. (disetujui)"
              />
            )}
          </section>

          {/* Baris 2 — 3 Grafik Analitik SVG Interaktif (Mode Pegawai) */}
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12" aria-label="Grafik analitik cuti">
            <Card className="gap-3 md:col-span-2 xl:col-span-5">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-judul">
                  Penggunaan Cuti per Bulan ({d.tahun})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <GrafikBatangBulanan
                  data={d.analitik.bulanan}
                  tahun={d.tahun}
                  terpakaiAwalImpor={d.analitik.ringkasan.terpakaiAwalImpor}
                />
              </CardContent>
            </Card>

            <Card className="gap-3 xl:col-span-4">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-judul">
                  Tren Sisa Saldo ({d.tahun})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <GrafikTrenSaldo
                  data={d.analitik.trenSaldo}
                  tahun={d.tahun}
                  punyaSaldo={d.saldo !== null}
                  dipesan={d.dipesan}
                />
              </CardContent>
            </Card>

            <Card className="gap-3 xl:col-span-3">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-judul">Komposisi Jatah Cuti</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <GrafikDonatKomposisi
                  segmen={d.analitik.komposisiKuota}
                  totalPusat={d.analitik.ringkasan.totalHak}
                  labelPusat="Total Hak"
                  satuan="hari"
                  labelKosong={`Belum ada kuota cuti tahun ${d.tahun}`}
                />
              </CardContent>
            </Card>
          </section>

          {/* Baris 3 — 3 Kartu Daftar Bawah (Mode Pegawai) */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3" aria-label="Riwayat, kuota, dan jadwal libur">
            <KartuRiwayatPengajuan
              judul="Riwayat Pengajuan Terbaru"
              pengajuan={d.pengajuanTerbaru}
              hrefSemua="/cuti"
              teksKosong="Belum ada pengajuan cuti."
            />

            {/* Kartu Rincian Kuota 3 Tahun + 3 Dokumen Terbaru */}
            <Card className="gap-4">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-primary">
                    <FileTextIcon className="size-4" aria-hidden />
                  </span>
                  <CardTitle className="text-base font-semibold text-judul">Kuota &amp; Dokumen</CardTitle>
                </div>
                <Link
                  href="/dokumen"
                  className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-judul hover:underline"
                >
                  Dokumen <ArrowRightIcon className="size-3.5" aria-hidden />
                </Link>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <div className="grid gap-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Rincian Kuota 3 Tahun ({d.tahun - 2}–{d.tahun})
                  </p>
                  {d.analitik.rincianKuota.map((k) => {
                    const persenSisa =
                      k.hak > 0 ? Math.min(100, Math.max(0, Math.round((k.sisa / k.hak) * 100))) : 0;
                    return (
                      <div key={k.tahun} className="grid gap-1">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-medium text-foreground">{k.label}</span>
                          <span className="font-semibold text-judul">
                            Sisa {k.sisa} <span className="font-normal text-muted-foreground">/ {k.hak} hari</span>
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${persenSisa}%`,
                              backgroundColor: "var(--chart-1)",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-border pt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Dokumen Pribadi Terbaru
                  </p>
                  {d.dokumenTerbaru.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Belum ada dokumen pribadi yang diunggah.</p>
                  ) : (
                    <ul className="grid gap-2">
                      {d.dokumenTerbaru.map((dok) => (
                        <li key={dok.id} className="min-w-0">
                          <a
                            href={`/api/dokumen/${dok.id}/berkas`}
                            target="_blank"
                            rel="noopener"
                            className="block truncate text-sm font-medium text-judul hover:underline"
                          >
                            {dok.namaTampilan}
                          </a>
                          <span className="block text-[0.72rem] text-muted-foreground">
                            {formatTanggalJam(dok.diunggahPada)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>

            <KartuAgendaLibur hariLibur={d.hariLibur} tahun={d.tahun} tahunSekarang={d.tahunSekarang} />
          </section>
        </>
      ) : (
        <>
          {/* Baris 1 — 4 Kartu Ringkasan Angka (Mode Admin Tanpa Data Pegawai) */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ringkasan dinas">
            <div className="flex flex-col justify-between gap-3 rounded-xl border border-primary/20 bg-primary p-4 text-primary-foreground shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary-foreground/80">
                    Menunggu Tindakan
                  </p>
                  <p className="mt-1.5 text-3xl font-bold tracking-tight">
                    {d.menunggu}{" "}
                    <span className="text-sm font-medium text-primary-foreground/80">pengajuan</span>
                  </p>
                </div>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15 text-primary-foreground">
                  <StampIcon className="size-5" aria-hidden />
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-xs text-primary-foreground/85">
                <span className="min-w-0 leading-snug">Antrean verifikasi &amp; persetujuan dinas</span>
                {d.izin.prosesCuti && (
                  <Link
                    href="/cuti/proses"
                    className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-foreground/15 px-2.5 py-1 font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/25"
                  >
                    Buka <ArrowRightIcon className="size-3" aria-hidden />
                  </Link>
                )}
              </div>
            </div>

            <KartuRingkasan
              label="Sedang Cuti Hari Ini"
              angka={d.sedangCuti}
              satuan="pegawai"
              ikon={<UsersIcon aria-hidden />}
              keterangan="Pegawai aktif yang sedang menjalani cuti hari ini"
              tautan={d.izin.kelolaSaldo ? { href: "/cuti/saldo", teks: "Rekap" } : undefined}
            />

            <KartuRingkasan
              label={`Pengajuan Tahun ${d.tahun}`}
              angka={d.analitikDinas.totalPengajuan}
              satuan="pengajuan"
              ikon={<PlaneIcon aria-hidden />}
              keterangan={`Total ${d.analitikDinas.totalHariDisetujui} hari cuti disetujui`}
              tautan={d.izin.prosesCuti ? { href: "/cuti/proses", teks: "Proses" } : undefined}
            />

            <KartuRingkasan
              label="Pegawai Aktif"
              angka={d.totalPegawaiAktif ?? 0}
              satuan="pegawai"
              ikon={<ShieldCheckIcon aria-hidden />}
              keterangan={
                d.totalAkunAktif !== null ? `${d.totalAkunAktif} akun login aktif di sistem` : "Data pegawai terdaftar"
              }
              tautan={d.izin.kelolaPegawai ? { href: "/pegawai", teks: "Data Pegawai" } : undefined}
            />
          </section>

          {/* Baris 2 — 3 Grafik Analitik SVG Interaktif (Mode Admin) */}
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12" aria-label="Grafik analitik dinas">
            <Card className="gap-3 md:col-span-2 xl:col-span-5">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-judul">
                  Hari Cuti Pegawai per Bulan ({d.tahun})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <GrafikBatangBulanan
                  data={d.analitikDinas.bulananHari}
                  tahun={d.tahun}
                  labelKosong={`Belum ada hari cuti disetujui pada tahun ${d.tahun}`}
                />
              </CardContent>
            </Card>

            <Card className="gap-3 xl:col-span-4">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-judul">
                  Tren Pengajuan Masuk ({d.tahun})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <GrafikTrenPengajuanDinas data={d.analitikDinas.bulananPengajuan} tahun={d.tahun} />
              </CardContent>
            </Card>

            <Card className="gap-3 xl:col-span-3">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-judul">Status Pengajuan ({d.tahun})</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <GrafikDonatKomposisi
                  segmen={d.analitikDinas.komposisiStatus}
                  totalPusat={d.analitikDinas.totalPengajuan}
                  labelPusat="Pengajuan"
                  satuan="pengajuan"
                  labelKosong={`Belum ada pengajuan di tahun ${d.tahun}`}
                />
              </CardContent>
            </Card>
          </section>

          {/* Baris 3 — 3 Kartu Daftar Bawah (Mode Admin) */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3" aria-label="Pengajuan dinas, pintasan, dan jadwal libur">
            <KartuRiwayatPengajuan
              judul="Pengajuan Cuti Terbaru"
              pengajuan={d.pengajuanTerbaruDinas}
              hrefSemua={d.izin.prosesCuti ? "/cuti/proses" : "/cuti/saldo"}
              teksKosong="Belum ada pengajuan cuti pegawai."
            />

            {/* Pintasan Cepat Admin */}
            <Card className="gap-3">
              <CardHeader className="flex flex-row items-center gap-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-primary">
                  <ShieldCheckIcon className="size-4" aria-hidden />
                </span>
                <CardTitle className="text-base font-semibold text-judul">Pintasan Cepat Admin</CardTitle>
              </CardHeader>
              <CardContent className="grid flex-1 content-start gap-2">
                {d.izin.pengaturanAdmin && (
                  <Link
                    href="/admin/hak-akses"
                    className="kartu-abu flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm font-medium text-judul"
                  >
                    <span className="flex items-center gap-2.5">
                      <ShieldCheckIcon className="size-4 text-primary" aria-hidden />
                      Matriks Hak Akses Pegawai
                    </span>
                    <ArrowRightIcon className="size-4 text-muted-foreground" aria-hidden />
                  </Link>
                )}
                {d.izin.kelolaSaldo && (
                  <Link
                    href="/cuti/saldo"
                    className="kartu-abu flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm font-medium text-judul"
                  >
                    <span className="flex items-center gap-2.5">
                      <TableIcon className="size-4 text-primary" aria-hidden />
                      Saldo &amp; Rekap Cuti Tahunan
                    </span>
                    <ArrowRightIcon className="size-4 text-muted-foreground" aria-hidden />
                  </Link>
                )}
                {d.izin.kelolaPegawai && (
                  <Link
                    href="/pegawai"
                    className="kartu-abu flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm font-medium text-judul"
                  >
                    <span className="flex items-center gap-2.5">
                      <UsersIcon className="size-4 text-primary" aria-hidden />
                      Kelola Data Pegawai
                    </span>
                    <ArrowRightIcon className="size-4 text-muted-foreground" aria-hidden />
                  </Link>
                )}
                {d.izin.pengaturanAdmin && (
                  <Link
                    href="/admin/hari-libur"
                    className="kartu-abu flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm font-medium text-judul"
                  >
                    <span className="flex items-center gap-2.5">
                      <CalendarDaysIcon className="size-4 text-primary" aria-hidden />
                      Atur Hari Libur &amp; Cuti Bersama
                    </span>
                    <ArrowRightIcon className="size-4 text-muted-foreground" aria-hidden />
                  </Link>
                )}
              </CardContent>
            </Card>

            <KartuAgendaLibur hariLibur={d.hariLibur} tahun={d.tahun} tahunSekarang={d.tahunSekarang} />
          </section>
        </>
      )}
    </div>
  );
}
