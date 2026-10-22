import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormTemplate } from "@/components/admin/form-template";
import { LABEL_LEVEL_SURAT } from "@/lib/label";
import { TATA_LETAK_DOKUMEN } from "@/lib/surat/placeholder";
import { formatTanggal, hariIniWita } from "@/lib/tanggal";
import { wajibPeran } from "@/server/auth/pengguna";
import { db } from "@/server/db";
import { teksPengaturan } from "@/server/pengaturan";
import { kopSurat, LOGO_WEB, penandatanganUntuk } from "@/server/surat/data";

export const metadata: Metadata = { title: "Ubah Template Surat" };

/** HTML tujuan (`<p>baris<br>baris</p>`) → baris teks untuk form. */
function barisTujuan(html: string): string[] {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&(amp|lt|gt|quot|#39);/g, (_, k: string) => ({ amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'" })[k]!)
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default async function UbahTemplate({ params }: PageProps<"/admin/surat/template/[id]">) {
  await wajibPeran("ADMIN");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const t = await db.templateSurat.findUnique({ where: { id } });
  if (!t) notFound();

  const hariIni = hariIniWita();
  const [{ kota, ...kop }, penandatangan, klasifikasi, kodeInstansi] = await Promise.all([
    kopSurat(),
    penandatanganUntuk(t.level, t.kodeDokumen, hariIni),
    teksPengaturan("surat.klasifikasi"),
    teksPengaturan("surat.kode_instansi"),
  ]);
  const tataLetak = TATA_LETAK_DOKUMEN[t.kodeDokumen] ?? "SURAT";
  const daftar = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);

  return (
    <div className="grid gap-5">
      <div>
        <Link href="/admin/surat/template" className="mb-1 inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeftIcon className="size-4" /> Template surat
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-judul">{t.nama}</h1>
        <p className="text-sm text-slate-700">
          {LABEL_LEVEL_SURAT[t.level]} · {t.kodeDokumen} · versi {t.versi}
        </p>
      </div>
      <FormTemplate
        awal={{
          id: t.id,
          nama: t.nama,
          hal: t.hal,
          sifat: t.sifat ?? "",
          lampiran: t.lampiran ?? "",
          tujuan: barisTujuan(t.tujuanHtml),
          tembusan: daftar(t.tembusan),
          disposisi: daftar(t.disposisi),
          dapatDicetakSejak: t.dapatDicetakSejak === "DISETUJUI" ? "DISETUJUI" : "DIVERIFIKASI",
          formatNomor: t.formatNomor,
          aktif: t.aktif,
          isiHtml: t.isiHtml,
        }}
        dasar={{ kop, kota, logoSrc: LOGO_WEB, tanggal: formatTanggal(hariIni), penandatangan }}
        nomor={{ klasifikasi, kodeInstansi }}
        tataLetak={tataLetak}
      />
    </div>
  );
}
