/**
 * Perender template surat — murni (tanpa I/O), dipakai server (cetak/PDF)
 * dan browser (pratinjau di editor) agar hasilnya identik.
 */
import type { KunciPlaceholder } from "./placeholder";

export interface IdentitasSurat {
  nama: string;
  nip: string;
  pangkat: string;
  jabatan: string;
  satuanOrganisasi: string;
}

/** Penanda blok identitas di HTML tersimpan; tidak bisa diubah lewat editor. */
export const BLOK_IDENTITAS = '<div data-blok="identitas"></div>';
const POLA_BLOK = /<div data-blok="identitas"(?:\s[^>]*)?>\s*<\/div>|<p>\s*\{\{blok_identitas\}\}\s*<\/p>|\{\{blok_identitas\}\}/g;

/**
 * Data dari sistem yang tampil di badan surat sebagai isian terkunci
 * (`<span data-isian="kunci"></span>`): editor tidak bisa mengubah teksnya,
 * nilainya diambil dari data pengajuan saat ditampilkan.
 */
export const KUNCI_TERKUNCI = [
  "nama",
  "nip",
  "pangkat_golongan",
  "jabatan",
  "satuan_organisasi",
  "jumlah_hari",
  "jumlah_hari_terbilang",
  "tanggal_mulai",
  "tanggal_selesai",
] as const satisfies readonly KunciPlaceholder[];
export type KunciTerkunci = (typeof KUNCI_TERKUNCI)[number];
const SET_TERKUNCI: ReadonlySet<string> = new Set(KUNCI_TERKUNCI);
const POLA_ISIAN = /<span data-isian="([a-z_]+)"(?:\s[^>]*)?>[^<]*<\/span>/g;

export const isian = (k: KunciTerkunci) => `<span data-isian="${k}"></span>`;

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/**
 * Ganti {{kunci}} dengan nilai yang sudah di-escape. Blok identitas dipertahankan
 * sebagai penanda; dengan `kunciData`, data sistem menjadi isian terkunci.
 */
export function isiPlaceholder(template: string, nilai: Partial<Record<KunciPlaceholder, string>>, opsi: { kunciData?: boolean } = {}): string {
  return template.replace(POLA_BLOK, BLOK_IDENTITAS).replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (asli, k: string) => {
    if (opsi.kunciData && SET_TERKUNCI.has(k)) return isian(k as KunciTerkunci);
    const v = nilai[k as KunciPlaceholder];
    return v === undefined ? asli : escapeHtml(v);
  });
}

/** Teks polos (hal, tujuan, tembusan) — placeholder diisi tanpa HTML. */
export function isiTeks(template: string, nilai: Partial<Record<KunciPlaceholder, string>>): string {
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (asli, k: string) => nilai[k as KunciPlaceholder] ?? asli);
}

export function tabelIdentitas(i: IdentitasSurat): string {
  const baris: [string, string][] = [
    ["Nama", i.nama],
    ["NIP", i.nip],
    ["Pangkat / Golongan", i.pangkat],
    ["Jabatan", i.jabatan],
    ["Satuan Organisasi", i.satuanOrganisasi],
  ];
  return `<table class="tabel-isian identitas"><tbody>${baris
    .map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>:</td><td>${escapeHtml(v)}</td></tr>`)
    .join("")}</tbody></table>`;
}

/** HTML siap tampil: blok identitas diganti tabel, isian terkunci diganti nilainya. */
export function tampilkanIsi(isiHtml: string, identitas: IdentitasSurat, nilai: Partial<Record<KunciPlaceholder, string>> = {}): string {
  return isiHtml.replace(POLA_BLOK, tabelIdentitas(identitas)).replace(POLA_ISIAN, (_, k: string) => {
    const v = SET_TERKUNCI.has(k) ? nilai[k as KunciPlaceholder] : undefined;
    return v === undefined ? "" : escapeHtml(v);
  });
}

/** Jumlah blok identitas di HTML (editor tidak boleh menghapus/menggandakannya). */
export function hitungBlokIdentitas(html: string): number {
  return html.match(POLA_BLOK)?.length ?? 0;
}

/** Tembusan: placeholder diisi, baris kosong/duplikat dibuang (mis. Sekretaris = kepala unit pemohon). */
export function rapikanTembusan(daftar: string[], nilai: Partial<Record<KunciPlaceholder, string>>): string[] {
  const hasil: string[] = [];
  for (const t of daftar.map((x) => isiTeks(x, nilai).trim())) {
    if (t && !/\{\{/.test(t) && !hasil.some((h) => h.toLowerCase() === t.toLowerCase())) hasil.push(t);
  }
  return hasil;
}

/** Nomor surat dari format, mis. "{klasifikasi}/{urut}/DESDM/{tahun}". Urut kosong → spasi untuk diisi tangan. */
export function formatNomor(format: string, v: { klasifikasi: string; urut: number | null; tahun: number; kodeInstansi: string }): string {
  return format
    .replace("{klasifikasi}", v.klasifikasi)
    .replace("{urut}", v.urut == null ? "       " : String(v.urut))
    .replace("{tahun}", String(v.tahun))
    .replace("{kode}", v.kodeInstansi);
}

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

/**
 * Tanggal surat dari YYYY-MM-DD. `hariKosong`: seperti surat fisik, tanggal
 * (hari) dibiarkan kosong untuk diisi tangan saat ditandatangani — "      Juni 2026".
 */
export function formatTanggalSurat(iso: string, hariKosong: boolean): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return "";
  const bulanTahun = `${BULAN[Number(m[2]) - 1]} ${m[1]}`;
  return hariKosong ? `${" ".repeat(8)}${bulanTahun}` : `${m[3]} ${bulanTahun}`;
}
