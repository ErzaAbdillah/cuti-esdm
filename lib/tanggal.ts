/** Zona waktu kantor: Banjarbaru (WITA, UTC+8). */
export const ZONA_WAKTU = "Asia/Makassar";

/**
 * Kolom @db.Date dikembalikan Prisma sebagai Date tengah malam UTC.
 * Fungsi ini membuat nilai yang sama untuk "hari ini" menurut WITA.
 */
export function hariIniWita(sekarang = new Date()): Date {
  const s = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_WAKTU, year: "numeric", month: "2-digit", day: "2-digit" }).format(sekarang);
  return new Date(`${s}T00:00:00Z`);
}

/** "01 Juli 2026" — untuk kolom tanggal (tanpa jam). */
export function formatTanggal(d: Date | null | undefined, opsi: { hari?: boolean } = {}): string {
  if (!d) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "UTC",
    weekday: opsi.hari ? "long" : undefined,
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
}

/** "07.42" WITA — untuk timestamp. */
export function formatJam(d: Date | null | undefined): string {
  if (!d) return "-";
  return new Intl.DateTimeFormat("id-ID", { timeZone: ZONA_WAKTU, hour: "2-digit", minute: "2-digit" }).format(d);
}

/** "22 Okt 2026 07.42" — untuk timestamp. */
export function formatTanggalJam(d: Date | null | undefined): string {
  if (!d) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: ZONA_WAKTU,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
