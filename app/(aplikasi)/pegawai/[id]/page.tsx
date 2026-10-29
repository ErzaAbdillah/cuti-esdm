import { ArrowLeftIcon, CircleCheckIcon, PencilIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AkunPegawai } from "@/components/pegawai/akun-pegawai";
import { DataSensitif } from "@/components/pegawai/data-sensitif";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LABEL_STATUS_KEPEGAWAIAN } from "@/lib/domain/pegawai";
import { saldoTersedia, totalHak } from "@/lib/domain/saldo-cuti";
import { LABEL_LEVEL_SURAT, LABEL_STATUS_CUTI, WARNA_STATUS_CUTI } from "@/lib/label";
import { formatTanggal } from "@/lib/tanggal";
import { cn } from "@/lib/utils";
import { punyaPeran, wajibLogin } from "@/server/auth/pengguna";
import { bolehLihatPegawai, detailPegawai } from "@/server/kueri/pegawai-detail";

export const metadata: Metadata = { title: "Detail Pegawai" };

function Daftar({ baris }: { baris: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-2.5 text-sm">
      {baris.map(([k, v]) => (
        <div key={k} className="grid gap-1 border-b border-sky-50 pb-2 sm:grid-cols-[12rem_1fr]">
          <dt className="text-slate-600">{k}</dt>
          <dd className="font-medium text-slate-900">{v || "-"}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function HalamanDetailPegawai({ params, searchParams }: PageProps<"/pegawai/[id]">) {
  const u = await wajibLogin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  if (!bolehLihatPegawai(u, id)) redirect("/akses-ditolak");
  const p = await detailPegawai(id);
  if (!p) notFound();
  const { disimpan } = await searchParams;

  const kepegawaian = punyaPeran(u, "KEPEGAWAIAN");
  const staf = punyaPeran(u, "KEPEGAWAIAN", "ADMIN");

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {staf && (
            <Link href="/pegawai" className="mb-1 inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <ArrowLeftIcon className="size-4" /> Data Pegawai
            </Link>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-judul">{p.namaLengkap}</h1>
          <p className="text-sm text-slate-700">
            {p.nip ?? p.idNonAsn} · {LABEL_STATUS_KEPEGAWAIAN[p.statusKepegawaian]}
            {!p.aktif && <span className="ml-2 rounded bg-slate-200 px-1.5 text-xs">nonaktif</span>}
          </p>
        </div>
        {kepegawaian && (
          <Button asChild>
            <Link href={`/pegawai/${p.id}/ubah`}>
              <PencilIcon data-icon="inline-start" /> Ubah data
            </Link>
          </Button>
        )}
      </div>

      {disimpan === "1" && (
        <Alert className="border-emerald-300 bg-emerald-50" role="status">
          <CircleCheckIcon className="text-emerald-700" />
          <AlertDescription className="text-emerald-900">Data pegawai tersimpan.</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="identitas">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-white/60 p-1">
          <TabsTrigger value="identitas">Identitas</TabsTrigger>
          <TabsTrigger value="kepegawaian">Kepegawaian</TabsTrigger>
          <TabsTrigger value="cuti">Cuti</TabsTrigger>
          <TabsTrigger value="dokumen">Dokumen</TabsTrigger>
          {staf && <TabsTrigger value="akun">Akun</TabsTrigger>}
        </TabsList>

        <TabsContent value="identitas">
          <Card>
            <CardContent className="grid gap-5">
              <Daftar
                baris={[
                  ["Nama lengkap", p.nama],
                  ["Gelar depan", p.gelarDepan],
                  ["Gelar belakang", p.gelarBelakang],
                  ["NIP / ID Non-ASN", p.nip ?? p.idNonAsn],
                  ["Status kepegawaian", LABEL_STATUS_KEPEGAWAIAN[p.statusKepegawaian]],
                  ["Tempat, tanggal lahir", [p.tempatLahir, p.tanggalLahir ? formatTanggal(p.tanggalLahir) : null].filter(Boolean).join(", ")],
                  ["Jenis kelamin", p.jenisKelamin === "L" ? "Laki-laki" : p.jenisKelamin === "P" ? "Perempuan" : null],
                  ["Pendidikan terakhir", p.pendidikanTerakhir],
                  ["Email", p.email],
                ]}
              />
              <DataSensitif pegawaiId={p.id} samaran={p.samaran} milikSendiri={u.pegawai?.id === p.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kepegawaian">
          <Card>
            <CardContent>
              <Daftar
                baris={[
                  ["Pangkat / golongan", p.pangkat],
                  ["TMT pangkat", p.tmtPangkat ? formatTanggal(p.tmtPangkat) : null],
                  ["Jabatan", p.jabatan],
                  ["TMT jabatan", p.tmtJabatan ? formatTanggal(p.tmtJabatan) : null],
                  ["Kelas jabatan", p.kelas?.toString()],
                  ["Eselon / level surat", `${LABEL_LEVEL_SURAT[p.level]}${p.levelOverride ? " (diatur manual)" : ""}`],
                  ["Unit kerja", p.unit],
                  ["Atasan langsung", p.atasan ? (staf ? <Link href={`/pegawai/${p.atasan.id}`} className="text-primary hover:underline">{p.atasan.nama}</Link> : p.atasan.nama) : null],
                  ["Jabatan atasan", p.atasan?.jabatan],
                  ["Tanggal masuk", p.tanggalMasuk ? formatTanggal(p.tanggalMasuk) : null],
                  ["Status aktif", p.aktif ? "Aktif" : "Nonaktif"],
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cuti">
          <Card>
            <CardContent className="grid gap-5">
              {p.saldo ? (
                <div className="grid gap-3 sm:grid-cols-4">
                  {[
                    ["Tersedia", saldoTersedia(p.saldo)],
                    ["Total hak", totalHak(p.saldo)],
                    ["Terpakai", p.saldo.terpakai],
                    ["Sisa N-1 / N-2", `${p.saldo.sisaN1} / ${p.saldo.sisaN2}`],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-xl bg-sky-50 p-3">
                      <p className="text-xs text-slate-600">{k}</p>
                      <p className="text-2xl font-bold text-judul">{v}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-700">Saldo cuti tahunan {p.tahun} belum diatur.</p>
              )}
              <div>
                <h2 className="mb-2 font-semibold text-judul">Riwayat pengajuan</h2>
                {p.pengajuan.length === 0 ? (
                  <p className="text-sm text-slate-700">Belum ada pengajuan cuti.</p>
                ) : (
                  <ul className="divide-y divide-sky-100 text-sm">
                    {p.pengajuan.map((c) => (
                      <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                        <span>
                          <b className="text-judul">{c.jenisCuti.nama}</b> · {formatTanggal(c.tanggalMulai)} – {formatTanggal(c.tanggalSelesai)} ({c.jumlahHari} hari)
                        </span>
                        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", WARNA_STATUS_CUTI[c.status])}>{LABEL_STATUS_CUTI[c.status]}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dokumen">
          <Card>
            <CardContent className="text-sm text-slate-700">
              {p.jumlahDokumen} dokumen pribadi tersimpan.{" "}
              <Link href={u.pegawai?.id === p.id ? "/dokumen" : `/dokumen?pegawai=${p.id}`} className="font-semibold text-primary hover:underline">
                Buka ruang dokumen
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        {staf && (
          <TabsContent value="akun">
            <Card>
              <CardContent>
                <AkunPegawai
                  pegawaiId={p.id}
                  akun={
                    p.akun && {
                      ...p.akun,
                      terkunci: p.akun.terkunciSampai?.toISOString() ?? null,
                      terakhirLogin: p.akun.terakhirLogin?.toISOString() ?? null,
                    }
                  }
                  kodeAktivasiAktifSampai={p.kodeAktivasiAktifSampai?.toISOString() ?? null}
                  bolehKelolaAkun={punyaPeran(u, "ADMIN")}
                  bolehBuatKode={staf}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
