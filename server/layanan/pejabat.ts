import "server-only";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { LevelSurat } from "@/lib/generated/prisma/enums";
import { db } from "../db";

/**
 * Pejabat penandatangan yang berlaku pada `tanggal` untuk level & dokumen.
 * Entri paling spesifik menang (level+dokumen > level > default), lalu yang
 * berlaku paling akhir — sehingga Plt./Plh. bisa ditambahkan untuk periode tertentu.
 */
export async function pejabatBerlaku(level: LevelSurat, kodeDokumen: string | null, tanggal: Date, tx: Prisma.TransactionClient = db) {
  const kandidat = await tx.pejabatPenandatangan.findMany({
    where: {
      aktif: true,
      berlakuMulai: { lte: tanggal },
      OR: [{ berlakuSampai: null }, { berlakuSampai: { gte: tanggal } }],
      AND: [{ OR: [{ level }, { level: null }] }, { OR: [{ kodeDokumen }, { kodeDokumen: null }] }],
    },
    orderBy: { berlakuMulai: "desc" },
  });
  const skor = (p: (typeof kandidat)[number]) => (p.level ? 2 : 0) + (p.kodeDokumen ? 1 : 0);
  return kandidat.sort((a, b) => skor(b) - skor(a) || b.berlakuMulai.getTime() - a.berlakuMulai.getTime())[0] ?? null;
}
