import { ArrowLeftIcon, ChevronRightIcon, ClipboardListIcon, PencilIcon, PrinterIcon, CircleCheckIcon, FileTextIcon, HourglassIcon, LockIcon, PaperclipIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AksiPengajuan, FormKeputusanEksternal, TerimaFormulir } from "@/components/cuti/aksi-pengajuan";
import { Button } from "@/components/ui/button";
import { LencanaStatusCuti } from "@/components/umum/lencana";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { bisaDibatalkan, bisaDitolak } from "@/lib/domain/alur-cuti";
import { namaLengkap } from "@/lib/domain/pegawai";
import { LABEL_LEVEL_SURAT, LABEL_STATUS_CUTI, LABEL_TAHAP } from "@/lib/label";
import { formatTanggal, formatTanggalJam, hariIniWita } from "@/lib/tanggal";
import { cn } from "@/lib/utils";
import { punyaPeran, wajibLogin } from "@/server/auth/pengguna";
import { bolehLihatPengajuan } from "@/server/layanan/akses-cuti";
import { tahapPengajuan } from "@/server/layanan/cuti";
import { bolehPutuskan, modeTahap } from "@/server/layanan/wewenang-cuti";
import { detailPengajuan } from "@/server/kueri/cuti";
import { daftarSuratPengajuan } from "@/server/kueri/surat";

export const metadata: Metadata = { title: "Detail Cuti" };

function Baris({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 border-b border-sky-50 pb-2 sm:grid-cols-[11rem_1fr]">
      <dt className="text-sm text-slate-600">{k}</dt>
      <dd className="text-sm font-medium text-slate-900">{children || "-"}</dd>
    </div>
  );
}

export default async function DetailCuti({ params, searchParams }: PageProps<"/cuti/[id]">) {
  const u = await wajibLogin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const p = await detailPengajuan(id);
  if (!p) notFound();
  if (!(await bolehLihatPengajuan(u, p))) redirect("/akses-ditolak");
  const { baru } = await searchParams;

  const tahap = await tahapPengajuan(p);
  const eksternal = tahap === "PEJABAT_BERWENANG" && (await modeTahap(p.levelSurat, tahap)) === "EKSTERNAL";
  const pemutus = tahap ? await bolehPutuskan(u, p, tahap) : false;
  const pemohon = u.pegawai?.id === p.pegawaiId;
  const bolehTolak = bisaDitolak(p.status) && !pemohon && (pemutus || punyaPeran(u, "KEPEGAWAIAN"));
  const tujuanEksternal = p.levelSurat === "ESELON_II" ? "Gubernur" : "Kepala BKD";
  const daftarSurat = await daftarSuratPengajuan(p);

  return (
    <div className="grid gap-5">
      <div>
        <Link href={pemohon ? "/cuti" : "/cuti/proses"} className="mb-1 inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeftIcon className="size-4" /> {pemohon ? "Cuti Saya" : "Proses Cuti"}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-judul">{p.jenisCuti.nama}</h1>
          <LencanaStatusCuti status={p.status} />
        </div>
        <p className="text-sm text-slate-700">
          {namaLengkap(p.pegawai)} · {p.pegawai.jabatan?.nama}
        </p>
      </div>

      {baru === "1" && (
        <Alert className="border-emerald-300 bg-emerald-50" role="status">
          <CircleCheckIcon className="text-emerald-700" />
          <AlertDescription className="text-emerald-900">
            Formulir tersimpan. Cetak formulir, mintakan tanda tangan atasan, lalu antar ke Kepegawaian (Sekretariat) untuk cap & tanda tangan.
          </AlertDescription>
        </Alert>
      )}

      {tahap && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-sky-200 bg-white/80 p-4">
          <HourglassIcon className="size-5 text-primary" aria-hidden />
          <p className="flex-1 text-sm text-slate-800">
            Menunggu <b>{LABEL_TAHAP[tahap]}</b>
            {tahap === "ATASAN_LANGSUNG" && p.atasanLangsung && ` — ${namaLengkap(p.atasanLangsung)}`}
            {eksternal && ` — keputusan ${tujuanEksternal}, dicatat Kepegawaian`}
          </p>
          {pemutus && !eksternal && tahap === "PEJABAT_BERWENANG" && daftarSurat[0] && <TerimaFormulir id={p.id} tujuan={`/cuti/${p.id}/surat/${daftarSurat[0].kode}`} />}
          <AksiPengajuan
            id={p.id}
            bolehSetujui={pemutus && !eksternal && tahap !== "PEJABAT_BERWENANG"}
            bolehTolak={bolehTolak}
            bolehBatal={pemohon && bisaDibatalkan(p.status, p.tanggalMulai, hariIniWita())}
          />
        </div>
      )}
      {!tahap && pemohon && bisaDibatalkan(p.status, p.tanggalMulai, hariIniWita()) && (
        <AksiPengajuan id={p.id} bolehSetujui={false} bolehTolak={false} bolehBatal />
      )}
      {eksternal && pemutus && <FormKeputusanEksternal id={p.id} tujuan={tujuanEksternal} />}

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-sky-200 bg-white/80 p-4">
        <ClipboardListIcon className="size-5 text-primary" aria-hidden />
        <p className="flex-1 text-sm text-slate-800">
          <b>Formulir permintaan cuti</b> — dicetak pegawai dan diantar ke Kepegawaian untuk cap & tanda tangan.
        </p>
        <Button asChild variant="outline" className="bg-white">
          <a href={`/cetak/formulir/${p.id}`} target="_blank" rel="noopener">
            <PrinterIcon data-icon="inline-start" /> Cetak formulir
          </a>
        </Button>
        {p.status === "DIAJUKAN" && (pemohon || punyaPeran(u, "KEPEGAWAIAN", "ADMIN")) && (
          <Button asChild variant="outline" className="bg-white">
            <Link href={`/cuti/${p.id}/formulir`}>
              <PencilIcon data-icon="inline-start" /> Ubah formulir
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <Card>
          <CardHeader>
            <CardTitle className="text-judul">Rincian pengajuan</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-2">
              <Baris k="Tanggal">
                {formatTanggal(p.tanggalMulai)} – {formatTanggal(p.tanggalSelesai)}
              </Baris>
              <Baris k="Lama">
                {p.jumlahHari} {p.jenisCuti.satuanHitung === "HARI_KERJA" ? "hari kerja" : "hari kalender"}
              </Baris>
              <Baris k="Alasan">{p.alasan}</Baris>
              <Baris k="Alamat selama cuti">{p.alamatSelamaCuti}</Baris>
              <Baris k="HP selama cuti">{p.noHpSelamaCuti}</Baris>
              <Baris k="Penanggung jawab tugas">{p.penanggungJawab ? namaLengkap(p.penanggungJawab) : null}</Baris>
              <Baris k="Atasan langsung">{p.atasanLangsung ? `${namaLengkap(p.atasanLangsung)} — ${p.atasanLangsung.jabatan?.nama ?? ""}` : "—"}</Baris>
              <Baris k="Level surat">{LABEL_LEVEL_SURAT[p.levelSurat]}</Baris>
              {p.jenisCuti.potongSaldoTahunan && <Baris k="Saldo tahun">{p.tahunSaldo}</Baris>}
            </dl>
            {p.lampiran.length > 0 && (
              <div className="mt-4">
                <h2 className="mb-2 text-sm font-semibold text-judul">Lampiran</h2>
                <ul className="grid gap-1.5">
                  {p.lampiran.map((l) => (
                    <li key={l.id}>
                      <a href={`/api/dokumen/${l.id}/berkas`} target="_blank" rel="noopener" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                        <PaperclipIcon className="size-4" /> {l.namaTampilan}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {daftarSurat.length > 0 && (
              <div className="mt-5">
                <h2 className="mb-2 text-sm font-semibold text-judul">Surat</h2>
                <ul className="grid gap-2">
                  {daftarSurat.map((s) => (
                    <li key={s.kode}>
                      <Link
                        href={`/cuti/${p.id}/surat/${s.kode}`}
                        className="flex items-center gap-3 rounded-lg border border-sky-100 bg-white/70 p-3 hover:border-sky-300 hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        <FileTextIcon className="size-5 shrink-0 text-primary" aria-hidden />
                        <span className="grid flex-1 gap-0.5">
                          <span className="text-sm font-medium text-slate-900">{s.nama}</span>
                          <span className="text-xs text-slate-600">
                            {!s.tersedia
                              ? s.versiTerkunci
                                ? "Arsip — terkunci"
                                : `Bisa disiapkan setelah ${LABEL_STATUS_CUTI[s.sejak]}`
                              : s.versiTerkunci
                                ? `Versi ${s.versiTerkunci.versi} terkunci${s.nomor ? ` · ${s.nomor}` : ""} · dicetak ${s.jumlahCetak}×`
                                : s.versiTerakhir
                                  ? `Draft versi ${s.versiTerakhir.versi}`
                                  : "Belum disiapkan"}
                          </span>
                        </span>
                        {s.versiTerkunci && <LockIcon className="size-4 text-emerald-700" aria-label="Terkunci" />}
                        <ChevronRightIcon className="size-4 text-slate-500" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-judul">Riwayat status</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="relative grid gap-4 border-l-2 border-sky-200 pl-4">
              {p.riwayat.map((r) => (
                <li key={r.id} className="relative">
                  <span className={cn("absolute -left-[1.4rem] top-1 size-3 rounded-full ring-4 ring-white", r.keStatus === "DITOLAK" || r.keStatus === "DIBATALKAN" ? "bg-merah" : "bg-brand")} aria-hidden />
                  <p className="text-sm font-semibold text-judul">{LABEL_STATUS_CUTI[r.keStatus]}</p>
                  <p className="text-xs text-slate-600">
                    {r.oleh ? (r.oleh.pegawai ? namaLengkap(r.oleh.pegawai) : r.oleh.loginId) : "Sistem"} · {formatTanggalJam(r.waktu)}
                  </p>
                  {r.catatan && <p className="mt-1 rounded-md bg-slate-50 px-2 py-1 text-sm text-slate-800">{r.catatan}</p>}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
