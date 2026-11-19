-- CreateTable
CREATE TABLE "foto_profil" (
    "user_id" UUID NOT NULL,
    "data" BYTEA NOT NULL,
    "mime" TEXT NOT NULL,
    "ukuran" INTEGER NOT NULL,
    "diubah_pada" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "foto_profil_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "foto_profil" ADD CONSTRAINT "foto_profil_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
