-- CreateTable
CREATE TABLE "dokumen_berkas" (
    "dokumen_id" UUID NOT NULL,
    "data" BYTEA NOT NULL,
    "dibuat_pada" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dokumen_berkas_pkey" PRIMARY KEY ("dokumen_id")
);

-- AddForeignKey
ALTER TABLE "dokumen_berkas" ADD CONSTRAINT "dokumen_berkas_dokumen_id_fkey" FOREIGN KEY ("dokumen_id") REFERENCES "dokumen"("id") ON DELETE CASCADE ON UPDATE CASCADE;
