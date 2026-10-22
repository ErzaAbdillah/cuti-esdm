/** Data contoh (fiktif) untuk pratinjau template di halaman Admin. */
import type { KunciPlaceholder } from "./placeholder";
import type { IdentitasSurat } from "./render";

export const IDENTITAS_CONTOH: IdentitasSurat = {
  nama: "Nama Pegawai Contoh, S.T.",
  nip: "19900101 201501 1 001",
  pangkat: "Penata Muda Tingkat I – III/b",
  jabatan: "Penelaah Teknis Kebijakan",
  satuanOrganisasi: "Dinas Energi dan Sumber Daya Mineral Provinsi Kalimantan Selatan",
};

export const NILAI_CONTOH: Record<KunciPlaceholder, string> = {
  blok_identitas: "",
  nama: IDENTITAS_CONTOH.nama,
  nip: IDENTITAS_CONTOH.nip,
  pangkat_golongan: IDENTITAS_CONTOH.pangkat,
  jabatan: IDENTITAS_CONTOH.jabatan,
  satuan_organisasi: IDENTITAS_CONTOH.satuanOrganisasi,
  sebutan_status: "Pegawai Negeri Sipil",
  jenis_cuti: "Cuti Tahunan",
  jenis_cuti_kecil: "cuti tahunan",
  tahun: "2026",
  jumlah_hari: "8",
  jumlah_hari_terbilang: "delapan",
  satuan_hari: "hari kerja",
  tanggal_mulai: "01 Juli 2026",
  tanggal_selesai: "10 Juli 2026",
  alamat_cuti: "Jl. Contoh No. 1, Banjarbaru",
  alasan: "keperluan keluarga",
  kepala_bidang_pemohon: "Kepala Bidang Contoh",
  atasan_langsung_jabatan: "Kepala Seksi Contoh",
};
