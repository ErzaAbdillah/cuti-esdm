-- CreateEnum
CREATE TYPE "HakAkses" AS ENUM ('KELOLA_SALDO_CUTI', 'PROSES_CUTI', 'KELOLA_PEGAWAI', 'KELOLA_DOKUMEN_ORGANISASI', 'PENGATURAN_ADMIN');

-- CreateTable
CREATE TABLE "user_hak_akses" (
    "user_id" UUID NOT NULL,
    "hak_akses" "HakAkses" NOT NULL,

    CONSTRAINT "user_hak_akses_pkey" PRIMARY KEY ("user_id","hak_akses")
);

-- AddForeignKey
ALTER TABLE "user_hak_akses" ADD CONSTRAINT "user_hak_akses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
