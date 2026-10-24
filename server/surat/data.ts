import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { formatNip } from "@/lib/domain/nip";
import type { KandidatPejabat } from "@/lib/domain/pejabat";
import { terbilang } from "@/lib/domain/terbilang";
import type { Prisma, TemplateSurat } from "@/lib/generated/prisma/client";
import type { LevelSurat } from "@/lib/generated/prisma/enums";
import type { DataKop, DataLembar, Penandatangan } from "@/lib/surat/lembar";
import { type KunciPlaceholder, TATA_LETAK_DOKUMEN } from "@/lib/surat/placeholder";
import { formatNomor, formatTanggalSurat, type IdentitasSurat, isiPlaceholder, isiTeks, rapikanTembusan, tampilkanIsi } from "@/lib/surat/render";
import { formatTanggal, hariIniWita } from "@/lib/tanggal";
import { db } from "../db";
import type { SnapshotIdentitas } from "../layanan/cuti";
import { kandidatPejabat, pejabatBerlaku } from "../layanan/pejabat";
import { semuaPengaturan, teksPengaturan } from "../pengaturan";

/** Bagian surat yang bisa diedit selain badan surat; disimpan di `data_snapshot` tiap versi. */
export interface IsianSurat {
  hal: string;
  tembusan: string[];
  /** YYYY-MM-DD */
  tanggal: string;
  /** Hari dikosongkan untuk diisi tangan (bawaan, seperti surat fisik). */
  hariKosong?: boolean;
}

/** Data versi: isian + (setelah dicetak) lembar yang dibekukan, agar cetak ulang identik. */
export interface SnapshotVersi {
  isian: IsianSurat;
  beku?: Omit<DataLembar, "logoSrc">;
}

export type PengajuanUntukSurat = Prisma.PengajuanCutiGetPayload<{ include: { jenisCuti: true } }>;

const URUT_DOKUMEN = ["NOTA_DINAS_GUBERNUR", "NOTA_DINAS_SEKDA", "PERMOHONAN_BKD", "SURAT_IZIN"];

/** Template aktif untuk pengajuan: per kode dokumen, template khusus jenis cuti mengalahkan yang umum. */
export async function templateUntuk(p: { levelSurat: LevelSurat; jenisCutiId: string }): Promise<TemplateSurat[]> {
  const semua = await db.templateSurat.findMany({ where: { level: p.levelSurat, aktif: true, OR: [{ jenisCutiId: p.jenisCutiId }, { jenisCutiId: null }] } });
  const peta = new Map<string, TemplateSurat>();
  for (const t of semua) if (!peta.has(t.kodeDokumen) || t.jenisCutiId) peta.set(t.kodeDokumen, t);
  return [...peta.values()].sort((a, b) => URUT_DOKUMEN.indexOf(a.kodeDokumen) - URUT_DOKUMEN.indexOf(b.kodeDokumen));
}

export function identitasDari(s: SnapshotIdentitas): IdentitasSurat {
  return { nama: s.nama, nip: s.nip, pangkat: s.pangkat, jabatan: s.jabatan, satuanOrganisasi: s.satuanOrganisasi };
}

/** Nilai placeholder dari pengajuan (identitas diambil dari snapshot saat diajukan). */
export function nilaiPlaceholder(p: PengajuanUntukSurat): Record<KunciPlaceholder, string> {
  const s = p.snapshotIdentitas as unknown as SnapshotIdentitas;
  const kalender = p.jenisCuti.satuanHitung === "HARI_KALENDER";
  return {
    blok_identitas: "",
    nama: s.nama,
    nip: s.nip,
    pangkat_golongan: s.pangkat,
    jabatan: s.jabatan,
    satuan_organisasi: s.satuanOrganisasi,
    sebutan_status: s.sebutanStatus,
    jenis_cuti: p.jenisCuti.nama,
    jenis_cuti_kecil: p.jenisCuti.nama.toLowerCase(),
    tahun: String(p.tahunSaldo ?? p.tanggalMulai.getUTCFullYear()),
    jumlah_hari: String(p.jumlahHari),
    jumlah_hari_terbilang: terbilang(p.jumlahHari),
    satuan_hari: kalender ? "hari kalender" : "hari kerja",
    tanggal_mulai: formatTanggal(p.tanggalMulai),
    tanggal_selesai: formatTanggal(p.tanggalSelesai),
    alamat_cuti: p.alamatSelamaCuti,
    alasan: p.alasan,
    kepala_bidang_pemohon: s.kepalaBidang,
    atasan_langsung_jabatan: s.atasanJabatan,
  };
}

/** Badan surat & isian awal dari template. */
export function draftDariTemplate(t: TemplateSurat, nilai: Record<KunciPlaceholder, string>): { isiHtml: string; isian: IsianSurat } {
  const tembusan = Array.isArray(t.tembusan) ? (t.tembusan as string[]) : [];
  return {
    isiHtml: isiPlaceholder(t.isiHtml, nilai, { kunciData: true }),
    isian: { hal: isiTeks(t.hal, nilai), tembusan: rapikanTembusan(tembusan, nilai), tanggal: hariIniWita().toISOString().slice(0, 10), hariKosong: true },
  };
}

export async function kopSurat(): Promise<DataKop & { kota: string }> {
  const p = await semuaPengaturan();
  const t = (k: string) => {
    const v = p.get(`instansi.${k}`);
    return typeof v === "string" ? v : "";
  };
  return {
    pemerintah: t("pemerintah"),
    nama: t("nama"),
    alamat: t("alamat"),
    kodePos: t("kode_pos"),
    telepon: t("telepon"),
    fax: t("fax"),
    email: t("email"),
    website: t("website"),
    kota: t("kota"),
  };
}

export async function nomorSurat(t: Pick<TemplateSurat, "formatNomor">, urut: number | null, tahun: number): Promise<string> {
  const [klasifikasi, kodeInstansi] = await Promise.all([teksPengaturan("surat.klasifikasi"), teksPengaturan("surat.kode_instansi")]);
  return formatNomor(t.formatNomor, { klasifikasi, urut, tahun, kodeInstansi });
}

export type KandidatPenandatangan = KandidatPejabat & Penandatangan;

const keTtd = (p: { awalan: string | null; jabatanTeks: string; nama: string; pangkat: string | null; nip: string | null }): Penandatangan => ({
  awalan: p.awalan,
  jabatanTeks: p.jabatanTeks,
  nama: p.nama,
  pangkat: p.pangkat,
  nip: p.nip ? formatNip(p.nip) : null,
});

export async function penandatanganUntuk(level: LevelSurat, kodeDokumen: string, tanggal: Date): Promise<Penandatangan | null> {
  const p = await pejabatBerlaku(level, kodeDokumen, tanggal);
  return p ? keTtd(p) : null;
}

/** Semua calon penandatangan untuk dokumen — editor memilih sendiri menurut tanggal surat (pratinjau langsung). */
export async function kandidatPenandatangan(level: LevelSurat, kodeDokumen: string): Promise<KandidatPenandatangan[]> {
  return (await kandidatPejabat(level, kodeDokumen)).map((p) => ({ level: p.level, kodeDokumen: p.kodeDokumen, berlakuMulai: p.berlakuMulai, berlakuSampai: p.berlakuSampai, aktif: p.aktif, ...keTtd(p) }));
}

/** Lembar lengkap untuk draft (data terkini) — juga yang dibekukan saat dicetak. */
export async function susunLembar(a: {
  template: TemplateSurat;
  pengajuan: PengajuanUntukSurat;
  isiHtml: string;
  isian: IsianSurat;
  nomorUrut: number | null;
}): Promise<Omit<DataLembar, "logoSrc">> {
  const tanggal = new Date(`${a.isian.tanggal}T00:00:00Z`);
  const nilai = nilaiPlaceholder(a.pengajuan);
  const { kota, ...kop } = await kopSurat();
  return {
    tataLetak: TATA_LETAK_DOKUMEN[a.template.kodeDokumen] ?? "SURAT",
    kop,
    kota,
    tanggal: formatTanggalSurat(a.isian.tanggal, a.isian.hariKosong ?? false),
    nomor: await nomorSurat(a.template, a.nomorUrut, tanggal.getUTCFullYear()),
    sifat: a.template.sifat,
    lampiran: a.template.lampiran,
    hal: a.isian.hal,
    tujuanHtml: a.template.tujuanHtml,
    isiHtml: tampilkanIsi(a.isiHtml, identitasDari(a.pengajuan.snapshotIdentitas as unknown as SnapshotIdentitas), nilai),
    penandatangan: await penandatanganUntuk(a.template.level, a.template.kodeDokumen, tanggal),
    tembusan: a.isian.tembusan,
    disposisi: Array.isArray(a.template.disposisi) ? (a.template.disposisi as string[]) : [],
    ttdKapital: a.template.kodeDokumen === "NOTA_DINAS_GUBERNUR",
  };
}

export const LOGO_WEB = "/lambang-kalsel.png";

let logoDataUri: Promise<string> | null = null;
/** Lambang sebagai data URI untuk dokumen PDF (Gotenberg tidak mengakses server aplikasi). */
export function logoUntukPdf(): Promise<string> {
  logoDataUri ??= readFile(path.join(/* turbopackIgnore: true */ process.cwd(), "public", "lambang-kalsel.png"))
    .then((b) => `data:image/png;base64,${b.toString("base64")}`)
    // Di serverless, folder public tidak ikut ke fungsi: pakai URL publik aplikasi.
    .catch(() => new URL(LOGO_WEB, process.env.APP_URL || "http://localhost:3000").toString());
  return logoDataUri;
}

