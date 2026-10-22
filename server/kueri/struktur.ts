import "server-only";
import { tentukanAtasanLangsung } from "@/lib/domain/atasan";
import type { Prisma } from "@/lib/generated/prisma/client";
import { db } from "../db";

/**
 * Atasan langsung otomatis dari struktur: kepala unit tempat pegawai berada,
 * atau kepala unit induk bila pegawai itu sendiri kepala unitnya.
 * `pegawaiId` null untuk pegawai baru.
 */
export async function atasanOtomatis(
  pegawaiId: string | null,
  unitId: string,
  jabatanId: string | null,
  tx: Prisma.TransactionClient = db,
): Promise<string | null> {
  const [units, kepala, jabatan] = await Promise.all([
    tx.unitKerja.findMany({ select: { id: true, parentId: true } }),
    tx.pegawai.findMany({
      where: { aktif: true, jabatan: { memimpinUnitId: { not: null } } },
      select: { id: true, jabatan: { select: { memimpinUnitId: true } } },
    }),
    jabatanId ? tx.jabatan.findUnique({ where: { id: jabatanId }, select: { memimpinUnitId: true } }) : null,
  ]);

  const ID_BARU = "__baru__";
  const diri = pegawaiId ?? ID_BARU;
  const kepalaUnit = new Map<string, string>();
  for (const k of kepala) {
    if (k.id !== diri) kepalaUnit.set(k.jabatan!.memimpinUnitId!, k.id);
  }
  if (jabatan?.memimpinUnitId) kepalaUnit.set(jabatan.memimpinUnitId, diri);

  const atasan = tentukanAtasanLangsung(diri, unitId, new Map(units.map((u) => [u.id, u])), kepalaUnit);
  return atasan === ID_BARU ? null : atasan;
}
