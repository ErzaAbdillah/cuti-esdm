import "server-only";
import { cache } from "react";
import { HARI_KERJA_BAWAAN, kunciTanggal } from "@/lib/domain/hari-kerja";
import { PETA_PENGATURAN } from "@/lib/pengaturan";
import { db } from "./db";

/** Semua pengaturan (sekali per request). Kunci yang belum ada di DB memakai nilai awal definisi. */
export const semuaPengaturan = cache(async (): Promise<Map<string, unknown>> => {
  const baris = await db.pengaturan.findMany();
  const peta = new Map<string, unknown>([...PETA_PENGATURAN.values()].map((d) => [d.kunci, d.nilaiAwal]));
  for (const b of baris) peta.set(b.kunci, b.nilai);
  return peta;
});

export async function teksPengaturan(kunci: string): Promise<string> {
  const v = (await semuaPengaturan()).get(kunci);
  return typeof v === "string" ? v : "";
}

/** Hari kerja (1 = Senin … 7 = Minggu) untuk menghitung lamanya cuti. */
export async function hariKerja(): Promise<number[]> {
  const hari = (await semuaPengaturan()).get("absen.hari_kerja");
  return Array.isArray(hari) && hari.length ? (hari as number[]) : HARI_KERJA_BAWAAN;
}

/** Kunci tanggal (YYYY-MM-DD) hari libur dalam rentang. */
export async function setLibur(dari: Date, sampai: Date): Promise<Set<string>> {
  const libur = await db.hariLibur.findMany({ where: { tanggal: { gte: dari, lte: sampai } }, select: { tanggal: true } });
  return new Set(libur.map((l) => kunciTanggal(l.tanggal)));
}
