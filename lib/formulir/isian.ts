/**
 * Isian Formulir Permintaan dan Pemberian Cuti (format BKN, seperti
 * "FORMULIR CUTI untuk Staf/Eselon 2–4 2026.docx"). Semua teks bisa diubah
 * pegawai sebelum dicetak; nilai awal disiapkan dari data pegawai & level surat.
 */
import type { IsianNotaDinas } from "./nota-dinas";

export interface Pejabat {
  /** Boleh beberapa baris, mis. "Plt. Kepala Dinas …\nProvinsi Kalimantan Selatan". */
  jabatan: string;
  nama: string;
  nip: string;
}

export interface BarisSisaCuti {
  tahun: string;
  sisa: string;
  keterangan: string;
}

export interface IsianFormulir {
  /** YYYY-MM-DD; hari dikosongkan untuk diisi tangan bila `hariKosong`. */
  tanggalSurat: string;
  hariKosong: boolean;
  /** Blok "Kepada Yth." — satu baris per baris cetak, tanpa kata "Yth.". */
  kepada: string;
  nama: string;
  nip: string;
  jabatan: string;
  masaKerja: string;
  unitKerja: string;
  /** Mis. "12 (dua belas) hari kerja". */
  lamanya: string;
  catatanTahunan: [BarisSisaCuti, BarisSisaCuti, BarisSisaCuti];
  /** Keterangan untuk cuti besar, sakit, melahirkan, alasan penting, CLTN. */
  catatanLain: [string, string, string, string, string];
  telp: string;
  atasan: Pejabat;
  pejabat: Pejabat;
  /** Hanya Eselon II & III: nota dinas pengantar yang dicetak bersama formulir. */
  notaDinas?: IsianNotaDinas;
}

/** Urutan kotak "Jenis cuti yang diambil" pada formulir BKN. */
export const JENIS_FORMULIR = [
  { kode: "TAHUNAN", label: "Cuti Tahunan", catatan: "CUTI TAHUNAN" },
  { kode: "BESAR", label: "Cuti Besar", catatan: "CUTI BESAR" },
  { kode: "SAKIT", label: "Cuti Sakit", catatan: "CUTI SAKIT" },
  { kode: "MELAHIRKAN", label: "Cuti Melahirkan", catatan: "CUTI MELAHIRKAN" },
  { kode: "ALASAN_PENTING", label: "Cuti Karena Alasan Penting", catatan: "CUTI KARENA ALASAN PENTING" },
  { kode: "CLTN", label: "Cuti di Luar Tanggungan Negara", catatan: "CUTI DI LUAR TANGGUNGAN NEGARA" },
] as const;

/** Data pengajuan (kolom terstruktur) yang ikut tercetak di formulir. */
export interface DataPengajuanFormulir {
  jenisKode: string;
  /** Sudah diformat, mis. "12 Januari 2026". */
  tanggalMulai: string;
  tanggalSelesai: string;
  alasan: string;
  alamat: string;
}

/** "12 (dua belas) hari kerja" dari jumlah & terbilang. */
export function teksLamanya(jumlah: number, terbilangHari: string, satuan: string): string {
  return `${jumlah} (${terbilangHari}) ${satuan}`;
}
