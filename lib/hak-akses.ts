import type { HakAkses } from "@/lib/generated/prisma/enums";

export type { HakAkses };

export interface InfoHakAkses {
  kode: HakAkses;
  label: string;
  deskripsi: string;
}

export const DAFTAR_HAK_AKSES: readonly InfoHakAkses[] = [
  {
    kode: "KELOLA_SALDO_CUTI",
    label: "Saldo & Rekap Cuti",
    deskripsi: "Mengelola saldo cuti tahunan, penyesuaian, tutup tahun, serta cetak dan ekspor rekap cuti.",
  },
  {
    kode: "PROSES_CUTI",
    label: "Proses Cuti",
    deskripsi: "Memverifikasi pengajuan cuti, mencatat keputusan, serta menyiapkan dan mencetak surat cuti.",
  },
  {
    kode: "KELOLA_PEGAWAI",
    label: "Data Pegawai",
    deskripsi: "Menambah dan mengubah data pegawai, membuka data sensitif, serta impor dan ekspor Excel.",
  },
  {
    kode: "KELOLA_DOKUMEN_ORGANISASI",
    label: "Dokumen Organisasi",
    deskripsi: "Mengunggah, mengubah, dan menghapus berkas di seluruh folder dokumen organisasi.",
  },
  {
    kode: "PENGATURAN_ADMIN",
    label: "Pengaturan Admin",
    deskripsi: "Mengakses menu sistem Admin, master data, template surat, hari libur, dan audit log.",
  },
] as const;

export const SEMUA_HAK_AKSES: readonly HakAkses[] = DAFTAR_HAK_AKSES.map((h) => h.kode);

export const LABEL_HAK_AKSES: Record<HakAkses, string> = {
  KELOLA_SALDO_CUTI: "Saldo & Rekap Cuti",
  PROSES_CUTI: "Proses Cuti",
  KELOLA_PEGAWAI: "Data Pegawai",
  KELOLA_DOKUMEN_ORGANISASI: "Dokumen Organisasi",
  PENGATURAN_ADMIN: "Pengaturan Admin",
};

export const DESKRIPSI_HAK_AKSES: Record<HakAkses, string> = {
  KELOLA_SALDO_CUTI: "Mengelola saldo cuti tahunan, penyesuaian, tutup tahun, serta cetak dan ekspor rekap cuti.",
  PROSES_CUTI: "Memverifikasi pengajuan cuti, mencatat keputusan, serta menyiapkan dan mencetak surat cuti.",
  KELOLA_PEGAWAI: "Menambah dan mengubah data pegawai, membuka data sensitif, serta impor dan ekspor Excel.",
  KELOLA_DOKUMEN_ORGANISASI: "Mengunggah, mengubah, dan menghapus berkas di seluruh folder dokumen organisasi.",
  PENGATURAN_ADMIN: "Mengakses menu sistem Admin, master data, template surat, hari libur, dan audit log.",
};

export const HAK_AKSES_BAWAAN_KEPEGAWAIAN: readonly HakAkses[] = [
  "KELOLA_SALDO_CUTI",
  "PROSES_CUTI",
  "KELOLA_PEGAWAI",
];
