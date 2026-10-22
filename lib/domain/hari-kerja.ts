/**
 * Perhitungan hari kerja. Semua tanggal adalah Date tengah malam UTC
 * (bentuk kolom @db.Date), sehingga tidak terpengaruh zona waktu server.
 */

/** Senin = 1 … Minggu = 7 (ISO). */
export type HariIso = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const HARI_KERJA_BAWAAN: HariIso[] = [1, 2, 3, 4, 5];

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

export function hitungHariKerja(mulai: Date, selesai: Date, libur: ReadonlySet<string>, hariKerja: readonly number[] = HARI_KERJA_BAWAAN): number {
  if (selesai < mulai) return 0;
  return daftarTanggal(mulai, selesai).filter((d) => adalahHariKerja(d, libur, hariKerja)).length;
}

export function hitungHariKalender(mulai: Date, selesai: Date): number {
  if (selesai < mulai) return 0;
  return Math.round((selesai.getTime() - mulai.getTime()) / SEHARI) + 1;
}
