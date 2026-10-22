/**
 * Template surat cuti per level, disalin dari contoh surat Dinas ESDM
 * (Cuti Eselon 2/3/4/Staf .wps dan PENGANTAR CUTI KE SEKDA 2026.docx).
 * Kop, nomor, tanggal, blok tanda tangan, tembusan, dan kotak disposisi
 * dirender sistem; `isiHtml` adalah badan surat yang bisa diedit.
 */
import type { LevelSurat, StatusCuti } from "../../../lib/generated/prisma/enums";
import type { Db } from "../klien";

interface DefTemplate {
  level: LevelSurat;
  kodeDokumen: string;
  nama: string;
  dapatDicetakSejak: StatusCuti;
  sifat?: string;
  lampiran?: string;
  hal: string;
  tujuanHtml: string;
  tembusan: string[];
  disposisi?: string[];
  isiHtml: string;
}

const TABEL_SELAMA = `<table class="tabel-isian"><tbody>
<tr><td>Selama</td><td>:</td><td>{{jumlah_hari}} ({{jumlah_hari_terbilang}}) {{satuan_hari}} mulai tanggal {{tanggal_mulai}} sampai dengan {{tanggal_selesai}}</td></tr>
<tr><td>Alamat Cuti</td><td>:</td><td>{{alamat_cuti}}</td></tr>
</tbody></table>`;

const ISI_PERMOHONAN_BKD = `<p>Bersama ini kami sampaikan permohonan {{jenis_cuti}} untuk Tahun {{tahun}} :</p>
{{blok_identitas}}
${TABEL_SELAMA}
<p>Demikian agar Surat Izin {{jenis_cuti}} dapat diterbitkan dalam waktu yang tidak lama.</p>`;

const PERMOHONAN_BKD = {
  kodeDokumen: "PERMOHONAN_BKD",
  nama: "Permohonan Cuti kepada Kepala BKD",
  dapatDicetakSejak: "DIVERIFIKASI",
  sifat: "Biasa",
  lampiran: "1 (satu) Lembar",
  hal: "Permohonan {{jenis_cuti}} a.n. {{nama}}",
  tujuanHtml: "<p>Yth. Kepala Badan Kepegawaian Daerah<br>Provinsi Kalimantan Selatan<br>di<br>Tempat</p>",
  tembusan: ["Gubernur Kalimantan Selatan"],
  isiHtml: ISI_PERMOHONAN_BKD,
} satisfies Omit<DefTemplate, "level">;

const TEMPLATE: DefTemplate[] = [
  {
    level: "ESELON_II",
    kodeDokumen: "NOTA_DINAS_GUBERNUR",
    nama: "Nota Dinas Permohonan Izin Cuti kepada Gubernur",
    dapatDicetakSejak: "DIVERIFIKASI",
    hal: "Permohonan Izin {{jenis_cuti}}",
    tujuanHtml: "<p>Bapak Gubernur Kalimantan Selatan</p>",
    tembusan: [],
    disposisi: ["Asisten Perekonomian dan Pembangunan", "Sekretaris Daerah", "Gubernur"],
    isiHtml: `<p>Sehubungan dengan pengambilan {{jenis_cuti}} atas nama {{jabatan}} Provinsi Kalimantan Selatan dikarenakan {{alasan}}, maka bersama ini mohon izin {{jenis_cuti_kecil}} selama {{jumlah_hari}} ( {{jumlah_hari_terbilang}} ) {{satuan_hari}} sejak tanggal {{tanggal_mulai}} sampai dengan {{tanggal_selesai}}.</p>
<p>Demikian permohonan izin {{jenis_cuti_kecil}} ini disampaikan, atas perhatiannya diucapkan terima kasih.</p>`,
  },
  {
    level: "ESELON_III",
    kodeDokumen: "NOTA_DINAS_SEKDA",
    nama: "Nota Dinas Permohonan Izin Cuti kepada Sekretaris Daerah",
    dapatDicetakSejak: "DIVERIFIKASI",
    hal: "Permohonan Izin {{jenis_cuti}}",
    tujuanHtml: "<p>Sekretaris Daerah Provinsi Kalimantan Selatan</p>",
    tembusan: [],
    disposisi: ["Asisten Perekonomian dan Pembangunan", "Sekretaris Daerah"],
    isiHtml: `<p>Sehubungan dengan pengambilan {{jenis_cuti}} atas nama : {{nama}} / NIP {{nip}} dikarenakan {{alasan}}, maka bersama ini mohon izin {{jenis_cuti_kecil}} selama {{jumlah_hari}} ( {{jumlah_hari_terbilang}} ) {{satuan_hari}} sejak tanggal {{tanggal_mulai}} sampai dengan {{tanggal_selesai}}.</p>
<p>Demikian permohonan izin {{jenis_cuti_kecil}} ini disampaikan, atas perhatiannya diucapkan terima kasih.</p>`,
  },
  { level: "ESELON_III", ...PERMOHONAN_BKD },
  { level: "ESELON_IV", ...PERMOHONAN_BKD },
  {
    level: "STAF",
    kodeDokumen: "SURAT_IZIN",
    nama: "Surat Izin Cuti",
    dapatDicetakSejak: "DISETUJUI",
    hal: "Surat Izin {{jenis_cuti}}",
    tujuanHtml: "",
    tembusan: [
      "Kepala Badan Kepegawaian Daerah Prov. Kalsel",
      "Sekretaris Dinas ESDM Prov. Kalsel",
      "{{kepala_bidang_pemohon}}",
      "Kepala Sub Bagian Umum dan Kepegawaian",
      "{{atasan_langsung_jabatan}}",
    ],
    isiHtml: `<p>Diberikan {{jenis_cuti}} untuk Tahun {{tahun}} kepada {{sebutan_status}} :</p>
{{blok_identitas}}
<p>Selama {{jumlah_hari}} ({{jumlah_hari_terbilang}}) {{satuan_hari}}, terhitung mulai tanggal {{tanggal_mulai}} sampai dengan {{tanggal_selesai}} dengan ketentuan sebagai berikut :</p>
<ol>
<li>Selama menjalankan {{jenis_cuti}} wajib menyerahkan pekerjaannya kepada Atasan Langsungnya.</li>
<li>Setelah menjalankan {{jenis_cuti}} wajib melaporkan diri kepada Atasan Langsungnya dan bekerja kembali sebagaimana biasa.</li>
<li>Alamat yang bersangkutan di {{alamat_cuti}}.</li>
</ol>
<p>Demikian Surat Izin {{jenis_cuti}} ini dibuat untuk dipergunakan sebagaimana mestinya.</p>`,
  },
];

/** Membuat template yang belum ada; template yang sudah diedit Admin tidak ditimpa. */
export async function seedTemplateSurat(db: Db) {
  for (const t of TEMPLATE) {
    const ada = await db.templateSurat.findFirst({
      where: { level: t.level, kodeDokumen: t.kodeDokumen, jenisCutiId: null },
    });
    if (ada) continue;
    await db.templateSurat.create({
      data: {
        level: t.level,
        kodeDokumen: t.kodeDokumen,
        nama: t.nama,
        dapatDicetakSejak: t.dapatDicetakSejak,
        sifat: t.sifat,
        lampiran: t.lampiran,
        hal: t.hal,
        tujuanHtml: t.tujuanHtml,
        tembusan: t.tembusan,
        disposisi: t.disposisi,
        isiHtml: t.isiHtml,
      },
    });
  }
  return TEMPLATE.length;
}
