/**
 * Nota Dinas pengantar permohonan cuti untuk pegawai Eselon II (ke Gubernur)
 * dan Eselon III (ke Sekretaris Daerah), seperti "PENGANTAR CUTI KE SEKDA
 * ESELON 2/3 2026.docx". Dicetak pegawai bersama formulir cuti tanpa
 * verifikasi; semua teks bisa diubah. Lembar HTML dipakai pratinjau & cetak.
 */
import { escapeHtml as e, formatTanggalSurat } from "@/lib/surat/render";
import { JENIS_FORMULIR, type Pejabat } from "./isian";

export interface PenandatanganNota extends Pejabat {
  pangkat: string;
}

export interface IsianNotaDinas {
  kepada: string;
  /** Boleh dua baris, mis. "Plt. Kepala Dinas …\nProvinsi Kalimantan Selatan". */
  dari: string;
  /** Nomor agenda dikosongkan untuk diisi tangan, mis. "800.1.11.4 /          / DESDM / 2026". */
  nomor: string;
  /** YYYY-MM-DD; hari dikosongkan untuk diisi tangan bila `hariKosong`. */
  tanggal: string;
  hariKosong: boolean;
  hal: string;
  /** Satu paragraf per baris. */
  isi: string;
  penandatangan: PenandatanganNota;
  /** Judul kolom tabel "Disposisi Atasan". */
  disposisi: string[];
}

export type LevelNotaDinas = "ESELON_II" | "ESELON_III";

export const perluNotaDinas = (level: string): level is LevelNotaDinas => level === "ESELON_II" || level === "ESELON_III";

/** Nama jenis cuti seperti di formulir BKN, cadangan nama di data. */
export const namaJenisCuti = (kode: string, cadangan: string): string => JENIS_FORMULIR.find((j) => j.kode === kode)?.label ?? cadangan;

export const halNotaDinas = (namaJenis: string) => `Permohonan Izin ${namaJenis}`;

/** "atas nama …": Eselon II atas nama jabatannya, Eselon III ": Nama / NIP …". */
export function atasNamaNota(level: LevelNotaDinas, d: { dari: string; nama: string; nip: string }): string {
  return level === "ESELON_II" ? d.dari.replace(/\s*\n\s*/g, " ").trim() : `: ${d.nama}${d.nip ? ` / NIP ${d.nip}` : ""}`;
}

/** Alasan sebagai anak kalimat: huruf awal kecil (singkatan dibiarkan), tanpa titik akhir. */
function anakKalimat(s: string): string {
  const t = s.trim().replace(/[.\s]+$/, "");
  return /^[A-Z][a-z]/.test(t) ? t[0].toLowerCase() + t.slice(1) : t;
}

/** Paragraf isi seperti contoh, disusun dari isian cuti. */
export function isiNotaDinas(d: { namaJenis: string; atasNama: string; alasan: string; lamanya: string; mulai: string; selesai: string }): string {
  const jenis = d.namaJenis.toLowerCase();
  const atau = (s: string) => s.trim() || "…";
  return [
    `Sehubungan dengan pengambilan ${d.namaJenis} atas nama ${d.atasNama} dikarenakan ${atau(anakKalimat(d.alasan))}, maka bersama ini mohon izin ${jenis} selama ${atau(d.lamanya)} sejak tanggal ${atau(d.mulai)} sampai dengan ${atau(d.selesai)}.`,
    `Demikian permohonan izin ${jenis} ini disampaikan, atas perhatiannya diucapkan terima kasih.`,
  ].join("\n");
}

/**
 * Ukuran mengikuti contoh (Legal 8,5 × 14 inci; margin atas 4,7 cm, lainnya
 * 3 cm; huruf 12 pt). Eselon II: Tahoma, judul tebal, tanda tangan di tengah
 * dengan nama tebal bergaris bawah. Eselon III: Arial, tanda tangan rata kiri.
 */
export const CSS_NOTA_DINAS = `
.lembar-nota { --lh: 1.15; box-sizing: border-box; width: 215.9mm; min-height: 355.6mm; padding: 47mm 30mm 30mm; background: #fff; color: #000;
  font-family: Arial, "Liberation Sans", Helvetica, sans-serif; font-size: 12pt; line-height: var(--lh); }
.lembar-nota.e2 { --lh: 1.21; padding-top: 61.5mm; font-family: Tahoma, Verdana, "DejaVu Sans", sans-serif; }
.lembar-nota *, .lembar-nota *::before, .lembar-nota *::after { box-sizing: border-box; }
.lembar-nota p { margin: 0; }
.lembar-nota .judul { margin-bottom: calc(12pt * var(--lh)); text-align: center; font-size: 16pt; text-decoration: underline; }
.lembar-nota.e2 .judul { font-weight: bold; }
.lembar-nota table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.lembar-nota .kepala td { padding: 0 0 calc(12pt * var(--lh)); vertical-align: top; }
.lembar-nota .kepala col.label { width: 38.1mm; }
.lembar-nota .kepala col.titik { width: 2.4mm; }
.lembar-nota .kepala td:last-child { white-space: pre-wrap; }
.lembar-nota .garis { margin: 1pt 0 calc(12pt * var(--lh)); border-top: 2.25pt double #000; }
.lembar-nota .isi p { text-indent: 12.7mm; text-align: justify; line-height: calc(var(--lh) * 1.5); }
.lembar-nota .ttd { margin-left: 60mm; }
.lembar-nota .ttd > div { white-space: pre; }
.lembar-nota .ttd .ruang { height: calc(24pt * var(--lh)); }
.lembar-nota.e2 .ttd { margin-left: 52.5mm; display: flex; flex-direction: column; align-items: center; }
.lembar-nota.e2 .ttd .ruang { height: calc(36pt * var(--lh)); }
.lembar-nota.e2 .ttd .nama { font-weight: bold; text-decoration: underline; }
.lembar-nota .label-disposisi { line-height: calc(var(--lh) * 1.5); }
.lembar-nota.e2 .label-disposisi { margin-top: calc(18pt * var(--lh)); }
.lembar-nota .disposisi td { border: 0.5pt solid #000; padding: 0 1.9mm; text-align: center; vertical-align: top; }
.lembar-nota .disposisi tr + tr td { height: 37.1mm; }
.lembar-nota.e2 .disposisi tr + tr td { height: 38.9mm; }
@media print { .lembar-nota { min-height: 0; } }
`;

export function htmlNotaDinas(n: IsianNotaDinas, level: LevelNotaDinas): string {
  const kepala = [
    ["Kepada Yth", n.kepada],
    ["Dari", n.dari],
    ["Nomor", n.nomor],
    ["Tanggal", formatTanggalSurat(n.tanggal, n.hariKosong)],
    ["Hal", n.hal],
  ]
    .map(([k, v]) => `<tr><td>${k}</td><td>:</td><td>${e(v)}</td></tr>`)
    .join("");
  const isi = n.isi
    .split("\n")
    .filter((t) => t.trim())
    .map((t) => `<p>${e(t.trim())}</p>`)
    .join("");
  const p = n.penandatangan;
  const jabatan = p.jabatan
    .split("\n")
    .map((t) => `<div>${e(t) || "&nbsp;"}</div>`)
    .join("");
  const kolom = n.disposisi.filter((k) => k.trim());
  const disposisi = kolom.length
    ? `<p class="label-disposisi">Disposisi Atasan :</p><table class="disposisi"><tbody><tr>${kolom.map((k) => `<td>${e(k)}</td>`).join("")}</tr><tr>${kolom.map(() => "<td></td>").join("")}</tr></tbody></table>`
    : "";

  return `<div class="lembar-nota ${level === "ESELON_II" ? "e2" : "e3"}">
<p class="judul">NOTA DINAS</p>
<table class="kepala"><colgroup><col class="label"><col class="titik"><col></colgroup><tbody>${kepala}</tbody></table>
<div class="garis"></div>
<div class="isi">${isi}</div>
<div class="ttd">${jabatan}<div class="ruang"></div><div class="nama">${e(p.nama) || "&nbsp;"}</div>${p.pangkat ? `<div>${e(p.pangkat)}</div>` : ""}${p.nip ? `<div>NIP ${e(p.nip)}</div>` : ""}</div>
${disposisi}
</div>`;
}
