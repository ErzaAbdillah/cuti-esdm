/**
 * Lembar surat A4 sebagai string HTML — satu sumber untuk pratinjau editor,
 * halaman cetak, dan PDF (Gotenberg), sehingga pratinjau sama dengan hasil cetak.
 * Murni (tanpa I/O); `tujuanHtml` dan `isiHtml` harus sudah disanitasi.
 */
import { escapeHtml } from "./render";
import type { TataLetakSurat } from "./placeholder";

export interface DataKop {
  pemerintah: string;
  nama: string;
  alamat: string;
  kodePos: string;
  telepon: string;
  fax: string;
  email: string;
  website: string;
}

export interface Penandatangan {
  awalan: string | null;
  jabatanTeks: string;
  nama: string;
  pangkat: string | null;
  nip: string | null;
}

export interface DataLembar {
  tataLetak: TataLetakSurat;
  kop: DataKop;
  logoSrc: string;
  kota: string;
  /** Sudah diformat, mis. "22 Oktober 2026". */
  tanggal: string;
  nomor: string;
  sifat: string | null;
  lampiran: string | null;
  hal: string;
  tujuanHtml: string;
  /** Penanda blok identitas & isian terkunci sudah diganti nilainya. */
  isiHtml: string;
  penandatangan: Penandatangan | null;
  tembusan: string[];
  disposisi: string[];
  /** Blok tanda tangan huruf kapital (Nota Dinas ke Gubernur). */
  ttdKapital?: boolean;
}

/** CSS lembar — dipakai apa adanya di pratinjau, halaman cetak, dan dokumen PDF. */
export const CSS_LEMBAR = `
.lembar-surat { box-sizing: border-box; width: 210mm; min-height: 297mm; padding: 12mm 20mm 18mm 25mm; background: #fff; color: #000;
  font-family: "Times New Roman", "Liberation Serif", Times, serif; font-size: 12pt; line-height: 1.35; text-align: left; }
.lembar-surat *, .lembar-surat *::before, .lembar-surat *::after { box-sizing: border-box; }
.lembar-surat p { margin: 0 0 6pt; }
.lembar-surat ol { list-style: decimal; }
.lembar-surat ul { list-style: disc; }
.lembar-surat img { display: inline; max-width: none; }
.lembar-surat .kop { position: relative; text-align: center; padding: 0 0 4pt 30mm; border-bottom: 3pt solid #000; margin-bottom: 1.5pt; min-height: 30mm; }
.lembar-surat .kop img { position: absolute; left: 0; top: 0; height: 28mm; width: auto; }
.lembar-surat .kop-garis { border-bottom: 1pt solid #000; margin-bottom: 12pt; }
.lembar-surat .kop .k1 { font-size: 14pt; font-weight: bold; letter-spacing: .2pt; }
.lembar-surat .kop .k2 { font-size: 16pt; font-weight: bold; letter-spacing: .2pt; }
.lembar-surat .kop .k3 { font-size: 10.5pt; line-height: 1.25; }
.lembar-surat table { border-collapse: collapse; }
.lembar-surat td p, .lembar-surat th p, .lembar-surat li p { margin: 0; text-indent: 0; }
.lembar-surat .meta td { vertical-align: top; padding: 0 0 1pt; }
.lembar-surat .meta td:first-child { width: 24mm; white-space: nowrap; }
.lembar-surat .meta td:nth-child(2) { width: 5mm; }
.lembar-surat .tanggal-kanan { text-align: right; margin-bottom: 6pt; }
.lembar-surat .kepala-surat { display: grid; grid-template-columns: 1fr 72mm; gap: 6mm; margin-bottom: 12pt; }
.lembar-surat .tujuan p { margin: 0; }
.lembar-surat .judul { text-align: center; font-weight: bold; text-decoration: underline; text-underline-offset: 2pt; margin-bottom: 2pt; }
.lembar-surat .sub-judul { text-align: center; margin-bottom: 14pt; }
.lembar-surat .garis-nota { border-top: 1.5pt solid #000; margin: 6pt 0 12pt; }
.lembar-surat .isi { text-align: justify; }
.lembar-surat .isi > p { text-indent: 12.5mm; }
.lembar-surat .isi ol, .lembar-surat .isi ul { margin: 0 0 6pt; padding-left: 8mm; }
.lembar-surat .isi li { margin-bottom: 2pt; text-align: justify; }
.lembar-surat .isi table.tabel-isian { margin: 0 0 8pt 12.5mm; }
.lembar-surat .isi table.tabel-isian:has(+ table.tabel-isian) { margin-bottom: 0; }
.lembar-surat .isi table.tabel-isian td { vertical-align: top; padding: 0 0 1pt; border: 0; }
.lembar-surat .isi table.tabel-isian td:first-child { width: 44mm; }
.lembar-surat .isi table.tabel-isian td:nth-child(2) { width: 5mm; }
.lembar-surat .isi table:not(.tabel-isian) { margin: 0 0 8pt; }
.lembar-surat .isi table:not(.tabel-isian) td, .lembar-surat .isi table:not(.tabel-isian) th { border: 1pt solid #000; padding: 2pt 4pt; vertical-align: top; }
.lembar-surat .ttd { display: flex; justify-content: flex-end; margin-top: 14pt; break-inside: avoid; }
.lembar-surat .ttd > div { width: 85mm; text-align: center; }
.lembar-surat .ttd .ruang { height: 24mm; }
.lembar-surat .ttd .nama { font-weight: bold; text-decoration: underline; text-underline-offset: 2pt; }
.lembar-surat .tembusan { margin-top: 14pt; font-size: 11pt; break-inside: avoid; }
.lembar-surat .tembusan ol { margin: 0; padding-left: 6mm; }
.lembar-surat .disposisi { margin-top: 16pt; break-inside: avoid; }
.lembar-surat .disposisi table { width: 100%; table-layout: fixed; }
.lembar-surat .disposisi th, .lembar-surat .disposisi td { border: 1pt solid #000; padding: 3pt 4pt; text-align: center; font-weight: normal; font-size: 11pt; }
.lembar-surat .disposisi td { height: 32mm; }
@media print { .lembar-surat { width: auto; min-height: 0; padding: 0; } }
`;

/** Ukuran & margin halaman untuk cetak browser dan PDF (margin lembar pindah ke @page). */
export const CSS_HALAMAN_A4 = "@page { size: A4; margin: 12mm 20mm 18mm 25mm; }";

const e = escapeHtml;

function kop(k: DataKop, logoSrc: string): string {
  return `<div class="kop"><img src="${e(logoSrc)}" alt="Lambang Provinsi Kalimantan Selatan"><div class="k1">${e(k.pemerintah)}</div><div class="k2">${e(k.nama)}</div><div class="k3">${e(k.alamat)} Kode Pos ${e(k.kodePos)}<br>Telepon ${e(k.telepon)}, Fax ${e(k.fax)}<br>Email : ${e(k.email)} Website : ${e(k.website)}</div></div><div class="kop-garis"></div>`;
}

export function jabatanPenandatangan(p: Penandatangan | null): string {
  return p ? `${p.awalan ? `${p.awalan} ` : ""}${p.jabatanTeks}` : "";
}

/** Jabatan dicetak dua baris seperti surat fisik: "… Sumber Daya Mineral" / "Provinsi Kalimantan Selatan". */
function jabatanDuaBaris(teks: string): string {
  return e(teks).replace(/ (provinsi )/i, "<br>$1");
}

function tandaTangan(p: Penandatangan | null, kotaTanggal?: string, kapital = false): string {
  const atas = kotaTanggal ? `<p>${e(kotaTanggal)}</p>` : "";
  const jabatan = p ? jabatanDuaBaris(kapital ? jabatanPenandatangan(p).toUpperCase() : jabatanPenandatangan(p)) : "(pejabat penandatangan belum diatur)";
  const bawah = p ? `<div class="nama">${e(kapital ? p.nama.toUpperCase() : p.nama)}</div>${p.pangkat ? `<div>${e(p.pangkat)}</div>` : ""}${p.nip ? `<div>NIP ${e(p.nip)}</div>` : ""}` : "";
  return `<div class="ttd"><div>${atas}<p>${jabatan}</p><div class="ruang"></div>${bawah}</div></div>`;
}

function tembusan(daftar: string[], label: string): string {
  if (daftar.length === 0) return "";
  const isi = daftar.length === 1 ? `<div>${e(daftar[0])}</div>` : `<ol>${daftar.map((t) => `<li>${e(t)}</li>`).join("")}</ol>`;
  return `<div class="tembusan"><div>${e(label)}</div>${isi}</div>`;
}

function meta(baris: [string, string | null, boolean?][]): string {
  return `<table class="meta"><tbody>${baris
    .filter(([, v]) => v != null)
    .map(([k, v, html]) => `<tr><td>${e(k)}</td><td>:</td><td>${html ? v : e(v!)}</td></tr>`)
    .join("")}</tbody></table>`;
}

export function htmlLembar(d: DataLembar): string {
  const isi = `<div class="isi">${d.isiHtml}</div>`;
  // Nomor urut kosong (diisi tangan) berupa deretan spasi yang harus tetap terlihat.
  d = { ...d, nomor: d.nomor.replace(/ {2,}/g, (s) => " ".repeat(s.length)) };
  let badan: string;
  switch (d.tataLetak) {
    case "NOTA_DINAS": {
      const disposisi = d.disposisi.length
        ? `<div class="disposisi"><div>Disposisi Atasan :</div><table><thead><tr>${d.disposisi.map((x) => `<th>${e(x)}</th>`).join("")}</tr></thead><tbody><tr>${d.disposisi.map(() => "<td></td>").join("")}</tr></tbody></table></div>`
        : "";
      badan =
        `<div class="judul">NOTA DINAS</div><div style="height:8pt"></div>` +
        meta([
          ["Kepada Yth", d.tujuanHtml, true],
          ["Dari", d.penandatangan ? jabatanDuaBaris(jabatanPenandatangan(d.penandatangan)) : "-", true],
          ["Nomor", d.nomor],
          ["Tanggal", d.tanggal],
          ["Hal", d.hal],
        ]) +
        `<div class="garis-nota"></div>${isi}${tandaTangan(d.penandatangan, undefined, d.ttdKapital)}${disposisi}${tembusan(d.tembusan, "Tembusan Yth :")}`;
      break;
    }
    case "SURAT":
      badan =
        `<div class="tanggal-kanan">${e(d.kota)}, ${e(d.tanggal)}</div><div class="kepala-surat">` +
        meta([
          ["Nomor", d.nomor],
          ["Sifat", d.sifat],
          ["Lampiran", d.lampiran],
          ["Hal", d.hal],
        ]) +
        `<div class="tujuan">${d.tujuanHtml}</div></div>${isi}${tandaTangan(d.penandatangan)}${tembusan(d.tembusan, "Tembusan Yth :")}`;
      break;
    case "SURAT_IZIN":
      badan = `<div class="judul">${e(d.hal.toUpperCase())}</div><div class="sub-judul">NOMOR : ${e(d.nomor)}</div>${isi}${tandaTangan(d.penandatangan, `${d.kota}, ${d.tanggal}`)}${tembusan(d.tembusan, "Tembusan :")}`;
      break;
  }
  return `<div class="lembar-surat">${kop(d.kop, d.logoSrc)}${badan}</div>`;
}

/** Dokumen HTML lengkap untuk Gotenberg. */
export function dokumenHtml(d: DataLembar, judul: string): string {
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${e(judul)}</title><style>${CSS_HALAMAN_A4}${CSS_LEMBAR}</style></head><body style="margin:0">${htmlLembar(d)}</body></html>`;
}
