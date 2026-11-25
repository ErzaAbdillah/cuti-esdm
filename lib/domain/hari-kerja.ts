/**
 * Perhitungan hari kerja. Semua tanggal adalah Date tengah malam UTC
 * (bentuk kolom @db.Date), sehingga tidak terpengaruh zona waktu server.
 */

/** Senin = 1 … Minggu = 7 (ISO). */
export type HariIso = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const HARI_KERJA_BAWAAN: HariIso[] = [1, 2, 3, 4, 5];

export const TAHUN_CUTI_MIN = 2000;
export const TAHUN_CUTI_MAKS = 2100;
/** Batas wajar rentang cuti kalender (cukup untuk CLTN hingga 3 tahun = ~1.096 hari). */
export const MAKS_RENTANG_HARI_KALENDER = 1100;

const SEHARI = 24 * 60 * 60 * 1000;

export function kunciTanggal(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function tanggalDari(teks: string): Date {
  return new Date(`${teks}T00:00:00Z`);
}

export function hariIso(d: Date): HariIso {
  const h = d.getUTCDay();
  return (h === 0 ? 7 : h) as HariIso;
}

/** Hari kerja = hari kerja mingguan dan bukan libur nasional/cuti bersama/libur daerah. */
export function adalahHariKerja(d: Date, libur: ReadonlySet<string>, hariKerja: readonly number[] = HARI_KERJA_BAWAAN): boolean {
  return hariKerja.includes(hariIso(d)) && !libur.has(kunciTanggal(d));
}

export function daftarTanggal(mulai: Date, selesai: Date): Date[] {
  const hasil: Date[] = [];
  for (let t = mulai.getTime(); t <= selesai.getTime(); t += SEHARI) hasil.push(new Date(t));
  return hasil;
}

/** Periksa kewajaran tahun & panjang rentang tanggal sebelum menghitung hari kerja atau mengambil libur dari DB. */
export function cekRentangTanggalCuti(mulai: Date, selesai: Date): string | null {
  if (Number.isNaN(mulai.getTime()) || Number.isNaN(selesai.getTime())) {
    return "Tanggal cuti tidak valid.";
  }
  const tahunMulai = mulai.getUTCFullYear();
  const tahunSelesai = selesai.getUTCFullYear();
  if (tahunMulai < TAHUN_CUTI_MIN || tahunMulai > TAHUN_CUTI_MAKS || tahunSelesai < TAHUN_CUTI_MIN || tahunSelesai > TAHUN_CUTI_MAKS) {
    return `Tahun tanggal cuti harus berada di antara ${TAHUN_CUTI_MIN} dan ${TAHUN_CUTI_MAKS}.`;
  }
  if (selesai < mulai) {
    return "Tanggal selesai sebelum tanggal mulai.";
  }
  if (hitungHariKalender(mulai, selesai) > MAKS_RENTANG_HARI_KALENDER) {
    return `Rentang tanggal cuti terlalu panjang (maksimal ${MAKS_RENTANG_HARI_KALENDER} hari kalender).`;
  }
  return null;
}

/** Hitung hari kerja dalam O(1) memori tanpa menumpuk seluruh objek tanggal di array. */
export function hitungHariKerja(mulai: Date, selesai: Date, libur: ReadonlySet<string>, hariKerja: readonly number[] = HARI_KERJA_BAWAAN): number {
  if (selesai < mulai) return 0;
  const setHari = new Set(hariKerja);
  if (setHari.size === 0) return 0;
  let jumlah = 0;
  const punyaLibur = libur.size > 0;
  const kursor = new Date(mulai.getTime());
  for (let t = mulai.getTime(), akhir = selesai.getTime(); t <= akhir; t += SEHARI) {
    kursor.setTime(t);
    if (!setHari.has(hariIso(kursor))) continue;
    if (punyaLibur && libur.has(kunciTanggal(kursor))) continue;
    jumlah += 1;
  }
  return jumlah;
}

export function hitungHariKalender(mulai: Date, selesai: Date): number {
  if (selesai < mulai) return 0;
  return Math.round((selesai.getTime() - mulai.getTime()) / SEHARI) + 1;
}
