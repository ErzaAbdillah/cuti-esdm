-- CreateEnum
CREATE TYPE "StatusKepegawaian" AS ENUM ('PNS', 'PPPK', 'PPPK_PARUH_WAKTU', 'NON_ASN');

-- CreateEnum
CREATE TYPE "JenisKelamin" AS ENUM ('L', 'P');

-- CreateEnum
CREATE TYPE "JenisJabatan" AS ENUM ('STRUKTURAL', 'FUNGSIONAL', 'PELAKSANA', 'NON_ASN');

-- CreateEnum
CREATE TYPE "LevelSurat" AS ENUM ('ESELON_II', 'ESELON_III', 'ESELON_IV', 'STAF');

-- CreateEnum
CREATE TYPE "Peran" AS ENUM ('ADMIN', 'KEPEGAWAIAN');

-- CreateEnum
CREATE TYPE "PeranAkses" AS ENUM ('PEGAWAI', 'ATASAN', 'KEPEGAWAIAN', 'ADMIN');

-- CreateEnum
CREATE TYPE "JenisUnit" AS ENUM ('DINAS', 'SEKRETARIAT', 'BIDANG', 'UPTD', 'SUBBAG', 'SEKSI');

-- CreateEnum
CREATE TYPE "StatusCuti" AS ENUM ('DIAJUKAN', 'DISETUJUI_ATASAN', 'DIVERIFIKASI', 'DISETUJUI', 'SURAT_TERBIT', 'SELESAI', 'DITOLAK', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "SatuanHitung" AS ENUM ('HARI_KERJA', 'HARI_KALENDER');

-- CreateEnum
CREATE TYPE "JenisMutasiSaldo" AS ENUM ('SALDO_AWAL', 'PEMOTONGAN', 'PENGEMBALIAN', 'PENYESUAIAN', 'TUTUP_TAHUN');

-- CreateEnum
CREATE TYPE "JenisHariLibur" AS ENUM ('LIBUR_NASIONAL', 'CUTI_BERSAMA', 'LIBUR_DAERAH');

-- CreateEnum
CREATE TYPE "TahapPersetujuan" AS ENUM ('ATASAN_LANGSUNG', 'KEPEGAWAIAN', 'PEJABAT_BERWENANG');

-- CreateEnum
CREATE TYPE "ModePenyetuju" AS ENUM ('PENGGUNA', 'EKSTERNAL');

-- CreateEnum
CREATE TYPE "StatusSurat" AS ENUM ('DRAFT', 'TERKUNCI');

-- CreateEnum
CREATE TYPE "JenisCetak" AS ENUM ('SURAT_CETAK', 'SURAT_PDF', 'DAFTAR_HADIR', 'REKAP_ABSEN', 'REKAP_CUTI', 'DOKUMEN_GABUNGAN');

-- CreateEnum
CREATE TYPE "StatusAbsen" AS ENUM ('HADIR', 'TERLAMBAT', 'CUTI', 'DINAS_LUAR', 'SAKIT', 'IZIN', 'TUGAS', 'ALPA');

-- CreateEnum
CREATE TYPE "SumberAbsen" AS ENUM ('MANDIRI', 'ATASAN', 'KEPEGAWAIAN', 'SISTEM');

-- CreateEnum
CREATE TYPE "JenisKeterangan" AS ENUM ('DINAS_LUAR', 'SAKIT', 'IZIN', 'TUGAS');

-- CreateEnum
CREATE TYPE "RuangDokumen" AS ENUM ('PRIBADI', 'ORGANISASI', 'LAMPIRAN_CUTI', 'LAMPIRAN_KETERANGAN');

-- CreateEnum
CREATE TYPE "KategoriDokumenPribadi" AS ENUM ('SK_CPNS', 'SK_PPPK', 'SK_PANGKAT', 'SK_JABATAN', 'IJAZAH', 'KTP', 'KK', 'LAINNYA');

-- CreateEnum
CREATE TYPE "StatusEmail" AS ENUM ('ANTRI', 'TERKIRIM', 'GAGAL');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "login_id" TEXT NOT NULL,
    "pegawai_id" UUID,
    "password_hash" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "gagal_berturut" INTEGER NOT NULL DEFAULT 0,
    "terkunci_sampai" TIMESTAMPTZ,
    "wajib_ganti_password" BOOLEAN NOT NULL DEFAULT false,
    "terakhir_login" TIMESTAMPTZ,
    "dibuat_pada" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diubah_pada" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_peran" (
    "user_id" UUID NOT NULL,
    "peran" "Peran" NOT NULL,

    CONSTRAINT "user_peran_pkey" PRIMARY KEY ("user_id","peran")
);

-- CreateTable
CREATE TABLE "sesi" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "csrf_token" TEXT NOT NULL,
    "ip" TEXT,
    "user_agent" TEXT,
    "dibuat_pada" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "terakhir_aktif" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kedaluwarsa_pada" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "sesi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_login" (
    "id" BIGSERIAL NOT NULL,
    "login_id_dicoba" TEXT NOT NULL,
    "user_id" UUID,
    "berhasil" BOOLEAN NOT NULL,
    "alasan" TEXT,
    "ip" TEXT,
    "user_agent" TEXT,
    "waktu" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_login_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kode_aktivasi" (
    "id" UUID NOT NULL,
    "pegawai_id" UUID NOT NULL,
    "kode_hash" TEXT NOT NULL,
    "kedaluwarsa_pada" TIMESTAMPTZ NOT NULL,
    "dipakai_pada" TIMESTAMPTZ,
    "dibuat_oleh_id" UUID NOT NULL,
    "dibuat_pada" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kode_aktivasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_kerja" (
    "id" UUID NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "singkatan" TEXT,
    "jenis" "JenisUnit" NOT NULL,
    "parent_id" UUID,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "judul_daftar_hadir" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "unit_kerja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jabatan" (
    "id" UUID NOT NULL,
    "nama" TEXT NOT NULL,
    "nama_singkat" TEXT,
    "jenis" "JenisJabatan" NOT NULL,
    "kelas_jabatan" INTEGER,
    "memimpin_unit_id" UUID,
    "aktif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "jabatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelas_jabatan" (
    "nilai" INTEGER NOT NULL,
    "keterangan" TEXT,

    CONSTRAINT "kelas_jabatan_pkey" PRIMARY KEY ("nilai")
);

-- CreateTable
CREATE TABLE "mapping_eselon" (
    "id" UUID NOT NULL,
    "jenis_jabatan" "JenisJabatan" NOT NULL DEFAULT 'STRUKTURAL',
    "kelas_min" INTEGER NOT NULL,
    "kelas_max" INTEGER NOT NULL,
    "level" "LevelSurat" NOT NULL,
    "catatan" TEXT,

    CONSTRAINT "mapping_eselon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formasi_jabatan" (
    "id" UUID NOT NULL,
    "jabatan_id" UUID NOT NULL,
    "unit_kerja_id" UUID NOT NULL,
    "kelas" INTEGER NOT NULL,
    "bezetting" INTEGER,
    "kebutuhan" INTEGER,
    "sumber" TEXT,

    CONSTRAINT "formasi_jabatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pangkat_golongan" (
    "id" UUID NOT NULL,
    "kode" TEXT NOT NULL,
    "golongan" TEXT NOT NULL,
    "nama_pangkat" TEXT,
    "untuk" "StatusKepegawaian" NOT NULL,
    "urutan" INTEGER NOT NULL,

    CONSTRAINT "pangkat_golongan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pegawai" (
    "id" UUID NOT NULL,
    "nip" VARCHAR(18),
    "id_non_asn" TEXT,
    "status_kepegawaian" "StatusKepegawaian" NOT NULL,
    "gelar_depan" TEXT,
    "nama" TEXT NOT NULL,
    "gelar_belakang" TEXT,
    "nik" VARCHAR(16),
    "tempat_lahir" TEXT,
    "tanggal_lahir" DATE,
    "jenis_kelamin" "JenisKelamin",
    "pendidikan_terakhir" TEXT,
    "alamat_domisili" TEXT,
    "no_hp" TEXT,
    "email" TEXT,
    "pangkat_golongan_id" UUID,
    "tmt_pangkat" DATE,
    "jabatan_id" UUID,
    "tmt_jabatan" DATE,
    "unit_kerja_id" UUID NOT NULL,
    "atasan_langsung_id" UUID,
    "level_surat_override" "LevelSurat",
    "tanggal_masuk" DATE,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "urutan_daftar_hadir" INTEGER,
    "dibuat_pada" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diubah_pada" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "pegawai_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jenis_cuti" (
    "id" UUID NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "satuan_hitung" "SatuanHitung" NOT NULL,
    "potong_saldo_tahunan" BOOLEAN NOT NULL,
    "maks_hari" INTEGER,
    "wajib_lampiran" BOOLEAN NOT NULL DEFAULT false,
    "boleh_tanggal_lampau" BOOLEAN NOT NULL DEFAULT false,
    "aktif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "jenis_cuti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aturan_cuti" (
    "id" UUID NOT NULL,
    "jenis_cuti_id" UUID NOT NULL,
    "status_kepegawaian" "StatusKepegawaian" NOT NULL,
    "berlaku" BOOLEAN NOT NULL DEFAULT true,
    "hak_per_tahun" INTEGER,
    "maks_hari" INTEGER,
    "catatan" TEXT,

    CONSTRAINT "aturan_cuti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pengajuan_cuti" (
    "id" UUID NOT NULL,
    "pegawai_id" UUID NOT NULL,
    "jenis_cuti_id" UUID NOT NULL,
    "tanggal_mulai" DATE NOT NULL,
    "tanggal_selesai" DATE NOT NULL,
    "jumlah_hari" INTEGER NOT NULL,
    "alasan" TEXT NOT NULL,
    "alamat_selama_cuti" TEXT NOT NULL,
    "no_hp_selama_cuti" TEXT NOT NULL,
    "penanggung_jawab_id" UUID,
    "atasan_langsung_id" UUID,
    "level_surat" "LevelSurat" NOT NULL,
    "status" "StatusCuti" NOT NULL DEFAULT 'DIAJUKAN',
    "tahun_saldo" INTEGER,
    "snapshot_identitas" JSONB NOT NULL,
    "dibuat_pada" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diubah_pada" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "pengajuan_cuti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "riwayat_status_cuti" (
    "id" UUID NOT NULL,
    "pengajuan_id" UUID NOT NULL,
    "dari_status" "StatusCuti",
    "ke_status" "StatusCuti" NOT NULL,
    "oleh_user_id" UUID NOT NULL,
    "catatan" TEXT,
    "waktu" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "riwayat_status_cuti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saldo_cuti" (
    "id" UUID NOT NULL,
    "pegawai_id" UUID NOT NULL,
    "tahun" INTEGER NOT NULL,
    "hak_tahun_ini" INTEGER NOT NULL DEFAULT 12,
    "sisa_n1" INTEGER NOT NULL DEFAULT 0,
    "sisa_n2" INTEGER NOT NULL DEFAULT 0,
    "penyesuaian" INTEGER NOT NULL DEFAULT 0,
    "terpakai" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "saldo_cuti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mutasi_saldo_cuti" (
    "id" UUID NOT NULL,
    "saldo_id" UUID NOT NULL,
    "pengajuan_id" UUID,
    "jenis" "JenisMutasiSaldo" NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "catatan" TEXT,
    "oleh_user_id" UUID,
    "waktu" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mutasi_saldo_cuti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hari_libur" (
    "id" UUID NOT NULL,
    "tanggal" DATE NOT NULL,
    "nama" TEXT NOT NULL,
    "jenis" "JenisHariLibur" NOT NULL,

    CONSTRAINT "hari_libur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alur_persetujuan" (
    "id" UUID NOT NULL,
    "level" "LevelSurat" NOT NULL,
    "urutan" INTEGER NOT NULL,
    "tahap" "TahapPersetujuan" NOT NULL,
    "mode" "ModePenyetuju" NOT NULL DEFAULT 'PENGGUNA',
    "penyetuju_user_id" UUID,
    "aktif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "alur_persetujuan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_surat" (
    "id" UUID NOT NULL,
    "level" "LevelSurat" NOT NULL,
    "kode_dokumen" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "jenis_cuti_id" UUID,
    "dapat_dicetak_sejak" "StatusCuti" NOT NULL,
    "format_nomor" TEXT NOT NULL DEFAULT '{klasifikasi}/{urut}/DESDM/{tahun}',
    "sifat" TEXT,
    "lampiran" TEXT,
    "hal" TEXT NOT NULL,
    "tujuan_html" TEXT NOT NULL,
    "tembusan" JSONB NOT NULL,
    "isi_html" TEXT NOT NULL,
    "ukuran_kertas" TEXT NOT NULL DEFAULT 'A4',
    "versi" INTEGER NOT NULL DEFAULT 1,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "diubah_oleh_id" UUID,
    "diubah_pada" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "template_surat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pejabat_penandatangan" (
    "id" UUID NOT NULL,
    "level" "LevelSurat",
    "kode_dokumen" TEXT,
    "awalan" TEXT,
    "jabatan_teks" TEXT NOT NULL,
    "pegawai_id" UUID,
    "nama" TEXT NOT NULL,
    "pangkat" TEXT,
    "nip" VARCHAR(18),
    "berlaku_mulai" DATE NOT NULL,
    "berlaku_sampai" DATE,
    "aktif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "pejabat_penandatangan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surat_cuti" (
    "id" UUID NOT NULL,
    "pengajuan_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "kode_dokumen" TEXT NOT NULL,
    "tahun" INTEGER NOT NULL,
    "nomor_urut" INTEGER,
    "nomor_lengkap" TEXT,
    "status" "StatusSurat" NOT NULL DEFAULT 'DRAFT',
    "versi_terakhir" INTEGER NOT NULL DEFAULT 1,
    "dibuat_pada" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "surat_cuti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surat_cuti_versi" (
    "id" UUID NOT NULL,
    "surat_id" UUID NOT NULL,
    "versi" INTEGER NOT NULL,
    "isi_html" TEXT NOT NULL,
    "data_snapshot" JSONB NOT NULL,
    "dibuat_oleh_id" UUID NOT NULL,
    "dibuat_pada" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dikunci_pada" TIMESTAMPTZ,

    CONSTRAINT "surat_cuti_versi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_log" (
    "id" UUID NOT NULL,
    "jenis" "JenisCetak" NOT NULL,
    "surat_versi_id" UUID,
    "oleh_user_id" UUID NOT NULL,
    "waktu" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "info" JSONB,

    CONSTRAINT "print_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "absensi" (
    "id" UUID NOT NULL,
    "pegawai_id" UUID NOT NULL,
    "tanggal" DATE NOT NULL,
    "status" "StatusAbsen" NOT NULL,
    "jam_masuk" TIMESTAMPTZ,
    "sumber" "SumberAbsen" NOT NULL,
    "keterangan" TEXT,
    "pengajuan_cuti_id" UUID,
    "keterangan_kehadiran_id" UUID,
    "dicatat_oleh_id" UUID,
    "ip" TEXT,
    "dibuat_pada" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diubah_pada" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "absensi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "keterangan_kehadiran" (
    "id" UUID NOT NULL,
    "pegawai_id" UUID NOT NULL,
    "jenis" "JenisKeterangan" NOT NULL,
    "tanggal_mulai" DATE NOT NULL,
    "tanggal_selesai" DATE NOT NULL,
    "keterangan" TEXT NOT NULL,
    "nomor_surat" TEXT,
    "lampiran_id" UUID,
    "dicatat_oleh_id" UUID NOT NULL,
    "dibuat_pada" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "keterangan_kehadiran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "folder_dokumen" (
    "id" UUID NOT NULL,
    "nama" TEXT NOT NULL,
    "parent_id" UUID,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "dibuat_pada" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "folder_dokumen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "akses_folder" (
    "folder_id" UUID NOT NULL,
    "peran" "PeranAkses" NOT NULL,
    "boleh_lihat" BOOLEAN NOT NULL DEFAULT true,
    "boleh_kelola" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "akses_folder_pkey" PRIMARY KEY ("folder_id","peran")
);

-- CreateTable
CREATE TABLE "dokumen" (
    "id" UUID NOT NULL,
    "ruang" "RuangDokumen" NOT NULL,
    "pemilik_pegawai_id" UUID,
    "folder_id" UUID,
    "pengajuan_cuti_id" UUID,
    "kategori_pribadi" "KategoriDokumenPribadi",
    "nama_tampilan" TEXT NOT NULL,
    "nama_file_asli" TEXT NOT NULL,
    "nama_file_simpan" TEXT NOT NULL,
    "ekstensi" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "ukuran" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "terenkripsi" BOOLEAN NOT NULL DEFAULT false,
    "diunggah_oleh_id" UUID NOT NULL,
    "diunggah_pada" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dihapus_pada" TIMESTAMPTZ,
    "dihapus_oleh_id" UUID,

    CONSTRAINT "dokumen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" BIGSERIAL NOT NULL,
    "waktu" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID,
    "aksi" TEXT NOT NULL,
    "entitas" TEXT NOT NULL,
    "entitas_id" TEXT,
    "sebelum" JSONB,
    "sesudah" JSONB,
    "ip" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pengaturan" (
    "kunci" TEXT NOT NULL,
    "nilai" JSONB,
    "deskripsi" TEXT NOT NULL,
    "diubah_oleh_id" UUID,
    "diubah_pada" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "pengaturan_pkey" PRIMARY KEY ("kunci")
);

-- CreateTable
CREATE TABLE "notifikasi" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "judul" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "tautan" TEXT,
    "dibaca_pada" TIMESTAMPTZ,
    "dibuat_pada" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifikasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_keluar" (
    "id" UUID NOT NULL,
    "kepada" TEXT NOT NULL,
    "subjek" TEXT NOT NULL,
    "isi_html" TEXT NOT NULL,
    "status" "StatusEmail" NOT NULL DEFAULT 'ANTRI',
    "percobaan" INTEGER NOT NULL DEFAULT 0,
    "galat_terakhir" TEXT,
    "dibuat_pada" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dikirim_pada" TIMESTAMPTZ,

    CONSTRAINT "email_keluar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_login_id_key" ON "users"("login_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_pegawai_id_key" ON "users"("pegawai_id");

-- CreateIndex
CREATE INDEX "sesi_user_id_idx" ON "sesi"("user_id");

-- CreateIndex
CREATE INDEX "log_login_login_id_dicoba_waktu_idx" ON "log_login"("login_id_dicoba", "waktu");

-- CreateIndex
CREATE INDEX "log_login_ip_waktu_idx" ON "log_login"("ip", "waktu");

-- CreateIndex
CREATE INDEX "kode_aktivasi_pegawai_id_idx" ON "kode_aktivasi"("pegawai_id");

-- CreateIndex
CREATE UNIQUE INDEX "unit_kerja_kode_key" ON "unit_kerja"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "jabatan_nama_key" ON "jabatan"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "jabatan_memimpin_unit_id_key" ON "jabatan"("memimpin_unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "formasi_jabatan_jabatan_id_unit_kerja_id_kelas_key" ON "formasi_jabatan"("jabatan_id", "unit_kerja_id", "kelas");

-- CreateIndex
CREATE UNIQUE INDEX "pangkat_golongan_kode_key" ON "pangkat_golongan"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "pegawai_nip_key" ON "pegawai"("nip");

-- CreateIndex
CREATE UNIQUE INDEX "pegawai_id_non_asn_key" ON "pegawai"("id_non_asn");

-- CreateIndex
CREATE UNIQUE INDEX "pegawai_nik_key" ON "pegawai"("nik");

-- CreateIndex
CREATE INDEX "pegawai_unit_kerja_id_idx" ON "pegawai"("unit_kerja_id");

-- CreateIndex
CREATE INDEX "pegawai_jabatan_id_idx" ON "pegawai"("jabatan_id");

-- CreateIndex
CREATE INDEX "pegawai_status_kepegawaian_aktif_idx" ON "pegawai"("status_kepegawaian", "aktif");

-- CreateIndex
CREATE INDEX "pegawai_nama_idx" ON "pegawai"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "jenis_cuti_kode_key" ON "jenis_cuti"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "aturan_cuti_jenis_cuti_id_status_kepegawaian_key" ON "aturan_cuti"("jenis_cuti_id", "status_kepegawaian");

-- CreateIndex
CREATE INDEX "pengajuan_cuti_pegawai_id_status_idx" ON "pengajuan_cuti"("pegawai_id", "status");

-- CreateIndex
CREATE INDEX "pengajuan_cuti_status_idx" ON "pengajuan_cuti"("status");

-- CreateIndex
CREATE INDEX "pengajuan_cuti_tanggal_mulai_tanggal_selesai_idx" ON "pengajuan_cuti"("tanggal_mulai", "tanggal_selesai");

-- CreateIndex
CREATE INDEX "riwayat_status_cuti_pengajuan_id_waktu_idx" ON "riwayat_status_cuti"("pengajuan_id", "waktu");

-- CreateIndex
CREATE UNIQUE INDEX "saldo_cuti_pegawai_id_tahun_key" ON "saldo_cuti"("pegawai_id", "tahun");

-- CreateIndex
CREATE INDEX "mutasi_saldo_cuti_saldo_id_idx" ON "mutasi_saldo_cuti"("saldo_id");

-- CreateIndex
CREATE UNIQUE INDEX "hari_libur_tanggal_key" ON "hari_libur"("tanggal");

-- CreateIndex
CREATE UNIQUE INDEX "alur_persetujuan_level_urutan_key" ON "alur_persetujuan"("level", "urutan");

-- CreateIndex
CREATE UNIQUE INDEX "template_surat_level_kode_dokumen_jenis_cuti_id_key" ON "template_surat"("level", "kode_dokumen", "jenis_cuti_id");

-- CreateIndex
CREATE INDEX "pejabat_penandatangan_level_kode_dokumen_berlaku_mulai_idx" ON "pejabat_penandatangan"("level", "kode_dokumen", "berlaku_mulai");

-- CreateIndex
CREATE UNIQUE INDEX "surat_cuti_pengajuan_id_kode_dokumen_key" ON "surat_cuti"("pengajuan_id", "kode_dokumen");

-- CreateIndex
CREATE UNIQUE INDEX "surat_cuti_tahun_nomor_urut_key" ON "surat_cuti"("tahun", "nomor_urut");

-- CreateIndex
CREATE UNIQUE INDEX "surat_cuti_versi_surat_id_versi_key" ON "surat_cuti_versi"("surat_id", "versi");

-- CreateIndex
CREATE INDEX "print_log_surat_versi_id_idx" ON "print_log"("surat_versi_id");

-- CreateIndex
CREATE INDEX "print_log_waktu_idx" ON "print_log"("waktu");

-- CreateIndex
CREATE INDEX "absensi_tanggal_status_idx" ON "absensi"("tanggal", "status");

-- CreateIndex
CREATE UNIQUE INDEX "absensi_pegawai_id_tanggal_key" ON "absensi"("pegawai_id", "tanggal");

-- CreateIndex
CREATE INDEX "keterangan_kehadiran_pegawai_id_tanggal_mulai_idx" ON "keterangan_kehadiran"("pegawai_id", "tanggal_mulai");

-- CreateIndex
CREATE UNIQUE INDEX "dokumen_nama_file_simpan_key" ON "dokumen"("nama_file_simpan");

-- CreateIndex
CREATE INDEX "dokumen_pemilik_pegawai_id_idx" ON "dokumen"("pemilik_pegawai_id");

-- CreateIndex
CREATE INDEX "dokumen_folder_id_idx" ON "dokumen"("folder_id");

-- CreateIndex
CREATE INDEX "dokumen_pengajuan_cuti_id_idx" ON "dokumen"("pengajuan_cuti_id");

-- CreateIndex
CREATE INDEX "dokumen_dihapus_pada_idx" ON "dokumen"("dihapus_pada");

-- CreateIndex
CREATE INDEX "audit_log_entitas_entitas_id_idx" ON "audit_log"("entitas", "entitas_id");

-- CreateIndex
CREATE INDEX "audit_log_user_id_waktu_idx" ON "audit_log"("user_id", "waktu");

-- CreateIndex
CREATE INDEX "audit_log_waktu_idx" ON "audit_log"("waktu");

-- CreateIndex
CREATE INDEX "notifikasi_user_id_dibaca_pada_idx" ON "notifikasi"("user_id", "dibaca_pada");

-- CreateIndex
CREATE INDEX "email_keluar_status_idx" ON "email_keluar"("status");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_pegawai_id_fkey" FOREIGN KEY ("pegawai_id") REFERENCES "pegawai"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_peran" ADD CONSTRAINT "user_peran_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesi" ADD CONSTRAINT "sesi_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kode_aktivasi" ADD CONSTRAINT "kode_aktivasi_pegawai_id_fkey" FOREIGN KEY ("pegawai_id") REFERENCES "pegawai"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_kerja" ADD CONSTRAINT "unit_kerja_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "unit_kerja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jabatan" ADD CONSTRAINT "jabatan_kelas_jabatan_fkey" FOREIGN KEY ("kelas_jabatan") REFERENCES "kelas_jabatan"("nilai") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jabatan" ADD CONSTRAINT "jabatan_memimpin_unit_id_fkey" FOREIGN KEY ("memimpin_unit_id") REFERENCES "unit_kerja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formasi_jabatan" ADD CONSTRAINT "formasi_jabatan_jabatan_id_fkey" FOREIGN KEY ("jabatan_id") REFERENCES "jabatan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formasi_jabatan" ADD CONSTRAINT "formasi_jabatan_unit_kerja_id_fkey" FOREIGN KEY ("unit_kerja_id") REFERENCES "unit_kerja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pegawai" ADD CONSTRAINT "pegawai_pangkat_golongan_id_fkey" FOREIGN KEY ("pangkat_golongan_id") REFERENCES "pangkat_golongan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pegawai" ADD CONSTRAINT "pegawai_jabatan_id_fkey" FOREIGN KEY ("jabatan_id") REFERENCES "jabatan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pegawai" ADD CONSTRAINT "pegawai_unit_kerja_id_fkey" FOREIGN KEY ("unit_kerja_id") REFERENCES "unit_kerja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pegawai" ADD CONSTRAINT "pegawai_atasan_langsung_id_fkey" FOREIGN KEY ("atasan_langsung_id") REFERENCES "pegawai"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aturan_cuti" ADD CONSTRAINT "aturan_cuti_jenis_cuti_id_fkey" FOREIGN KEY ("jenis_cuti_id") REFERENCES "jenis_cuti"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengajuan_cuti" ADD CONSTRAINT "pengajuan_cuti_pegawai_id_fkey" FOREIGN KEY ("pegawai_id") REFERENCES "pegawai"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengajuan_cuti" ADD CONSTRAINT "pengajuan_cuti_jenis_cuti_id_fkey" FOREIGN KEY ("jenis_cuti_id") REFERENCES "jenis_cuti"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengajuan_cuti" ADD CONSTRAINT "pengajuan_cuti_penanggung_jawab_id_fkey" FOREIGN KEY ("penanggung_jawab_id") REFERENCES "pegawai"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengajuan_cuti" ADD CONSTRAINT "pengajuan_cuti_atasan_langsung_id_fkey" FOREIGN KEY ("atasan_langsung_id") REFERENCES "pegawai"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riwayat_status_cuti" ADD CONSTRAINT "riwayat_status_cuti_pengajuan_id_fkey" FOREIGN KEY ("pengajuan_id") REFERENCES "pengajuan_cuti"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riwayat_status_cuti" ADD CONSTRAINT "riwayat_status_cuti_oleh_user_id_fkey" FOREIGN KEY ("oleh_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saldo_cuti" ADD CONSTRAINT "saldo_cuti_pegawai_id_fkey" FOREIGN KEY ("pegawai_id") REFERENCES "pegawai"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mutasi_saldo_cuti" ADD CONSTRAINT "mutasi_saldo_cuti_saldo_id_fkey" FOREIGN KEY ("saldo_id") REFERENCES "saldo_cuti"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mutasi_saldo_cuti" ADD CONSTRAINT "mutasi_saldo_cuti_pengajuan_id_fkey" FOREIGN KEY ("pengajuan_id") REFERENCES "pengajuan_cuti"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mutasi_saldo_cuti" ADD CONSTRAINT "mutasi_saldo_cuti_oleh_user_id_fkey" FOREIGN KEY ("oleh_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alur_persetujuan" ADD CONSTRAINT "alur_persetujuan_penyetuju_user_id_fkey" FOREIGN KEY ("penyetuju_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_surat" ADD CONSTRAINT "template_surat_jenis_cuti_id_fkey" FOREIGN KEY ("jenis_cuti_id") REFERENCES "jenis_cuti"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pejabat_penandatangan" ADD CONSTRAINT "pejabat_penandatangan_pegawai_id_fkey" FOREIGN KEY ("pegawai_id") REFERENCES "pegawai"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surat_cuti" ADD CONSTRAINT "surat_cuti_pengajuan_id_fkey" FOREIGN KEY ("pengajuan_id") REFERENCES "pengajuan_cuti"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surat_cuti" ADD CONSTRAINT "surat_cuti_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "template_surat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surat_cuti_versi" ADD CONSTRAINT "surat_cuti_versi_surat_id_fkey" FOREIGN KEY ("surat_id") REFERENCES "surat_cuti"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surat_cuti_versi" ADD CONSTRAINT "surat_cuti_versi_dibuat_oleh_id_fkey" FOREIGN KEY ("dibuat_oleh_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_log" ADD CONSTRAINT "print_log_surat_versi_id_fkey" FOREIGN KEY ("surat_versi_id") REFERENCES "surat_cuti_versi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_log" ADD CONSTRAINT "print_log_oleh_user_id_fkey" FOREIGN KEY ("oleh_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absensi" ADD CONSTRAINT "absensi_pegawai_id_fkey" FOREIGN KEY ("pegawai_id") REFERENCES "pegawai"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absensi" ADD CONSTRAINT "absensi_pengajuan_cuti_id_fkey" FOREIGN KEY ("pengajuan_cuti_id") REFERENCES "pengajuan_cuti"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absensi" ADD CONSTRAINT "absensi_keterangan_kehadiran_id_fkey" FOREIGN KEY ("keterangan_kehadiran_id") REFERENCES "keterangan_kehadiran"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absensi" ADD CONSTRAINT "absensi_dicatat_oleh_id_fkey" FOREIGN KEY ("dicatat_oleh_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keterangan_kehadiran" ADD CONSTRAINT "keterangan_kehadiran_pegawai_id_fkey" FOREIGN KEY ("pegawai_id") REFERENCES "pegawai"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keterangan_kehadiran" ADD CONSTRAINT "keterangan_kehadiran_lampiran_id_fkey" FOREIGN KEY ("lampiran_id") REFERENCES "dokumen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keterangan_kehadiran" ADD CONSTRAINT "keterangan_kehadiran_dicatat_oleh_id_fkey" FOREIGN KEY ("dicatat_oleh_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folder_dokumen" ADD CONSTRAINT "folder_dokumen_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "folder_dokumen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "akses_folder" ADD CONSTRAINT "akses_folder_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folder_dokumen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dokumen" ADD CONSTRAINT "dokumen_pemilik_pegawai_id_fkey" FOREIGN KEY ("pemilik_pegawai_id") REFERENCES "pegawai"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dokumen" ADD CONSTRAINT "dokumen_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folder_dokumen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dokumen" ADD CONSTRAINT "dokumen_pengajuan_cuti_id_fkey" FOREIGN KEY ("pengajuan_cuti_id") REFERENCES "pengajuan_cuti"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dokumen" ADD CONSTRAINT "dokumen_diunggah_oleh_id_fkey" FOREIGN KEY ("diunggah_oleh_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dokumen" ADD CONSTRAINT "dokumen_dihapus_oleh_id_fkey" FOREIGN KEY ("dihapus_oleh_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifikasi" ADD CONSTRAINT "notifikasi_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
