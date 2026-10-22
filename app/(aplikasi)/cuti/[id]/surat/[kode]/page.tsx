import { ArrowLeftIcon, DownloadIcon, LockIcon, PrinterIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LembarSurat } from "@/components/surat/lembar-surat";
import { FormSurat } from "@/components/surat/form-surat";
import { PratinjauA4 } from "@/components/surat/pratinjau-a4";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { suratTersedia } from "@/lib/domain/alur-cuti";
import { LABEL_STATUS_CUTI } from "@/lib/label";
import { KUNCI_TERKUNCI } from "@/lib/surat/render";
import { formatTanggalJam } from "@/lib/tanggal";
import { wajibLogin } from "@/server/auth/pengguna";
import { db } from "@/server/db";
import { bolehAturNomorSurat, bolehLihatPengajuan, bolehUbahSurat } from "@/server/layanan/akses-cuti";
import type { SnapshotIdentitas } from "@/server/layanan/cuti";
import { riwayatSurat } from "@/server/kueri/surat";
import { semuaPengaturan, teksPengaturan } from "@/server/pengaturan";
import { draftDariTemplate, identitasDari, kandidatPenandatangan, LOGO_WEB, nilaiPlaceholder, type SnapshotVersi, susunLembar, templateUntuk } from "@/server/surat/data";

export const metadata: Metadata = { title: "Surat Cuti" };

export default async function HalamanSurat({ params }: PageProps<"/cuti/[id]/surat/[kode]">) {
  const u = await wajibLogin();
  const { id, kode } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[A-Z_]{3,40}$/.test(kode)) notFound();
  const p = await db.pengajuanCuti.findUnique({ where: { id }, include: { jenisCuti: true } });
  if (!p) notFound();
  if (!(await bolehLihatPengajuan(u, p))) redirect("/akses-ditolak");
  const t = (await templateUntuk(p)).find((x) => x.kodeDokumen === kode);
  if (!t) notFound();

  const surat = await db.suratCuti.findUnique({
    where: { pengajuanId_kodeDokumen: { pengajuanId: id, kodeDokumen: kode } },
    include: { versi: { orderBy: { versi: "desc" }, take: 1 } },
  });
  const terakhir = surat?.versi[0] ?? null;
  const snapshot = terakhir?.dataSnapshot as unknown as SnapshotVersi | undefined;
  const nilai = nilaiPlaceholder(p);
  const dariTemplate = draftDariTemplate(t, nilai);
  const awal = terakhir && snapshot ? { isiHtml: terakhir.isiHtml, isian: snapshot.isian } : dariTemplate;
  const bolehEdit = bolehUbahSurat(u, p) && suratTersedia(p.status, t.dapatDicetakSejak);
  const riwayat = surat ? await riwayatSurat(surat.id) : [];
  const versiTerkunci = riwayat.find((v) => v.dikunciPada);

  let isi;
  if (bolehEdit) {
    const lembar = await susunLembar({ template: t, pengajuan: p, isiHtml: awal.isiHtml, isian: awal.isian, nomorUrut: surat?.nomorUrut ?? null });
    const tahun = Number(awal.isian.tanggal.slice(0, 4));
    const [klasifikasi, kodeInstansi, peng, maks, kandidat] = await Promise.all([
      teksPengaturan("surat.klasifikasi"),
      teksPengaturan("surat.kode_instansi"),
      semuaPengaturan(),
      db.suratCuti.aggregate({ _max: { nomorUrut: true }, where: { tahun } }),
      kandidatPenandatangan(t.level, t.kodeDokumen),
    ]);
    const { isiHtml: _i, hal: _h, tembusan: _t, tanggal: _tg, nomor: _n, penandatangan: _p, ...dasar } = lembar;
    isi = (
      <FormSurat
        pengajuanId={p.id}
        kode={kode}
        awal={awal}
        dariTemplate={dariTemplate}
        dasar={{ ...dasar, logoSrc: LOGO_WEB }}
        kandidat={kandidat}
        level={t.level}
        nomor={{
          format: t.formatNomor,
          klasifikasi,
          kodeInstansi,
          urut: surat?.nomorUrut ?? null,
          boleh: bolehAturNomorSurat(u),
          otomatis: peng.get("surat.nomor_otomatis") !== false,
          saran: (maks._max.nomorUrut ?? 0) + 1,
        }}
        identitas={identitasDari(p.snapshotIdentitas as unknown as SnapshotIdentitas)}
        nilai={Object.fromEntries(KUNCI_TERKUNCI.map((k) => [k, nilai[k]]))}
        terkunci={!!terakhir?.dikunciPada}
        versi={terakhir?.versi ?? null}
      />
    );
  } else if (snapshot?.beku && terakhir?.dikunciPada) {
    isi = (
      <div className="mx-auto w-full max-w-[210mm]">
        <PratinjauA4 label="Surat terkunci">
          <LembarSurat d={{ ...snapshot.beku, logoSrc: LOGO_WEB }} />
        </PratinjauA4>
      </div>
    );
  } else if (suratTersedia(p.status, t.dapatDicetakSejak)) {
    // Pihak yang hanya melihat (atasan, pejabat): pratinjau draft/template yang belum dicetak.
    const lembar = await susunLembar({ template: t, pengajuan: p, isiHtml: awal.isiHtml, isian: awal.isian, nomorUrut: surat?.nomorUrut ?? null });
    isi = (
      <div className="mx-auto grid w-full max-w-[210mm] gap-2">
        <p className="text-sm text-slate-700">{terakhir ? `Draft versi ${terakhir.versi} — belum dicetak.` : "Pratinjau dari template — surat belum disiapkan."}</p>
        <PratinjauA4 label="Pratinjau surat">
          <LembarSurat d={{ ...lembar, logoSrc: LOGO_WEB }} />
        </PratinjauA4>
      </div>
    );
  } else {
    isi = (
      <p className="rounded-xl border border-sky-200 bg-white/80 p-4 text-sm text-slate-800">
        Surat bisa disiapkan setelah pengajuan berstatus {LABEL_STATUS_CUTI[t.dapatDicetakSejak]}. Status sekarang: {LABEL_STATUS_CUTI[p.status]}.
      </p>
    );
  }

  return (
    <div className="grid gap-5">
      <div>
        <Link href={`/cuti/${p.id}`} className="mb-1 inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeftIcon className="size-4" /> Detail cuti
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-judul">{t.nama}</h1>
        <p className="text-sm text-slate-700">
          {(p.snapshotIdentitas as unknown as SnapshotIdentitas).nama} · {p.jenisCuti.nama}
          {surat?.nomorLengkap && ` · Nomor ${surat.nomorLengkap}`}
        </p>
      </div>

      {isi}

      {riwayat.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-judul">Versi & riwayat cetak</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3">
              {riwayat.map((v) => (
                <li key={v.id} className="grid gap-1 border-b border-sky-50 pb-3 last:border-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-semibold text-judul">Versi {v.versi}</span>
                    {v.dikunciPada ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800">
                        <LockIcon className="size-3.5" aria-hidden /> Terkunci {formatTanggalJam(v.dikunciPada)}
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-amber-800">Draft</span>
                    )}
                    <span className="text-xs text-slate-600">
                      oleh {v.dibuatOleh} · {formatTanggalJam(v.dibuatPada)}
                    </span>
                    {v.dikunciPada && (
                      <span className="ml-auto flex gap-3 text-sm">
                        <a href={`/cetak/surat/${v.id}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                          <PrinterIcon className="size-4" /> Cetak ulang
                        </a>
                        <a href={`/api/surat/${v.id}/pdf`} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                          <DownloadIcon className="size-4" /> PDF
                        </a>
                      </span>
                    )}
                  </div>
                  {v.cetak.length > 0 && (
                    <ul className="grid gap-0.5 pl-1 text-xs text-slate-700">
                      {v.cetak.map((c) => (
                        <li key={c.id}>
                          {c.jenis === "SURAT_PDF" ? "Unduh PDF" : "Cetak"} — {c.oleh}, {formatTanggalJam(c.waktu)}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
            {!versiTerkunci && <p className="mt-3 text-xs text-slate-600">Belum ada versi yang dicetak.</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
