import "server-only";
import { cache } from "react";
import { HARI_KERJA_BAWAAN, kunciTanggal } from "@/lib/domain/hari-kerja";
import type { AturanAbsen } from "@/lib/domain/status-absen";
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

export interface AturanAbsenLengkap extends AturanAbsen {
  hariKerja: number[];
  jaringanKantor: string[];
}

export async function aturanAbsen(): Promise<AturanAbsenLengkap> {
  const p = await semuaPengaturan();
  const teks = (k: string) => {
    const v = p.get(k);
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };
  const angka = (k: string) => {
    const v = p.get(k);
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  };
  const hari = p.get("absen.hari_kerja");
  const jaringan = p.get("absen.jaringan_kantor");
  return {
    jamMasuk: teks("absen.jam_masuk"),
    toleransiMenit: angka("absen.toleransi_terlambat_menit"),
    batasAlpa: teks("absen.batas_alpa"),
    hariKerja: Array.isArray(hari) && hari.length ? (hari as number[]) : HARI_KERJA_BAWAAN,
    jaringanKantor: Array.isArray(jaringan) ? (jaringan as string[]) : [],
  };
}

/** Kunci tanggal (YYYY-MM-DD) hari libur dalam rentang. */
export async function setLibur(dari: Date, sampai: Date): Promise<Set<string>> {
  const libur = await db.hariLibur.findMany({ where: { tanggal: { gte: dari, lte: sampai } }, select: { tanggal: true } });
  return new Set(libur.map((l) => kunciTanggal(l.tanggal)));
}
