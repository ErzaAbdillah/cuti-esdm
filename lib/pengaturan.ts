/**
 * Definisi kunci pengaturan aplikasi. Dipakai seeder (nilai awal) dan
 * halaman Admin (label, validasi). Nilai `null` berarti masih "[ISI]":
 * belum ada di dokumen acuan dan harus diisi Admin.
 */

export type TipePengaturan = "teks" | "angka" | "jam" | "daftar-hari" | "daftar-teks";

export interface DefPengaturan {
  kunci: string;
  kelompok: "Instansi" | "Absen" | "Cuti" | "Surat" | "Dokumen";
  label: string;
  deskripsi: string;
  tipe: TipePengaturan;
  nilaiAwal: unknown;
  /** Wajib diisi sebelum fitur terkait berjalan penuh (banner [ISI]). */
  wajib?: boolean;
}

export const DEF_PENGATURAN: DefPengaturan[] = [
  // ── Instansi (kop surat & daftar hadir) ──
  { kunci: "instansi.pemerintah", kelompok: "Instansi", label: "Baris kop 1", deskripsi: "Nama pemerintah daerah pada kop surat.", tipe: "teks", nilaiAwal: "PEMERINTAH PROVINSI KALIMANTAN SELATAN" },
  { kunci: "instansi.nama", kelompok: "Instansi", label: "Baris kop 2", deskripsi: "Nama dinas pada kop surat.", tipe: "teks", nilaiAwal: "DINAS ENERGI DAN SUMBER DAYA MINERAL" },
  { kunci: "instansi.nama_lengkap", kelompok: "Instansi", label: "Nama lengkap dinas", deskripsi: "Dipakai di isi surat dan blok identitas (Satuan Organisasi).", tipe: "teks", nilaiAwal: "Dinas Energi dan Sumber Daya Mineral Provinsi Kalimantan Selatan" },
  { kunci: "instansi.alamat", kelompok: "Instansi", label: "Alamat", deskripsi: "Alamat pada kop surat.", tipe: "teks", nilaiAwal: "Jalan Pangeran Suriansyah No.7 Banjarbaru, Kalimantan Selatan" },
  { kunci: "instansi.kode_pos", kelompok: "Instansi", label: "Kode pos", deskripsi: "", tipe: "teks", nilaiAwal: "70711" },
  { kunci: "instansi.telepon", kelompok: "Instansi", label: "Telepon", deskripsi: "", tipe: "teks", nilaiAwal: "(0511) 4772479, 4772227" },
  { kunci: "instansi.fax", kelompok: "Instansi", label: "Fax", deskripsi: "", tipe: "teks", nilaiAwal: "(0511) 4774155" },
  { kunci: "instansi.email", kelompok: "Instansi", label: "Email", deskripsi: "", tipe: "teks", nilaiAwal: "esdmprovkalsel@yahoo.com" },
  { kunci: "instansi.website", kelompok: "Instansi", label: "Website", deskripsi: "", tipe: "teks", nilaiAwal: "desdm.kalselprov.go.id" },
  { kunci: "instansi.kota", kelompok: "Instansi", label: "Kota surat", deskripsi: "Tempat pada baris tanggal surat.", tipe: "teks", nilaiAwal: "Banjarbaru" },
  { kunci: "instansi.judul_daftar_hadir", kelompok: "Instansi", label: "Kop daftar hadir", deskripsi: "Baris kedua judul DAFTAR HADIR MASUK KERJA.", tipe: "teks", nilaiAwal: "DINAS ENERGI DAN SUMBER DAYA MINERAL PROV. KAL SEL" },

  // ── Absen ──
  { kunci: "absen.jam_masuk", kelompok: "Absen", label: "Jam masuk", deskripsi: "Format JJ:MM (WITA). Selama kosong, status absen selalu Hadir.", tipe: "jam", nilaiAwal: null, wajib: true },
  { kunci: "absen.toleransi_terlambat_menit", kelompok: "Absen", label: "Toleransi terlambat (menit)", deskripsi: "Absen setelah jam masuk + toleransi berstatus Terlambat.", tipe: "angka", nilaiAwal: null, wajib: true },
  { kunci: "absen.batas_alpa", kelompok: "Absen", label: "Batas alpa", deskripsi: "Format JJ:MM (WITA). Setelah jam ini, pegawai tanpa absen/keterangan ditandai Alpa.", tipe: "jam", nilaiAwal: null, wajib: true },
  { kunci: "absen.hari_kerja", kelompok: "Absen", label: "Hari kerja", deskripsi: "1 = Senin … 7 = Minggu.", tipe: "daftar-hari", nilaiAwal: [1, 2, 3, 4, 5] },
  { kunci: "absen.jaringan_kantor", kelompok: "Absen", label: "Jaringan kantor (IP/CIDR)", deskripsi: "Jika diisi, Absen Masuk hanya diterima dari alamat ini. Kosong = dari mana saja.", tipe: "daftar-teks", nilaiAwal: [] },

  // ── Cuti ──
  { kunci: "cuti.maks_sisa_n1", kelompok: "Cuti", label: "Maks. sisa cuti N-1", deskripsi: "Sisa cuti tahunan tahun lalu yang boleh dibawa (PP 11/2017 Ps. 312).", tipe: "angka", nilaiAwal: 6 },
  { kunci: "cuti.maks_sisa_n2", kelompok: "Cuti", label: "Maks. sisa cuti N-2", deskripsi: "Sisa cuti dua tahun lalu yang boleh dibawa bila tidak diambil 2 tahun berturut-turut.", tipe: "angka", nilaiAwal: 6 },

  // ── Surat ──
  { kunci: "surat.klasifikasi", kelompok: "Surat", label: "Kode klasifikasi", deskripsi: "Bagian {klasifikasi} pada format nomor surat.", tipe: "teks", nilaiAwal: "800.1.11.4" },
  { kunci: "surat.kode_instansi", kelompok: "Surat", label: "Kode instansi", deskripsi: "Bagian kode instansi pada nomor surat.", tipe: "teks", nilaiAwal: "DESDM" },
  { kunci: "daftar_hadir.ukuran_kertas", kelompok: "Surat", label: "Kertas daftar hadir", deskripsi: "legal (form fisik), a4, atau f4.", tipe: "teks", nilaiAwal: "legal" },

  // ── Dokumen ──
  { kunci: "dokumen.maks_ukuran_mb", kelompok: "Dokumen", label: "Ukuran maks. unggahan (MB)", deskripsi: "", tipe: "angka", nilaiAwal: 10 },
];

export const PETA_PENGATURAN = new Map(DEF_PENGATURAN.map((d) => [d.kunci, d]));
