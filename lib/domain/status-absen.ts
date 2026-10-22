import type { JenisKeterangan, StatusAbsen } from "@/lib/generated/prisma/enums";
import { hariIniWita, ZONA_WAKTU } from "@/lib/tanggal";

/** "07:30" → 450 menit; null bila format salah. */
export function parseJam(jam: string | null | undefined): number | null {
  const m = jam?.match(/^([01]?\d|2[0-3])[:.]([0-5]\d)$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** Menit sejak tengah malam WITA untuk sebuah timestamp. */
export function menitWita(waktu: Date): number {
  const [j, m] = new Intl.DateTimeFormat("en-GB", { timeZone: ZONA_WAKTU, hour: "2-digit", minute: "2-digit", hour12: false })
    .format(waktu)
    .split(":")
    .map(Number);
  return (j % 24) * 60 + m;
}

export interface AturanAbsen {
  /** null = belum diisi Admin ([ISI]). */
  jamMasuk: string | null;
  toleransiMenit: number | null;
  batasAlpa: string | null;
}

/**
 * Status absen mandiri: Terlambat bila lewat jam masuk + toleransi.
 * Selama jam masuk belum diatur, semua absen dihitung Hadir.
 */
export function statusAbsenMandiri(waktu: Date, aturan: AturanAbsen): "HADIR" | "TERLAMBAT" {
  const jamMasuk = parseJam(aturan.jamMasuk);
  if (jamMasuk == null) return "HADIR";
  return menitWita(waktu) > jamMasuk + (aturan.toleransiMenit ?? 0) ? "TERLAMBAT" : "HADIR";
}

/** Apakah batas alpa untuk `tanggal` sudah lewat pada saat `sekarang`. Tanpa batas → tidak pernah. */
export function lewatBatasAlpa(tanggal: Date, sekarang: Date, aturan: Pick<AturanAbsen, "batasAlpa">): boolean {
  const batas = parseJam(aturan.batasAlpa);
  if (batas == null) return false;
  const hariIni = hariIniWita(sekarang);
  if (tanggal.getTime() < hariIni.getTime()) return true;
  if (tanggal.getTime() > hariIni.getTime()) return false;
  return menitWita(sekarang) >= batas;
}

/** WITA tidak mengenal DST, jadi offset tetap +8 jam. */
const OFFSET_WITA_MS = 8 * 60 * 60 * 1000;

/**
 * Pegawai wajib absen online pada `tanggal` bila akunnya sudah ada sebelum batas
 * alpa hari itu. Hari sebelum akun dibuat — atau hari akun dibuat setelah batas —
 * tidak dihitung Alpa.
 */
export function wajibAbsenPada(tanggal: Date, akunSejak: Date | null | undefined, batasAlpa: string | null = "23:59"): boolean {
  if (!akunSejak) return false;
  const batas = parseJam(batasAlpa) ?? 24 * 60;
  const batasHariItu = tanggal.getTime() - OFFSET_WITA_MS + batas * 60 * 1000;
  return akunSejak.getTime() < batasHariItu;
}

export const STATUS_DARI_KETERANGAN: Record<JenisKeterangan, StatusAbsen> = {
  DINAS_LUAR: "DINAS_LUAR",
  SAKIT: "SAKIT",
  IZIN: "IZIN",
  TUGAS: "TUGAS",
};

/**
 * Status akhir satu hari. Prioritas: cuti disetujui > keterangan
 * (dinas luar/sakit/izin/tugas) > absen mandiri > alpa (hanya bila batas lewat
 * dan pegawai memang wajib absen online). null = belum ada status.
 */
export function statusHarian(p: {
  cuti: boolean;
  keterangan: JenisKeterangan | null;
  mandiri: "HADIR" | "TERLAMBAT" | null;
  lewatBatas: boolean;
  wajibAbsenOnline: boolean;
}): StatusAbsen | null {
  if (p.cuti) return "CUTI";
  if (p.keterangan) return STATUS_DARI_KETERANGAN[p.keterangan];
  if (p.mandiri) return p.mandiri;
  if (p.lewatBatas && p.wajibAbsenOnline) return "ALPA";
  return null;
}
