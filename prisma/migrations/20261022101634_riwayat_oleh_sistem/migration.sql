-- DropForeignKey
ALTER TABLE "riwayat_status_cuti" DROP CONSTRAINT "riwayat_status_cuti_oleh_user_id_fkey";

-- AlterTable
ALTER TABLE "riwayat_status_cuti" ALTER COLUMN "oleh_user_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "riwayat_status_cuti" ADD CONSTRAINT "riwayat_status_cuti_oleh_user_id_fkey" FOREIGN KEY ("oleh_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
