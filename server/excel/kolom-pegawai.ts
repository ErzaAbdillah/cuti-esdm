import "server-only";

/** Kolom Excel pegawai — sama untuk template impor dan ekspor agar bisa bolak-balik. */
export const KOLOM_PEGAWAI = [
  { kunci: "nip", judul: "NIP", contoh: "198003262008031002", ket: "18 digit, format sel TEKS. Kosongkan untuk Non-ASN." },
  { kunci: "idNonAsn", judul: "ID Non-ASN", contoh: "", ket: "Wajib untuk Non-ASN, mis. PJLP-005." },
  { kunci: "statusKepegawaian", judul: "Status Kepegawaian", contoh: "PNS", ket: "PNS / PPPK / PPPK Paruh Waktu / Non-ASN. Kosong = dibaca dari NIP." },
  { kunci: "gelarDepan", judul: "Gelar Depan", contoh: "", ket: "" },
  { kunci: "nama", judul: "Nama", contoh: "Nama Pegawai", ket: "Tanpa gelar." },
  { kunci: "gelarBelakang", judul: "Gelar Belakang", contoh: "S.E., M.M.", ket: "" },
  { kunci: "nik", judul: "NIK", contoh: "", ket: "16 digit, format sel TEKS." },
  { kunci: "tempatLahir", judul: "Tempat Lahir", contoh: "Banjarmasin", ket: "" },
  { kunci: "tanggalLahir", judul: "Tanggal Lahir", contoh: "1980-03-26", ket: "Tanggal Excel atau teks YYYY-MM-DD / DD-MM-YYYY." },
  { kunci: "jenisKelamin", judul: "Jenis Kelamin", contoh: "L", ket: "L / P." },
  { kunci: "pendidikanTerakhir", judul: "Pendidikan Terakhir", contoh: "S2", ket: "" },
  { kunci: "alamatDomisili", judul: "Alamat Domisili", contoh: "", ket: "" },
  { kunci: "noHp", judul: "Nomor HP", contoh: "", ket: "Format sel TEKS." },
  { kunci: "email", judul: "Email", contoh: "", ket: "" },
  { kunci: "golongan", judul: "Golongan", contoh: "IV/b", ket: "PNS: I/a–IV/e. PPPK: I–XVII. Kosong/“-” bila tidak ada." },
  { kunci: "tmtPangkat", judul: "TMT Pangkat", contoh: "2022-04-01", ket: "" },
  { kunci: "jabatan", judul: "Jabatan", contoh: "Sekretaris Dinas Energi dan Sumber Daya Mineral", ket: "Sesuai sheet Referensi (boleh nama singkat, mis. Kasie …)." },
  { kunci: "tmtJabatan", judul: "TMT Jabatan", contoh: "", ket: "" },
  { kunci: "unitKerja", judul: "Unit Kerja", contoh: "Sekretariat", ket: "Nama atau kode unit sesuai sheet Referensi." },
  { kunci: "nipAtasan", judul: "NIP Atasan Langsung", contoh: "", ket: "Kosong = otomatis dari struktur." },
  { kunci: "tanggalMasuk", judul: "Tanggal Masuk", contoh: "", ket: "" },
  { kunci: "aktif", judul: "Aktif", contoh: "Ya", ket: "Ya / Tidak. Kosong = Ya." },
] as const;

export type KunciKolom = (typeof KOLOM_PEGAWAI)[number]["kunci"];

/** Kolom data pribadi — hanya diekspor bila diminta Kepegawaian. */
export const KOLOM_SENSITIF: ReadonlySet<KunciKolom> = new Set(["nik", "alamatDomisili", "noHp"]);
