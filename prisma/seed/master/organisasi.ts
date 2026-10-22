/**
 * Struktur organisasi, jabatan, dan formasi dari Peta Jabatan
 * (Keputusan Gubernur Kalsel No. 100.3.3.1/01105/KUM/2025, hlm. 345–347).
 * Data ini publik (struktur), bukan data pribadi.
 */
import type { JenisJabatan, JenisUnit } from "../../../lib/generated/prisma/enums";
import type { Db } from "../klien";

export const SUMBER_PETA_JABATAN = "Kepgub Kalsel 100.3.3.1/01105/KUM/2025";

/** Jabatan fungsional & pelaksana (non-struktural) beserta kelas bawaannya. */
export const JABATAN_NON_STRUKTURAL: { nama: string; jenis: JenisJabatan; kelas: number | null }[] = [
  { nama: "Penelaah Teknis Kebijakan", jenis: "PELAKSANA", kelas: 7 },
  { nama: "Penata Layanan Operasional", jenis: "PELAKSANA", kelas: 7 },
  { nama: "Pengolah Data dan Informasi", jenis: "PELAKSANA", kelas: 6 },
  { nama: "Pengelola Layanan Operasional", jenis: "PELAKSANA", kelas: 6 },
  { nama: "Operator Laboratorium", jenis: "PELAKSANA", kelas: 6 },
  { nama: "Pengadministrasi Perkantoran", jenis: "PELAKSANA", kelas: 5 },
  { nama: "Operator Layanan Operasional", jenis: "PELAKSANA", kelas: 5 },
  { nama: "Perencana Ahli Madya", jenis: "FUNGSIONAL", kelas: 12 },
  { nama: "Perencana Ahli Muda", jenis: "FUNGSIONAL", kelas: 10 },
  { nama: "Perencana Ahli Pertama", jenis: "FUNGSIONAL", kelas: 8 },
  { nama: "Pranata Komputer Ahli Muda", jenis: "FUNGSIONAL", kelas: 9 },
  { nama: "Pranata Komputer Ahli Pertama", jenis: "FUNGSIONAL", kelas: 8 },
  { nama: "Pranata Komputer Mahir", jenis: "FUNGSIONAL", kelas: 7 },
  { nama: "Pranata Komputer Terampil", jenis: "FUNGSIONAL", kelas: 6 },
  { nama: "Surveyor Pemetaan Ahli Muda", jenis: "FUNGSIONAL", kelas: 10 },
  { nama: "Surveyor Pemetaan Ahli Pertama", jenis: "FUNGSIONAL", kelas: 8 },
  { nama: "Analis Sumber Daya Manusia Aparatur Ahli Pertama", jenis: "FUNGSIONAL", kelas: 8 },
  { nama: "Pranata Sumber Daya Manusia Aparatur Mahir", jenis: "FUNGSIONAL", kelas: 7 },
  { nama: "Pranata Sumber Daya Manusia Aparatur Terampil", jenis: "FUNGSIONAL", kelas: 6 },
  { nama: "Arsiparis Mahir", jenis: "FUNGSIONAL", kelas: 7 },
  { nama: "Arsiparis Terampil", jenis: "FUNGSIONAL", kelas: 6 },
  { nama: "Inspektur Ketenagalistrikan Ahli Muda", jenis: "FUNGSIONAL", kelas: 10 },
  { nama: "Inspektur Ketenagalistrikan Ahli Pertama", jenis: "FUNGSIONAL", kelas: 8 },
  { nama: "Tenaga Keamanan Kantor", jenis: "NON_ASN", kelas: null },
];

/** [nama jabatan, kelas, bezetting (B), kebutuhan (K)] */
type Formasi = [string, number, number, number];

interface DefUnit {
  kode: string;
  nama: string;
  jenis: JenisUnit;
  singkatan?: string;
  judulDaftarHadir?: string;
  kepala: { nama: string; namaSingkat?: string; kelas: number; b: number; k: number };
  formasi?: Formasi[];
  anak?: DefUnit[];
}

const PTK = "Penelaah Teknis Kebijakan";
const PLO = "Penata Layanan Operasional";
const PDI = "Pengolah Data dan Informasi";
const PP = "Pengadministrasi Perkantoran";
const OLO = "Operator Layanan Operasional";

function seksi(kode: string, nama: string, formasi: Formasi[]): DefUnit {
  return {
    kode,
    nama: `Seksi ${nama}`,
    jenis: "SEKSI",
    kepala: { nama: `Kepala Seksi ${nama}`, namaSingkat: `Kasie ${nama}`, kelas: 9, b: 1, k: 1 },
    formasi,
  };
}

function subbag(kode: string, nama: string, formasi: Formasi[]): DefUnit {
  return {
    kode,
    nama: `Sub Bagian ${nama}`,
    jenis: "SUBBAG",
    // Daftar hadir fisik menulis Kasubbag dengan nama lengkap.
    kepala: { nama: `Kepala Sub Bagian ${nama}`, kelas: 9, b: 1, k: 1 },
    formasi,
  };
}

function bidang(kode: string, nama: string, b: number, anak: DefUnit[]): DefUnit {
  return {
    kode,
    nama: `Bidang ${nama}`,
    jenis: "BIDANG",
    judulDaftarHadir: `BIDANG ${nama.toUpperCase()}`,
    kepala: { nama: `Kepala Bidang ${nama}`, kelas: 11, b, k: 1 },
    anak,
  };
}

export const STRUKTUR: DefUnit = {
  kode: "DINAS",
  nama: "Dinas Energi dan Sumber Daya Mineral",
  jenis: "DINAS",
  singkatan: "Dinas ESDM",
  kepala: { nama: "Kepala Dinas Energi dan Sumber Daya Mineral", namaSingkat: "Kepala Dinas", kelas: 15, b: 1, k: 1 },
  formasi: [["Perencana Ahli Madya", 12, 0, 1]],
  anak: [
    {
      kode: "SEKRETARIAT",
      nama: "Sekretariat",
      jenis: "SEKRETARIAT",
      judulDaftarHadir: "SEKRETARIAT",
      kepala: { nama: "Sekretaris Dinas Energi dan Sumber Daya Mineral", namaSingkat: "Sekretaris", kelas: 12, b: 1, k: 1 },
      anak: [
        subbag("SUBBAG_PP", "Perencanaan dan Pelaporan", [
          ["Perencana Ahli Muda", 10, 0, 2],
          ["Perencana Ahli Pertama", 8, 0, 2],
          ["Pranata Komputer Mahir", 7, 0, 1],
          ["Pranata Komputer Terampil", 6, 0, 1],
          [PTK, 7, 2, 4],
          [PLO, 7, 0, 1],
          [PDI, 6, 1, 2],
          [PP, 5, 1, 2],
        ]),
        subbag("SUBBAG_KA", "Keuangan dan Aset", [
          [PTK, 7, 4, 5],
          [PLO, 7, 1, 2],
          [PDI, 6, 1, 3],
          [PP, 5, 2, 3],
        ]),
        subbag("SUBBAG_UK", "Umum dan Kepegawaian", [
          ["Pranata Komputer Ahli Muda", 9, 0, 1],
          ["Pranata Komputer Ahli Pertama", 8, 2, 2],
          ["Analis Sumber Daya Manusia Aparatur Ahli Pertama", 8, 0, 1],
          ["Pranata Sumber Daya Manusia Aparatur Mahir", 7, 0, 1],
          ["Pranata Sumber Daya Manusia Aparatur Terampil", 6, 0, 1],
          ["Arsiparis Mahir", 7, 0, 1],
          ["Arsiparis Terampil", 6, 0, 1],
          [PTK, 7, 1, 3],
          [PLO, 7, 0, 1],
          [PDI, 6, 0, 2],
          ["Pengelola Layanan Operasional", 6, 0, 1],
          [PP, 5, 3, 8],
          [OLO, 5, 5, 9],
          [OLO, 3, 4, 4],
        ]),
      ],
    },
    bidang("BIDANG_GEOLOGI", "Geologi", 1, [
      seksi("SEKSI_PAT", "Pendayagunaan Air Tanah", [
        [PTK, 7, 1, 3],
        [PLO, 7, 0, 1],
        [PDI, 6, 2, 3],
        [PP, 5, 0, 1],
      ]),
      seksi("SEKSI_PENGAT", "Pengendalian Air Tanah", [
        [PTK, 7, 2, 4],
        [PDI, 6, 1, 2],
        [PP, 5, 0, 1],
      ]),
      seksi("SEKSI_KWGAT", "Konservasi Warisan Geologi dan Air Tanah", [
        ["Surveyor Pemetaan Ahli Pertama", 8, 0, 1],
        [PTK, 7, 3, 4],
        [PDI, 6, 1, 2],
        [PP, 5, 0, 1],
      ]),
    ]),
    bidang("BIDANG_PERTAMBANGAN", "Pertambangan", 1, [
      seksi("SEKSI_PRODPEM", "Produksi dan Pemasaran", [
        [PTK, 7, 2, 3],
        [PLO, 7, 0, 1],
        [PDI, 6, 1, 2],
        [OLO, 5, 0, 1],
        [PP, 5, 0, 1],
      ]),
      seksi("SEKSI_PENGUSAHAAN", "Pengusahaan", [
        ["Surveyor Pemetaan Ahli Muda", 10, 0, 1],
        ["Surveyor Pemetaan Ahli Pertama", 8, 0, 1],
        [PTK, 7, 2, 6],
        [PDI, 6, 1, 1],
        [OLO, 5, 0, 1],
        [PP, 5, 0, 1],
      ]),
      seksi("SEKSI_TEKLING", "Teknik Lingkungan", [
        [PTK, 7, 2, 7],
        [PLO, 7, 0, 1],
        [PDI, 6, 0, 2],
        [PP, 5, 1, 1],
      ]),
    ]),
    bidang("BIDANG_ENERGI", "Energi", 1, [
      seksi("SEKSI_PENGEMB_ENERGI", "Pengembangan Energi", [
        ["Surveyor Pemetaan Ahli Pertama", 8, 0, 1],
        [PTK, 7, 1, 2],
        [PLO, 7, 1, 1],
        [PDI, 6, 0, 1],
        [PP, 5, 0, 1],
      ]),
      seksi("SEKSI_PENGUSAHAAN_ENERGI", "Pengusahaan Energi", [
        [PTK, 7, 1, 2],
        [PDI, 6, 0, 1],
        [PP, 5, 1, 1],
      ]),
      seksi("SEKSI_KONSERVASI_ENERGI", "Konservasi Energi", [
        [PTK, 7, 0, 2],
        [PDI, 6, 1, 2],
        [PP, 5, 1, 1],
      ]),
    ]),
    bidang("BIDANG_KETENAGALISTRIKAN", "Ketenagalistrikan", 0, [
      seksi("SEKSI_PENGEMB_GTL", "Pengembangan Ketenagalistrikan", [
        ["Surveyor Pemetaan Ahli Pertama", 8, 0, 1],
        [PTK, 7, 1, 3],
        [PDI, 6, 0, 2],
        [OLO, 5, 0, 1],
        [PP, 5, 2, 3],
      ]),
      seksi("SEKSI_PENGUSAHAAN_GTL", "Pengusahaan Ketenagalistrikan", [
        [PTK, 7, 3, 5],
        [PDI, 6, 1, 1],
        [PP, 5, 1, 1],
      ]),
      // Penulisan mengikuti Peta Jabatan ("Pengawas"); bisa dikoreksi Admin.
      seksi("SEKSI_WASDAL_GTL", "Pengawas dan Pengendalian Ketenagalistrikan", [
        ["Inspektur Ketenagalistrikan Ahli Muda", 10, 0, 4],
        ["Inspektur Ketenagalistrikan Ahli Pertama", 8, 0, 6],
        [PTK, 7, 1, 3],
        [PLO, 7, 0, 1],
        [PDI, 6, 0, 1],
        [PP, 5, 1, 2],
      ]),
    ]),
    {
      kode: "UPTD_LAB",
      nama: "UPTD Laboratorium Energi dan Sumber Daya Mineral",
      jenis: "UPTD",
      singkatan: "UPTD Lab ESDM",
      judulDaftarHadir: "UPTD LABORATORIUM ENERGI DAN SUMBER DAYA MINERAL",
      kepala: {
        nama: "Kepala Unit Pelaksana Teknis Daerah Laboratorium Energi dan Sumber Daya Mineral",
        namaSingkat: "Kepala UPTD Laboratorium ESDM",
        kelas: 11,
        b: 1,
        k: 1,
      },
      anak: [
        subbag("SUBBAG_TU_UPTD", "Tata Usaha", [
          [PTK, 7, 3, 5],
          [PDI, 6, 0, 3],
          [PP, 5, 3, 4],
          [OLO, 5, 0, 9],
          ["Pranata Komputer Mahir", 7, 1, 1],
        ]),
        seksi("SEKSI_PEP", "Peralatan, Eksplorasi dan Perpetaan", [
          [PTK, 7, 1, 2],
          [PDI, 6, 3, 5],
          [PP, 5, 1, 3],
        ]),
        seksi("SEKSI_LAB", "Laboratorium", [
          [PTK, 7, 1, 2],
          [PLO, 7, 1, 4],
          ["Operator Laboratorium", 6, 0, 3],
          [PP, 5, 1, 2],
        ]),
      ],
    },
  ],
};

export async function seedOrganisasi(db: Db) {
  for (let k = 1; k <= 17; k++) {
    await db.kelasJabatan.upsert({ where: { nilai: k }, update: {}, create: { nilai: k } });
  }

  for (const j of JABATAN_NON_STRUKTURAL) {
    await db.jabatan.upsert({
      where: { nama: j.nama },
      update: {},
      create: { nama: j.nama, jenis: j.jenis, kelasJabatan: j.kelas },
    });
  }

  let jumlahUnit = 0;
  let jumlahFormasi = 0;

  async function simpan(def: DefUnit, parentId: string | null, urutan: number) {
    const unit = await db.unitKerja.upsert({
      where: { kode: def.kode },
      update: {},
      create: {
        kode: def.kode,
        nama: def.nama,
        jenis: def.jenis,
        singkatan: def.singkatan,
        judulDaftarHadir: def.judulDaftarHadir,
        parentId,
        urutan,
      },
    });
    jumlahUnit++;

    const kepala = await db.jabatan.upsert({
      where: { nama: def.kepala.nama },
      update: {},
      create: {
        nama: def.kepala.nama,
        namaSingkat: def.kepala.namaSingkat,
        jenis: "STRUKTURAL",
        kelasJabatan: def.kepala.kelas,
        memimpinUnitId: unit.id,
      },
    });

    const semuaFormasi: Formasi[] = [[def.kepala.nama, def.kepala.kelas, def.kepala.b, def.kepala.k], ...(def.formasi ?? [])];
    for (const [namaJabatan, kelas, b, k] of semuaFormasi) {
      const jabatan = namaJabatan === kepala.nama ? kepala : await db.jabatan.findUniqueOrThrow({ where: { nama: namaJabatan } });
      await db.formasiJabatan.upsert({
        where: { jabatanId_unitKerjaId_kelas: { jabatanId: jabatan.id, unitKerjaId: unit.id, kelas } },
        update: { bezetting: b, kebutuhan: k },
        create: { jabatanId: jabatan.id, unitKerjaId: unit.id, kelas, bezetting: b, kebutuhan: k, sumber: SUMBER_PETA_JABATAN },
      });
      jumlahFormasi++;
    }

    for (const [i, anak] of (def.anak ?? []).entries()) {
      await simpan(anak, unit.id, i + 1);
    }
  }

  await simpan(STRUKTUR, null, 0);
  return { unit: jumlahUnit, formasi: jumlahFormasi };
}
