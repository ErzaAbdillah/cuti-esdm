-- AlterEnum
ALTER TYPE "JenisCetak" ADD VALUE 'FORMULIR_CUTI';

-- AlterTable
ALTER TABLE "pengajuan_cuti" ADD COLUMN     "formulir" JSONB;
