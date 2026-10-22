import type { KategoriDokumenPribadi } from "@/lib/generated/prisma/enums";

export const LABEL_KATEGORI: Record<KategoriDokumenPribadi, string> = {
  SK_CPNS: "SK CPNS / PNS",
  SK_PPPK: "SK PPPK",
  SK_PANGKAT: "SK Pangkat",
  SK_JABATAN: "SK Jabatan",
  IJAZAH: "Ijazah & transkrip",
  KTP: "KTP",
  KK: "Kartu Keluarga",
  LAINNYA: "Lainnya",
};

export const KATEGORI_PRIBADI = Object.keys(LABEL_KATEGORI) as KategoriDokumenPribadi[];

/** Ekstensi yang boleh diunggah (spesifikasi [9]). */
export const EKSTENSI_DOKUMEN = ["pdf", "jpg", "jpeg", "png", "docx", "xlsx"] as const;
export const ACCEPT_DOKUMEN = ".pdf,.jpg,.jpeg,.png,.docx,.xlsx";

/** Maksimal berkas & total ukuran sekali cetak gabungan. */
export const MAKS_GABUNG = { berkas: 30, byte: 60 * 1024 * 1024 };

export function formatUkuran(byte: number): string {
  if (byte < 1024) return `${byte} B`;
  if (byte < 1024 * 1024) return `${Math.round(byte / 1024)} KB`;
  return `${(byte / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}
