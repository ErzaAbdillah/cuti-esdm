import type { StatusCuti, TahapPersetujuan } from "@/lib/generated/prisma/enums";

/** Status yang dicapai saat sebuah tahap disetujui. */
export const STATUS_SETELAH_TAHAP: Record<TahapPersetujuan, StatusCuti> = {
  ATASAN_LANGSUNG: "DISETUJUI_ATASAN",
  KEPEGAWAIAN: "DIVERIFIKASI",
  PEJABAT_BERWENANG: "DISETUJUI",
};

/** Urutan status dalam proses persetujuan. */
const URUTAN: StatusCuti[] = ["DIAJUKAN", "DISETUJUI_ATASAN", "DIVERIFIKASI", "DISETUJUI", "SURAT_TERBIT", "SELESAI"];

export const STATUS_AKHIR: ReadonlySet<StatusCuti> = new Set(["SELESAI", "DITOLAK", "DIBATALKAN"]);
/** Pengajuan yang masih "memesan" saldo dan menghalangi tanggal yang sama. */
export const STATUS_DIPROSES: StatusCuti[] = ["DIAJUKAN", "DISETUJUI_ATASAN", "DIVERIFIKASI"];
export const STATUS_DISETUJUI: StatusCuti[] = ["DISETUJUI", "SURAT_TERBIT", "SELESAI"];

/**
 * Tahap yang sedang menunggu keputusan, atau null bila tidak ada.
 * `tahapan` = urutan tahap aktif untuk level surat pemohon (konfigurasi Admin);
 * tahap atasan dilewati bila pemohon tidak punya atasan langsung di dinas.
 */
export function tahapMenunggu(status: StatusCuti, tahapan: readonly TahapPersetujuan[], punyaAtasan: boolean): TahapPersetujuan | null {
  if (STATUS_AKHIR.has(status) || URUTAN.indexOf(status) >= URUTAN.indexOf("DISETUJUI")) return null;
  const aktif = tahapan.filter((t) => t !== "ATASAN_LANGSUNG" || punyaAtasan);
  const posisi = URUTAN.indexOf(status);
  return aktif.find((t) => URUTAN.indexOf(STATUS_SETELAH_TAHAP[t]) > posisi) ?? null;
}

/** Penolakan hanya sebelum keputusan pejabat. */
export function bisaDitolak(status: StatusCuti): boolean {
  return STATUS_DIPROSES.includes(status);
}

/** Pegawai boleh membatalkan sebelum tanggal mulai, selama belum berstatus akhir. */
export function bisaDibatalkan(status: StatusCuti, tanggalMulai: Date, hariIni: Date): boolean {
  return !STATUS_AKHIR.has(status) && hariIni.getTime() < tanggalMulai.getTime();
}

/** Surat dianggap terbit setelah keputusan pejabat. */
export function bisaTerbitSurat(status: StatusCuti): boolean {
  return status === "DISETUJUI";
}

/** Selesai otomatis sehari setelah tanggal selesai, untuk cuti yang suratnya sudah terbit. */
export function harusSelesai(status: StatusCuti, tanggalSelesai: Date, hariIni: Date): boolean {
  return status === "SURAT_TERBIT" && hariIni.getTime() > tanggalSelesai.getTime();
}
