import type { LevelSurat, StatusAbsen, StatusCuti, TahapPersetujuan } from "@/lib/generated/prisma/enums";

export const LABEL_STATUS_CUTI: Record<StatusCuti, string> = {
  DIAJUKAN: "Diajukan",
  DISETUJUI_ATASAN: "Disetujui Atasan",
  DIVERIFIKASI: "Diverifikasi Kepegawaian",
  DISETUJUI: "Disetujui",
  SURAT_TERBIT: "Surat Terbit",
  SELESAI: "Selesai",
  DITOLAK: "Ditolak",
  DIBATALKAN: "Dibatalkan",
};

/** Kelas warna badge status cuti (kontras teks ≥ 4.5:1). */
export const WARNA_STATUS_CUTI: Record<StatusCuti, string> = {
  DIAJUKAN: "bg-sky-100 text-sky-900",
  DISETUJUI_ATASAN: "bg-sky-100 text-sky-900",
  DIVERIFIKASI: "bg-indigo-100 text-indigo-900",
  DISETUJUI: "bg-emerald-100 text-emerald-900",
  SURAT_TERBIT: "bg-emerald-100 text-emerald-900",
  SELESAI: "bg-slate-200 text-slate-800",
  DITOLAK: "bg-red-100 text-red-900",
  DIBATALKAN: "bg-slate-200 text-slate-700",
};

export const LABEL_STATUS_ABSEN: Record<StatusAbsen, string> = {
  HADIR: "Hadir",
  TERLAMBAT: "Terlambat",
  CUTI: "Cuti",
  DINAS_LUAR: "Dinas Luar",
  SAKIT: "Sakit",
  IZIN: "Izin",
  TUGAS: "Tugas",
  ALPA: "Alpa",
};

export const WARNA_STATUS_ABSEN: Record<StatusAbsen, string> = {
  HADIR: "bg-emerald-100 text-emerald-900",
  TERLAMBAT: "bg-amber-100 text-amber-900",
  CUTI: "bg-sky-100 text-sky-900",
  DINAS_LUAR: "bg-indigo-100 text-indigo-900",
  SAKIT: "bg-violet-100 text-violet-900",
  IZIN: "bg-slate-200 text-slate-800",
  TUGAS: "bg-indigo-100 text-indigo-900",
  ALPA: "bg-red-100 text-red-900",
};

export const LABEL_LEVEL_SURAT: Record<LevelSurat, string> = {
  ESELON_II: "Eselon II",
  ESELON_III: "Eselon III",
  ESELON_IV: "Eselon IV",
  STAF: "Staf",
};

export const LABEL_TAHAP: Record<TahapPersetujuan, string> = {
  ATASAN_LANGSUNG: "Persetujuan atasan langsung",
  KEPEGAWAIAN: "Verifikasi Kepegawaian",
  PEJABAT_BERWENANG: "Persetujuan Kepegawaian/Admin",
};
