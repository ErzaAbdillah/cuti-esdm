/**
 * Data referensi: pangkat/golongan, mapping eselon, jenis & aturan cuti,
 * alur persetujuan, dan hari libur. Semua upsert tanpa menimpa perubahan Admin.
 */
import type {
  JenisHariLibur,
  LevelSurat,
  ModePenyetuju,
  SatuanHitung,
  StatusKepegawaian,
  TahapPersetujuan,
} from "../../../lib/generated/prisma/enums";
import type { Db } from "../klien";

const PANGKAT_PNS: [string, string][] = [
  ["I/a", "Juru Muda"],
  ["I/b", "Juru Muda Tingkat I"],
  ["I/c", "Juru"],
  ["I/d", "Juru Tingkat I"],
  ["II/a", "Pengatur Muda"],
  ["II/b", "Pengatur Muda Tingkat I"],
  ["II/c", "Pengatur"],
  ["II/d", "Pengatur Tingkat I"],
  ["III/a", "Penata Muda"],
  ["III/b", "Penata Muda Tingkat I"],
  ["III/c", "Penata"],
  ["III/d", "Penata Tingkat I"],
  ["IV/a", "Pembina"],
  ["IV/b", "Pembina Tingkat I"],
  ["IV/c", "Pembina Utama Muda"],
  ["IV/d", "Pembina Utama Madya"],
  ["IV/e", "Pembina Utama"],
];

const ROMAWI = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII"];

export async function seedPangkat(db: Db) {
  for (const [i, [golongan, namaPangkat]] of PANGKAT_PNS.entries()) {
    await db.pangkatGolongan.upsert({
      where: { kode: golongan },
      update: {},
      create: { kode: golongan, golongan, namaPangkat, untuk: "PNS", urutan: i + 1 },
    });
  }
  for (const [i, golongan] of ROMAWI.entries()) {
    const kode = `PPPK-${golongan}`;
    await db.pangkatGolongan.upsert({
      where: { kode },
      update: {},
      create: { kode, golongan, untuk: "PPPK", urutan: 100 + i + 1 },
    });
  }
  return PANGKAT_PNS.length + ROMAWI.length;
}

/** Nilai awal dari spesifikasi; perlu diverifikasi ke BKD. */
const MAPPING_ESELON: { kelasMin: number; kelasMax: number; level: LevelSurat }[] = [
  { kelasMin: 15, kelasMax: 15, level: "ESELON_II" },
  { kelasMin: 11, kelasMax: 12, level: "ESELON_III" },
  { kelasMin: 9, kelasMax: 9, level: "ESELON_IV" },
];

export async function seedMappingEselon(db: Db) {
  if ((await db.mappingEselon.count()) > 0) return 0;
  await db.mappingEselon.createMany({
    data: MAPPING_ESELON.map((m) => ({ ...m, jenisJabatan: "STRUKTURAL", catatan: "Nilai awal — verifikasi ke BKD" })),
  });
  return MAPPING_ESELON.length;
}

interface DefJenisCuti {
  kode: string;
  nama: string;
  satuanHitung: SatuanHitung;
  potongSaldoTahunan: boolean;
  maksHari: number | null;
  wajibLampiran: boolean;
  bolehTanggalLampau: boolean;
}

/** PP 11/2017 tentang Manajemen PNS, Pasal 309–329. */
const JENIS_CUTI: DefJenisCuti[] = [
  { kode: "TAHUNAN", nama: "Cuti Tahunan", satuanHitung: "HARI_KERJA", potongSaldoTahunan: true, maksHari: null, wajibLampiran: false, bolehTanggalLampau: false },
  { kode: "BESAR", nama: "Cuti Besar", satuanHitung: "HARI_KALENDER", potongSaldoTahunan: false, maksHari: 90, wajibLampiran: false, bolehTanggalLampau: false },
  { kode: "SAKIT", nama: "Cuti Sakit", satuanHitung: "HARI_KERJA", potongSaldoTahunan: false, maksHari: null, wajibLampiran: true, bolehTanggalLampau: true },
  { kode: "MELAHIRKAN", nama: "Cuti Melahirkan", satuanHitung: "HARI_KALENDER", potongSaldoTahunan: false, maksHari: 90, wajibLampiran: true, bolehTanggalLampau: false },
  { kode: "ALASAN_PENTING", nama: "Cuti Karena Alasan Penting", satuanHitung: "HARI_KERJA", potongSaldoTahunan: false, maksHari: 30, wajibLampiran: false, bolehTanggalLampau: true },
  { kode: "CLTN", nama: "Cuti di Luar Tanggungan Negara", satuanHitung: "HARI_KALENDER", potongSaldoTahunan: false, maksHari: 1095, wajibLampiran: true, bolehTanggalLampau: false },
];

/** Jenis cuti yang berlaku untuk PPPK (PP 49/2018 Ps. 70). */
const CUTI_PPPK = new Set(["TAHUNAN", "SAKIT", "MELAHIRKAN"]);

function aturanUntuk(status: StatusKepegawaian, kode: string): { berlaku: boolean; hakPerTahun: number | null; catatan: string } {
  switch (status) {
    case "PNS":
      return { berlaku: true, hakPerTahun: kode === "TAHUNAN" ? 12 : null, catatan: "PP 11/2017" };
    case "PPPK":
      return { berlaku: CUTI_PPPK.has(kode), hakPerTahun: kode === "TAHUNAN" ? 12 : null, catatan: "PP 49/2018 Ps. 70" };
    case "PPPK_PARUH_WAKTU":
      return { berlaku: CUTI_PPPK.has(kode), hakPerTahun: kode === "TAHUNAN" ? 12 : null, catatan: "Mengikuti PPPK — verifikasi ke BKD" };
    case "NON_ASN":
      return { berlaku: false, hakPerTahun: null, catatan: "Atur sesuai kontrak PJLP" };
  }
}

const SEMUA_STATUS: StatusKepegawaian[] = ["PNS", "PPPK", "PPPK_PARUH_WAKTU", "NON_ASN"];

export async function seedJenisCuti(db: Db) {
  for (const j of JENIS_CUTI) {
    const jenis = await db.jenisCuti.upsert({ where: { kode: j.kode }, update: {}, create: j });
    for (const status of SEMUA_STATUS) {
      const a = aturanUntuk(status, j.kode);
      await db.aturanCuti.upsert({
        where: { jenisCutiId_statusKepegawaian: { jenisCutiId: jenis.id, statusKepegawaian: status } },
        update: {},
        create: { jenisCutiId: jenis.id, statusKepegawaian: status, ...a },
      });
    }
  }
  return JENIS_CUTI.length;
}

/**
 * Staf: keputusan (Plt.) Kepala Dinas di aplikasi.
 * Eselon II–IV: keputusan Gubernur/BKD (eksternal) dicatat Kepegawaian.
 * Eselon II tidak punya atasan di dinas.
 */
/** Alur ringkas: satu tahap, langsung diputuskan Kepegawaian/Admin di aplikasi. */
const ALUR: Record<LevelSurat, [TahapPersetujuan, ModePenyetuju][]> = {
  STAF: [["PEJABAT_BERWENANG", "PENGGUNA"]],
  ESELON_IV: [["PEJABAT_BERWENANG", "PENGGUNA"]],
  ESELON_III: [["PEJABAT_BERWENANG", "PENGGUNA"]],
  ESELON_II: [["PEJABAT_BERWENANG", "PENGGUNA"]],
};

export async function seedAlurPersetujuan(db: Db) {
  let n = 0;
  for (const [level, tahapan] of Object.entries(ALUR) as [LevelSurat, [TahapPersetujuan, ModePenyetuju][]][]) {
    for (const [i, [tahap, mode]] of tahapan.entries()) {
      await db.alurPersetujuan.upsert({
        where: { level_urutan: { level, urutan: i + 1 } },
        update: {},
        create: { level, urutan: i + 1, tahap, mode },
      });
      n++;
    }
  }
  return n;
}

/**
 * SKB Menteri Agama, Menteri Ketenagakerjaan, dan Menteri PANRB
 * No. 1497/2025, 2/2025, 5/2025 (19 September 2025).
 * Tanggal hari besar Islam dapat berubah mengikuti penetapan Menteri Agama.
 */
const HARI_LIBUR_2026: [string, string, JenisHariLibur][] = [
  ["2026-01-01", "Tahun Baru 2026 Masehi", "LIBUR_NASIONAL"],
  ["2026-01-16", "Isra Mikraj Nabi Muhammad SAW", "LIBUR_NASIONAL"],
  ["2026-02-16", "Cuti Bersama Tahun Baru Imlek 2577 Kongzili", "CUTI_BERSAMA"],
  ["2026-02-17", "Tahun Baru Imlek 2577 Kongzili", "LIBUR_NASIONAL"],
  ["2026-03-18", "Cuti Bersama Hari Suci Nyepi Tahun Baru Saka 1948", "CUTI_BERSAMA"],
  ["2026-03-19", "Hari Suci Nyepi Tahun Baru Saka 1948", "LIBUR_NASIONAL"],
  ["2026-03-20", "Cuti Bersama Idul Fitri 1447 H", "CUTI_BERSAMA"],
  ["2026-03-21", "Idul Fitri 1447 H", "LIBUR_NASIONAL"],
  ["2026-03-22", "Idul Fitri 1447 H", "LIBUR_NASIONAL"],
  ["2026-03-23", "Cuti Bersama Idul Fitri 1447 H", "CUTI_BERSAMA"],
  ["2026-03-24", "Cuti Bersama Idul Fitri 1447 H", "CUTI_BERSAMA"],
  ["2026-04-03", "Wafat Yesus Kristus", "LIBUR_NASIONAL"],
  ["2026-04-05", "Kebangkitan Yesus Kristus (Paskah)", "LIBUR_NASIONAL"],
  ["2026-05-01", "Hari Buruh Internasional", "LIBUR_NASIONAL"],
  ["2026-05-14", "Kenaikan Yesus Kristus", "LIBUR_NASIONAL"],
  ["2026-05-15", "Cuti Bersama Kenaikan Yesus Kristus", "CUTI_BERSAMA"],
  ["2026-05-27", "Idul Adha 1447 H", "LIBUR_NASIONAL"],
  ["2026-05-28", "Cuti Bersama Idul Adha 1447 H", "CUTI_BERSAMA"],
  ["2026-05-31", "Hari Raya Waisak 2570 BE", "LIBUR_NASIONAL"],
  ["2026-06-01", "Hari Lahir Pancasila", "LIBUR_NASIONAL"],
  ["2026-06-16", "Tahun Baru Islam 1448 H", "LIBUR_NASIONAL"],
  ["2026-08-17", "Hari Kemerdekaan Republik Indonesia", "LIBUR_NASIONAL"],
  ["2026-08-25", "Maulid Nabi Muhammad SAW", "LIBUR_NASIONAL"],
  ["2026-12-24", "Cuti Bersama Hari Raya Natal", "CUTI_BERSAMA"],
  ["2026-12-25", "Hari Raya Natal", "LIBUR_NASIONAL"],
];

export async function seedHariLibur(db: Db) {
  for (const [tanggal, nama, jenis] of HARI_LIBUR_2026) {
    const t = new Date(`${tanggal}T00:00:00Z`);
    await db.hariLibur.upsert({ where: { tanggal: t }, update: {}, create: { tanggal: t, nama, jenis } });
  }
  return HARI_LIBUR_2026.length;
}
