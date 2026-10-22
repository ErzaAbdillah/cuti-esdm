import "server-only";
import { pilihPejabat } from "@/lib/domain/pejabat";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { LevelSurat } from "@/lib/generated/prisma/enums";
import { db } from "../db";

/** Semua entri aktif yang bisa berlaku untuk level & dokumen (tanpa memandang tanggal). */
export function kandidatPejabat(level: LevelSurat, kodeDokumen: string | null, tx: Prisma.TransactionClient = db) {
  return tx.pejabatPenandatangan.findMany({
    where: { aktif: true, AND: [{ OR: [{ level }, { level: null }] }, { OR: [{ kodeDokumen }, { kodeDokumen: null }] }] },
  });
}

/** Pejabat penandatangan yang berlaku pada `tanggal` (lihat `pilihPejabat`). */
export async function pejabatBerlaku(level: LevelSurat, kodeDokumen: string | null, tanggal: Date, tx: Prisma.TransactionClient = db) {
  return pilihPejabat(await kandidatPejabat(level, kodeDokumen, tx), level, kodeDokumen, tanggal);
}
