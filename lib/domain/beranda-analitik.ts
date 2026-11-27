import type { SatuanHitung, StatusCuti } from "@/lib/generated/prisma/enums";
import { STATUS_DIPROSES, STATUS_DISETUJUI } from "./alur-cuti";
import {
  HARI_KERJA_BAWAAN,
  hariIso,
  kunciTanggal,
  MAKS_RENTANG_HARI_KALENDER,
  TAHUN_CUTI_MAKS,
  TAHUN_CUTI_MIN,
} from "./hari-kerja";
import { type DataSaldo, rincianPemakaian, saldoTersedia, totalHak } from "./saldo-cuti";

const SEHARI = 24 * 60 * 60 * 1000;

export const NAMA_BULAN_SINGKAT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
] as const;

export const NAMA_BULAN_PANJANG = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

const SET_DISETUJUI: ReadonlySet<StatusCuti> = new Set(STATUS_DISETUJUI);
const SET_DIPROSES: ReadonlySet<StatusCuti> = new Set(STATUS_DIPROSES);

export interface PengajuanAnalitikInput {
  tanggalMulai: Date;
  tanggalSelesai: Date;
  jumlahHari: number;
  status: StatusCuti;
  tahunSaldo: number | null;
  potongSaldoTahunan: boolean;
  satuanHitung: SatuanHitung;
  namaJenis: string;
  kodeJenis: string;
}

export interface OpsiBagiBulan {
  tanggalMulai: Date;
  tanggalSelesai: Date;
  jumlahHari: number;
  satuanHitung: SatuanHitung;
  tahunTarget: number;
  libur: ReadonlySet<string>;
  hariKerja?: readonly number[];
  /**
   * Jika true, jumlah 12 bulan direkonsiliasi secara deterministik agar
   * persis sama dengan `jumlahHari` resmi di database (meski hari libur berubah
   * atau cuti melintasi pergantian tahun).
   */
  rekonsiliasiKeJumlahHari?: boolean;
}

export interface DataBulananCuti {
  bulan: number;
  label: string;
  namaLengkap: string;
  tahunan: number;
  lainnya: number;
  total: number;
}

export interface TitikTrenSaldo {
  indeks: number;
  label: string;
  namaLengkap: string;
  sisa: number;
  terpakaiBulan: number;
  proyeksiSetelahDipesan: number;
}

export interface SegmenDonat {
  kunci: string;
  label: string;
  nilai: number;
  persen: number;
  warnaVar: string;
}

export interface KomposisiJenisCuti {
  kode: string;
  nama: string;
  hari: number;
  jumlahPengajuan: number;
}

export interface RincianKuotaTahun {
  tahun: number;
  label: string;
  hak: number;
  terpakai: number;
  sisa: number;
  persenTerpakai: number;
}

export interface RingkasanBeranda {
  totalHak: number;
  tersedia: number;
  terpakai: number;
  dipesan: number;
  terpakaiTercatatAplikasi: number;
  terpakaiAwalImpor: number;
  cutiLainnyaHari: number;
  totalPengajuanDisetujui: number;
  totalPengajuanDiproses: number;
  persenTerpakai: number;
}

export interface HasilAnalitikBeranda {
  ringkasan: RingkasanBeranda;
  bulanan: DataBulananCuti[];
  trenSaldo: TitikTrenSaldo[];
  komposisiKuota: SegmenDonat[];
  komposisiJenis: KomposisiJenisCuti[];
  rincianKuota: RincianKuotaTahun[];
}

export interface DataBulananPengajuanDinas {
  bulan: number;
  label: string;
  namaLengkap: string;
  jumlah: number;
}

export interface HasilAnalitikDinas {
  bulananHari: DataBulananCuti[];
  bulananPengajuan: DataBulananPengajuanDinas[];
  komposisiStatus: SegmenDonat[];
  totalPengajuan: number;
  totalHariDisetujui: number;
}

function persenAman(nilai: number, pembagi: number): number {
  if (!Number.isFinite(nilai) || !Number.isFinite(pembagi) || pembagi <= 0 || nilai <= 0) return 0;
  return Math.min(100, Math.round((nilai / pembagi) * 100));
}

function rentangMenyentuhTahun(mulai: Date, selesai: Date, tahun: number): boolean {
  if (Number.isNaN(mulai.getTime()) || Number.isNaN(selesai.getTime()) || selesai < mulai) return false;
  const awalTahun = Date.UTC(tahun, 0, 1);
  const akhirTahun = Date.UTC(tahun, 11, 31);
  return mulai.getTime() <= akhirTahun && selesai.getTime() >= awalTahun;
}

function termasukTahunAnalitik(p: PengajuanAnalitikInput, tahun: number): boolean {
  if (p.potongSaldoTahunan) {
    const tahunEfektif = p.tahunSaldo ?? p.tanggalMulai.getUTCFullYear();
    return tahunEfektif === tahun;
  }
  return rentangMenyentuhTahun(p.tanggalMulai, p.tanggalSelesai, tahun);
}

/**
 * Validasi daftar tahun & parameter `?tahun=YYYY` dengan aman.
 * Nilai tidak sah atau di luar daftar otomatis kembali ke `tahunSekarang`.
 */
export function pilihTahunBeranda(
  tahunDiminta: string | number | undefined | null,
  tahunSekarang: number,
  tahunDariDb: readonly number[],
): { tahun: number; tahunTersedia: number[] } {
  const himpunan = new Set<number>([tahunSekarang]);
  for (const t of tahunDariDb) {
    if (Number.isInteger(t) && t >= TAHUN_CUTI_MIN && t <= TAHUN_CUTI_MAKS) {
      himpunan.add(t);
    }
  }
  const tahunTersedia = [...himpunan].sort((a, b) => b - a);

  let kandidat: number | null = null;
  if (typeof tahunDiminta === "number" && Number.isInteger(tahunDiminta)) {
    kandidat = tahunDiminta;
  } else if (typeof tahunDiminta === "string" && /^\d{4}$/.test(tahunDiminta.trim())) {
    kandidat = Number.parseInt(tahunDiminta.trim(), 10);
  }

  const tahun = kandidat !== null && himpunan.has(kandidat) ? kandidat : tahunSekarang;
  return { tahun, tahunTersedia };
}

/**
 * Memecah jumlah hari sebuah pengajuan cuti ke 12 slot bulan (indeks 0 = Jan … 11 = Des)
 * pada `tahunTarget`, akurat untuk cuti lintas bulan maupun lintas tahun.
 */
export function bagiHariPerBulan(opsi: OpsiBagiBulan): number[] {
  const perBulan = Array<number>(12).fill(0);
  const {
    tanggalMulai,
    tanggalSelesai,
    jumlahHari,
    satuanHitung,
    tahunTarget,
    libur,
    hariKerja = HARI_KERJA_BAWAAN,
    rekonsiliasiKeJumlahHari = false,
  } = opsi;

  if (
    !Number.isFinite(jumlahHari) ||
    jumlahHari <= 0 ||
    Number.isNaN(tanggalMulai.getTime()) ||
    Number.isNaN(tanggalSelesai.getTime()) ||
    tanggalSelesai < tanggalMulai
  ) {
    return perBulan;
  }

  const awalTahunMs = Date.UTC(tahunTarget, 0, 1);
  const akhirTahunMs = Date.UTC(tahunTarget, 11, 31);
  const mulaiMs = tanggalMulai.getTime();
  const selesaiMs = tanggalSelesai.getTime();

  const potongMulai = Math.max(mulaiMs, awalTahunMs);
  const potongSelesai = Math.min(selesaiMs, akhirTahunMs);

  const setHariKerja = new Set(hariKerja);
  const punyaLibur = libur.size > 0;
  let bulanTerakhirTersentuh: number | null = null;

  if (potongMulai <= potongSelesai) {
    const maksAkhir = Math.min(potongSelesai, potongMulai + MAKS_RENTANG_HARI_KALENDER * SEHARI);
    const kursor = new Date(potongMulai);
    for (let t = potongMulai; t <= maksAkhir; t += SEHARI) {
      kursor.setTime(t);
      const dihitung =
        satuanHitung === "HARI_KALENDER"
          ? true
          : setHariKerja.has(hariIso(kursor)) && (!punyaLibur || !libur.has(kunciTanggal(kursor)));
      if (dihitung) {
        const m = kursor.getUTCMonth();
        perBulan[m] += 1;
        bulanTerakhirTersentuh = m;
      }
    }
  }

  const penuhDalamTahun =
    tanggalMulai.getUTCFullYear() === tahunTarget && tanggalSelesai.getUTCFullYear() === tahunTarget;

  if (rekonsiliasiKeJumlahHari || penuhDalamTahun) {
    const targetHari = Math.round(jumlahHari);
    const totalHitung = perBulan.reduce((a, b) => a + b, 0);
    const selisih = targetHari - totalHitung;

    if (selisih > 0) {
      let bulanPenyesuaian: number;
      if (bulanTerakhirTersentuh !== null) {
        bulanPenyesuaian = bulanTerakhirTersentuh;
      } else if (potongMulai <= potongSelesai) {
        bulanPenyesuaian = new Date(potongSelesai).getUTCMonth();
      } else if (selesaiMs < awalTahunMs) {
        bulanPenyesuaian = 0;
      } else {
        bulanPenyesuaian = 11;
      }
      perBulan[bulanPenyesuaian] += selisih;
    } else if (selisih < 0) {
      let kelebihan = -selisih;
      for (let m = 11; m >= 0 && kelebihan > 0; m -= 1) {
        const potong = Math.min(perBulan[m], kelebihan);
        perBulan[m] -= potong;
        kelebihan -= potong;
      }
    }
  }

  return perBulan;
}

/**
 * Menyusun seluruh data analitik halaman Beranda Mode Pegawai:
 * ringkasan angka, grafik batang 12 bulan, grafik garis tren saldo 13 titik,
 * donat komposisi jatah, komposisi jenis cuti, dan rincian kuota 3 tahun (N-2, N-1, N).
 */
export function susunAnalitikBeranda(input: {
  tahun: number;
  saldo: DataSaldo | null;
  dipesan: number;
  pengajuan: readonly PengajuanAnalitikInput[];
  libur: ReadonlySet<string>;
  hariKerja?: readonly number[];
}): HasilAnalitikBeranda {
  const { tahun, saldo, pengajuan, libur, hariKerja = HARI_KERJA_BAWAAN } = input;
  const dipesan = Math.max(0, Math.round(input.dipesan || 0));

  const bulanan: DataBulananCuti[] = NAMA_BULAN_SINGKAT.map((label, i) => ({
    bulan: i + 1,
    label,
    namaLengkap: NAMA_BULAN_PANJANG[i],
    tahunan: 0,
    lainnya: 0,
    total: 0,
  }));

  const petaJenis = new Map<string, KomposisiJenisCuti>();
  let totalPengajuanDisetujui = 0;
  let totalPengajuanDiproses = 0;

  for (const p of pengajuan) {
    if (!termasukTahunAnalitik(p, tahun)) continue;

    if (SET_DIPROSES.has(p.status)) {
      totalPengajuanDiproses += 1;
      continue;
    }
    if (!SET_DISETUJUI.has(p.status)) continue;

    totalPengajuanDisetujui += 1;
    const perBulan = bagiHariPerBulan({
      tanggalMulai: p.tanggalMulai,
      tanggalSelesai: p.tanggalSelesai,
      jumlahHari: p.jumlahHari,
      satuanHitung: p.satuanHitung,
      tahunTarget: tahun,
      libur,
      hariKerja,
      rekonsiliasiKeJumlahHari: p.potongSaldoTahunan,
    });

    let hariTahunIni = 0;
    for (let m = 0; m < 12; m += 1) {
      const h = perBulan[m];
      if (h <= 0) continue;
      hariTahunIni += h;
      if (p.potongSaldoTahunan) {
        bulanan[m].tahunan += h;
      } else {
        bulanan[m].lainnya += h;
      }
      bulanan[m].total = bulanan[m].tahunan + bulanan[m].lainnya;
    }

    const entri = petaJenis.get(p.kodeJenis) ?? {
      kode: p.kodeJenis,
      nama: p.namaJenis,
      hari: 0,
      jumlahPengajuan: 0,
    };
    entri.hari += hariTahunIni;
    entri.jumlahPengajuan += 1;
    petaJenis.set(p.kodeJenis, entri);
  }

  const terpakaiTercatatAplikasi = bulanan.reduce((sum, b) => sum + b.tahunan, 0);
  const cutiLainnyaHari = bulanan.reduce((sum, b) => sum + b.lainnya, 0);

  const hakTotal = saldo ? Math.max(0, totalHak(saldo)) : 0;
  const terpakai = saldo ? Math.max(0, saldo.terpakai) : 0;
  const tersedia = saldo ? saldoTersedia(saldo, dipesan) : 0;
  const terpakaiAwalImpor = Math.max(0, terpakai - terpakaiTercatatAplikasi);

  // Grafik garis tren sisa saldo: 13 titik (Awal + Jan..Des).
  const trenSaldo: TitikTrenSaldo[] = [];
  if (!saldo) {
    trenSaldo.push({
      indeks: 0,
      label: "Awal",
      namaLengkap: "Saldo Awal",
      sisa: 0,
      terpakaiBulan: 0,
      proyeksiSetelahDipesan: 0,
    });
    for (let m = 0; m < 12; m += 1) {
      trenSaldo.push({
        indeks: m + 1,
        label: NAMA_BULAN_SINGKAT[m],
        namaLengkap: NAMA_BULAN_PANJANG[m],
        sisa: 0,
        terpakaiBulan: 0,
        proyeksiSetelahDipesan: 0,
      });
    }
  } else {
    let sisaBerjalan = Math.max(0, hakTotal - terpakaiAwalImpor);
    trenSaldo.push({
      indeks: 0,
      label: "Awal",
      namaLengkap: "Saldo Awal",
      sisa: sisaBerjalan,
      terpakaiBulan: terpakaiAwalImpor,
      proyeksiSetelahDipesan: sisaBerjalan,
    });
    for (let m = 0; m < 12; m += 1) {
      const pakaiBulan = bulanan[m].tahunan;
      sisaBerjalan = Math.max(0, sisaBerjalan - pakaiBulan);
      trenSaldo.push({
        indeks: m + 1,
        label: NAMA_BULAN_SINGKAT[m],
        namaLengkap: NAMA_BULAN_PANJANG[m],
        sisa: sisaBerjalan,
        terpakaiBulan: pakaiBulan,
        proyeksiSetelahDipesan: m === 11 ? Math.max(0, sisaBerjalan - dipesan) : sisaBerjalan,
      });
    }
  }

  // Grafik donat komposisi jatah cuti tahunan.
  const dasarDonat = Math.max(hakTotal, tersedia + terpakai + dipesan);
  const komposisiKuota: SegmenDonat[] = [
    {
      kunci: "tersedia",
      label: "Tersedia",
      nilai: tersedia,
      persen: persenAman(tersedia, dasarDonat),
      warnaVar: "var(--chart-1)",
    },
    {
      kunci: "terpakai",
      label: "Terpakai",
      nilai: terpakai,
      persen: persenAman(terpakai, dasarDonat),
      warnaVar: "var(--chart-2)",
    },
    {
      kunci: "diproses",
      label: "Diproses",
      nilai: dipesan,
      persen: persenAman(dipesan, dasarDonat),
      warnaVar: "var(--chart-3)",
    },
  ];

  // Rincian kuota 3 tahun (N-2, N-1, tahun berjalan) — anti-NaN.
  const pakai = saldo ? rincianPemakaian(saldo) : { dariN2: 0, dariN1: 0, dariN: 0 };
  const hakN2 = saldo ? Math.max(0, saldo.sisaN2) : 0;
  const hakN1 = saldo ? Math.max(0, saldo.sisaN1) : 0;
  const hakN = saldo ? Math.max(0, saldo.hakTahunIni + saldo.penyesuaian) : 0;
  const pakaiN = Math.min(hakN, Math.max(0, pakai.dariN));

  const rincianKuota: RincianKuotaTahun[] = [
    {
      tahun: tahun - 2,
      label: `Sisa ${tahun - 2} (N-2)`,
      hak: hakN2,
      terpakai: pakai.dariN2,
      sisa: Math.max(0, hakN2 - pakai.dariN2),
      persenTerpakai: persenAman(pakai.dariN2, hakN2),
    },
    {
      tahun: tahun - 1,
      label: `Sisa ${tahun - 1} (N-1)`,
      hak: hakN1,
      terpakai: pakai.dariN1,
      sisa: Math.max(0, hakN1 - pakai.dariN1),
      persenTerpakai: persenAman(pakai.dariN1, hakN1),
    },
    {
      tahun,
      label: `Hak ${tahun} (Berjalan)`,
      hak: hakN,
      terpakai: pakaiN,
      sisa: Math.max(0, hakN - pakaiN),
      persenTerpakai: persenAman(pakaiN, hakN),
    },
  ];

  const komposisiJenis = [...petaJenis.values()].sort((a, b) => b.hari - a.hari || a.nama.localeCompare(b.nama, "id"));

  return {
    ringkasan: {
      totalHak: hakTotal,
      tersedia,
      terpakai,
      dipesan,
      terpakaiTercatatAplikasi,
      terpakaiAwalImpor,
      cutiLainnyaHari,
      totalPengajuanDisetujui,
      totalPengajuanDiproses,
      persenTerpakai: persenAman(terpakai, hakTotal),
    },
    bulanan,
    trenSaldo,
    komposisiKuota,
    komposisiJenis,
    rincianKuota,
  };
}

/**
 * Menyusun data analitik agregat skala dinas untuk Mode Admin tanpa data pegawai:
 * batang hari cuti disetujui per bulan, garis jumlah pengajuan per bulan, dan donat status pengajuan.
 */
export function susunAnalitikDinas(input: {
  tahun: number;
  pengajuan: readonly PengajuanAnalitikInput[];
  libur: ReadonlySet<string>;
  hariKerja?: readonly number[];
}): HasilAnalitikDinas {
  const { tahun, pengajuan, libur, hariKerja = HARI_KERJA_BAWAAN } = input;

  const bulananHari: DataBulananCuti[] = NAMA_BULAN_SINGKAT.map((label, i) => ({
    bulan: i + 1,
    label,
    namaLengkap: NAMA_BULAN_PANJANG[i],
    tahunan: 0,
    lainnya: 0,
    total: 0,
  }));

  const bulananPengajuan: DataBulananPengajuanDinas[] = NAMA_BULAN_SINGKAT.map((label, i) => ({
    bulan: i + 1,
    label,
    namaLengkap: NAMA_BULAN_PANJANG[i],
    jumlah: 0,
  }));

  let hitungDisetujui = 0;
  let hitungDiproses = 0;
  let hitungDitolak = 0;
  let hitungDibatalkan = 0;

  for (const p of pengajuan) {
    if (!termasukTahunAnalitik(p, tahun)) continue;

    // Tentukan bulan pengajuan pada tahun target (lintas tahun dirapatkan ke Jan/Des).
    const tahunMulai = p.tanggalMulai.getUTCFullYear();
    const bulanMasuk =
      tahunMulai < tahun ? 0 : tahunMulai > tahun ? 11 : p.tanggalMulai.getUTCMonth();
    bulananPengajuan[bulanMasuk].jumlah += 1;

    if (SET_DISETUJUI.has(p.status)) {
      hitungDisetujui += 1;
      const perBulan = bagiHariPerBulan({
        tanggalMulai: p.tanggalMulai,
        tanggalSelesai: p.tanggalSelesai,
        jumlahHari: p.jumlahHari,
        satuanHitung: p.satuanHitung,
        tahunTarget: tahun,
        libur,
        hariKerja,
        rekonsiliasiKeJumlahHari: p.potongSaldoTahunan,
      });
      for (let m = 0; m < 12; m += 1) {
        const h = perBulan[m];
        if (h <= 0) continue;
        if (p.potongSaldoTahunan) {
          bulananHari[m].tahunan += h;
        } else {
          bulananHari[m].lainnya += h;
        }
        bulananHari[m].total = bulananHari[m].tahunan + bulananHari[m].lainnya;
      }
    } else if (SET_DIPROSES.has(p.status)) {
      hitungDiproses += 1;
    } else if (p.status === "DITOLAK") {
      hitungDitolak += 1;
    } else if (p.status === "DIBATALKAN") {
      hitungDibatalkan += 1;
    }
  }

  const totalPengajuan = hitungDisetujui + hitungDiproses + hitungDitolak + hitungDibatalkan;
  const totalHariDisetujui = bulananHari.reduce((sum, b) => sum + b.total, 0);

  const komposisiStatus: SegmenDonat[] = [
    {
      kunci: "disetujui",
      label: "Disetujui / Selesai",
      nilai: hitungDisetujui,
      persen: persenAman(hitungDisetujui, totalPengajuan),
      warnaVar: "var(--chart-1)",
    },
    {
      kunci: "diproses",
      label: "Sedang Diproses",
      nilai: hitungDiproses,
      persen: persenAman(hitungDiproses, totalPengajuan),
      warnaVar: "var(--chart-3)",
    },
    {
      kunci: "ditolak",
      label: "Ditolak",
      nilai: hitungDitolak,
      persen: persenAman(hitungDitolak, totalPengajuan),
      warnaVar: "var(--chart-4)",
    },
    {
      kunci: "dibatalkan",
      label: "Dibatalkan",
      nilai: hitungDibatalkan,
      persen: persenAman(hitungDibatalkan, totalPengajuan),
      warnaVar: "var(--chart-5)",
    },
  ];

  return {
    bulananHari,
    bulananPengajuan,
    komposisiStatus,
    totalPengajuan,
    totalHariDisetujui,
  };
}
