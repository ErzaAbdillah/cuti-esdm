/**
 * Lembar A4 Formulir Permintaan dan Pemberian Cuti sebagai string HTML —
 * dipakai pratinjau di halaman isian dan halaman cetak, jadi keduanya identik.
 */
import { escapeHtml as e, formatTanggalSurat } from "@/lib/surat/render";
import { type DataPengajuanFormulir, type IsianFormulir, JENIS_FORMULIR, type Pejabat } from "./isian";

export const CSS_FORMULIR = `
.lembar-formulir { box-sizing: border-box; width: 210mm; min-height: 297mm; padding: 9mm 18mm 8mm 20mm; background: #fff; color: #000;
  font-family: Calibri, Carlito, "Segoe UI", Arial, sans-serif; font-size: 10pt; line-height: 1.15; }
.lembar-formulir *, .lembar-formulir *::before, .lembar-formulir *::after { box-sizing: border-box; }
.lembar-formulir .kepada { margin: 0 0 8pt 84mm; }
.lembar-formulir .kepada .tgl { margin-bottom: 6pt; white-space: pre; }
.lembar-formulir .kepada table { border-collapse: collapse; }
.lembar-formulir .kepada td { padding: 0; vertical-align: top; }
.lembar-formulir .kepada td:first-child { width: 9mm; }
.lembar-formulir .judul { text-align: center; font-weight: bold; margin: 0 0 6pt; }
.lembar-formulir table.f { width: 100%; border-collapse: collapse; margin-bottom: 5pt; table-layout: fixed; }
.lembar-formulir table.f td { border: 0.75pt solid #000; padding: 1pt 4pt; vertical-align: top; }
.lembar-formulir table.f td.kepala { background: #d9d9d9; font-weight: bold; }
.lembar-formulir table.f td.tengah { text-align: center; }
.lembar-formulir table.f td.kosong { border: 0; }
.lembar-formulir table.f td.ttd { text-align: center; padding: 3pt 4pt 2pt; }
.lembar-formulir .ruang { height: 10mm; }
.lembar-formulir .nama { font-weight: bold; }
.lembar-formulir .rata { text-align: justify; }
@media print { .lembar-formulir { min-height: 0; } }
`;

const baris = (s: string) => e(s).replace(/\n/g, "<br>");

function blokTtd(p: Pejabat, sapaan?: string): string {
  return `${sapaan ? `${e(sapaan)}<br>` : ""}${baris(p.jabatan)}<div class="ruang"></div><div class="nama">${e(p.nama) || "&nbsp;"}</div>${p.nip ? `NIP ${e(p.nip)}` : ""}`;
}

/** Tabel pertimbangan/keputusan (bagian VII & VIII). */
function bagianKeputusan(judul: string, p: Pejabat): string {
  return `<table class="f"><colgroup><col style="width:15%"><col style="width:15%"><col style="width:18%"><col style="width:52%"></colgroup><tbody>
<tr><td class="kepala" colspan="4">${e(judul)}</td></tr>
<tr><td>DISETUJUI</td><td>PERUBAHAN</td><td>DITANGGUHKAN</td><td class="tengah">TIDAK DISETUJUI</td></tr>
<tr><td>&nbsp;</td><td></td><td></td><td></td></tr>
<tr><td class="kosong" colspan="3"></td><td class="ttd">${blokTtd(p)}</td></tr>
</tbody></table>`;
}

export function htmlFormulir(f: IsianFormulir, d: DataPengajuanFormulir, kota = "Banjarbaru"): string {
  const cek = (kode: string) => (d.jenisKode === kode ? "V" : "");
  const j = JENIS_FORMULIR;
  const kepada = f.kepada
    .split("\n")
    .map((t, i) => `<tr><td>${i === 0 ? "Yth." : ""}</td><td>${e(t).replace(/^ +/, (s) => "&nbsp;".repeat(s.length)) || "&nbsp;"}</td></tr>`)
    .join("");
  const [n2, n1, n] = f.catatanTahunan;
  const lain = f.catatanLain;

  return `<div class="lembar-formulir">
<div class="kepada"><div class="tgl">${e(kota)}, ${e(formatTanggalSurat(f.tanggalSurat, f.hariKosong))}</div>Kepada<table><tbody>${kepada}</tbody></table></div>
<div class="judul">FORMULIR PERMINTAAN DAN PEMBERIAN CUTI</div>
<table class="f"><colgroup><col style="width:13%"><col style="width:42%"><col style="width:14%"><col style="width:31%"></colgroup><tbody>
<tr><td class="kepala" colspan="4">I.&nbsp;&nbsp; DATA PEGAWAI</td></tr>
<tr><td>Nama</td><td>${e(f.nama)}</td><td>NIP</td><td>${e(f.nip)}</td></tr>
<tr><td>Jabatan</td><td>${e(f.jabatan)}</td><td>Masa Kerja</td><td>${e(f.masaKerja)}</td></tr>
<tr><td>Unit Kerja</td><td colspan="3">${e(f.unitKerja)}</td></tr>
</tbody></table>
<table class="f"><colgroup><col style="width:30%"><col style="width:5%"><col style="width:52%"><col style="width:13%"></colgroup><tbody>
<tr><td class="kepala" colspan="4">II.&nbsp;&nbsp; JENIS CUTI YANG DIAMBIL</td></tr>
${[0, 2, 4]
  .map((i) => `<tr><td>${i + 1}.&nbsp; ${j[i].label}</td><td class="tengah">${cek(j[i].kode)}</td><td>${i + 2}.&nbsp; ${j[i + 1].label}</td><td class="tengah">${cek(j[i + 1].kode)}</td></tr>`)
  .join("")}
</tbody></table>
<table class="f"><tbody><tr><td class="kepala">III.&nbsp;&nbsp; ALASAN CUTI</td></tr><tr><td>${e(d.alasan)}</td></tr></tbody></table>
<table class="f"><colgroup><col style="width:9%"><col style="width:26%"><col style="width:16%"><col style="width:20%"><col style="width:7%"><col style="width:22%"></colgroup><tbody>
<tr><td class="kepala" colspan="6">IV.&nbsp;&nbsp; LAMANYA CUTI</td></tr>
<tr><td>Selama</td><td>${e(f.lamanya)}</td><td>Mulai tanggal</td><td class="tengah">${e(d.tanggalMulai)}</td><td class="tengah">s/d</td><td class="tengah">${e(d.tanggalSelesai)}</td></tr>
</tbody></table>
<table class="f"><colgroup><col style="width:12%"><col style="width:10%"><col style="width:20%"><col style="width:40%"><col style="width:18%"></colgroup><tbody>
<tr><td class="kepala" colspan="5">V.&nbsp;&nbsp; CATATAN CUTI</td></tr>
<tr><td colspan="3">1.&nbsp; CUTI TAHUNAN</td><td>2.&nbsp; ${j[1].catatan}</td><td>${e(lain[0])}</td></tr>
<tr><td>Tahun</td><td class="tengah">Sisa</td><td>Keterangan</td><td>3.&nbsp; ${j[2].catatan}</td><td>${e(lain[1])}</td></tr>
${[n2, n1, n]
  .map(
    (b, i) =>
      `<tr><td class="tengah">${e(b.tahun)}</td><td class="tengah">${e(b.sisa)}</td><td>${e(b.keterangan)}</td><td>${i + 4}.&nbsp; ${j[i + 3].catatan}</td><td>${e(lain[i + 2])}</td></tr>`,
  )
  .join("")}
</tbody></table>
<table class="f"><colgroup><col style="width:48%"><col style="width:12%"><col style="width:40%"></colgroup><tbody>
<tr><td class="kepala" colspan="3">VI.&nbsp;&nbsp; ALAMAT SELAMA MENJALANKAN CUTI</td></tr>
<tr><td rowspan="2" class="rata">${baris(d.alamat)}</td><td>TELP</td><td class="tengah">${e(f.telp)}</td></tr>
<tr><td colspan="2" class="ttd">${blokTtd({ jabatan: "", nama: f.nama, nip: f.nip }, "Hormat saya,")}</td></tr>
</tbody></table>
${bagianKeputusan("VII.  PERTIMBANGAN ATASAN LANGSUNG", f.atasan)}
${bagianKeputusan("VIII.  KEPUTUSAN PEJABAT YANG BERWENANG MEMBERIKAN CUTI", f.pejabat)}
</div>`;
}
