import "server-only";
import type { Prisma } from "@/lib/generated/prisma/client";
import { db } from "./db";
import { infoPermintaan } from "./permintaan";

const KOLOM_SENSITIF = new Set(["nik", "alamatDomisili", "noHp", "passwordHash", "kodeHash"]);

/** Samarkan nilai sensitif sebelum disimpan di audit log (UU PDP: minimisasi data). */
function samarkan(data: unknown): Prisma.InputJsonValue | undefined {
  if (data == null || typeof data !== "object") return data as Prisma.InputJsonValue | undefined;
  return Object.fromEntries(
    Object.entries(data as Record<string, unknown>).map(([k, v]) => [
      k,
      KOLOM_SENSITIF.has(k) && v != null ? "•••" : v instanceof Date ? v.toISOString() : v,
    ]),
  ) as Prisma.InputJsonValue;
}

export interface EntriAudit {
  userId: string | null;
  aksi: string;
  entitas: string;
  entitasId?: string | null;
  sebelum?: unknown;
  sesudah?: unknown;
}

export async function catatAudit(e: EntriAudit, tx: Prisma.TransactionClient = db) {
  const { ip, userAgent } = await infoPermintaan();
  await tx.auditLog.create({
    data: {
      userId: e.userId,
      aksi: e.aksi,
      entitas: e.entitas,
      entitasId: e.entitasId ?? null,
      sebelum: samarkan(e.sebelum),
      sesudah: samarkan(e.sesudah),
      ip,
      userAgent,
    },
  });
}
