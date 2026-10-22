/**
 * Placeholder yang boleh dipakai di template surat ({{kunci}}).
 * Nilainya diisi dari database saat surat dibuat; identitas tidak bisa
 * diubah lewat editor oleh pemohon.
 */
export const PLACEHOLDER_SURAT = [
  { kunci: "blok_identitas", label: "Tabel Nama / NIP / Pangkat / Jabatan / Satuan Organisasi (terkunci)" },
  { kunci: "nama", label: "Nama lengkap dengan gelar" },
  { kunci: "nip", label: "NIP berspasi, mis. 19800326 200803 1 002" },
  { kunci: "pangkat_golongan", label: "Pangkat – golongan, mis. Penata Tingkat I – III/d" },
  { kunci: "jabatan", label: "Nama jabatan lengkap" },
  { kunci: "satuan_organisasi", label: "Nama lengkap dinas" },
  { kunci: "sebutan_status", label: "Pegawai Negeri Sipil / Pegawai Pemerintah dengan Perjanjian Kerja" },
  { kunci: "jenis_cuti", label: "Mis. Cuti Tahunan" },
  { kunci: "jenis_cuti_kecil", label: "Mis. cuti tahunan" },
  { kunci: "tahun", label: "Tahun cuti" },
  { kunci: "jumlah_hari", label: "Angka, mis. 8" },
  { kunci: "jumlah_hari_terbilang", label: "Terbilang, mis. delapan" },
  { kunci: "satuan_hari", label: "hari kerja / hari kalender" },
  { kunci: "tanggal_mulai", label: "Mis. 01 Juli 2026" },
  { kunci: "tanggal_selesai", label: "Mis. 10 Juli 2026" },
  { kunci: "alamat_cuti", label: "Alamat selama cuti" },
  { kunci: "alasan", label: "Alasan cuti" },
  { kunci: "kepala_bidang_pemohon", label: "Jabatan kepala Bidang/Sekretariat/UPTD pemohon" },
  { kunci: "atasan_langsung_jabatan", label: "Jabatan atasan langsung pemohon" },
] as const;

export type KunciPlaceholder = (typeof PLACEHOLDER_SURAT)[number]["kunci"];

/** Tata letak surat; menentukan bagian kepala & penutup yang dirender sistem. */
export type TataLetakSurat = "NOTA_DINAS" | "SURAT" | "SURAT_IZIN";

export const TATA_LETAK_DOKUMEN: Record<string, TataLetakSurat> = {
  NOTA_DINAS_GUBERNUR: "NOTA_DINAS",
  NOTA_DINAS_SEKDA: "NOTA_DINAS",
  PERMOHONAN_BKD: "SURAT",
  SURAT_IZIN: "SURAT_IZIN",
};
