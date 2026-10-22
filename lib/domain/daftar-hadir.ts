import type { StatusKepegawaian } from "@/lib/generated/prisma/enums";

export interface UnitPohon {
  id: string;
  parentId: string | null;
}

/**
 * Daftar hadir dibuat per unit tingkat-1 (Sekretariat, Bidang, UPTD).
 * Mengembalikan id unit tingkat-1 tempat `unitId` berada, atau null bila
 * `unitId` adalah unit akar (Dinas).
 */
export function unitDaftarHadir(unitId: string, units: Map<string, UnitPohon>): string | null {
  let u = units.get(unitId);
  if (!u?.parentId) return null;
  while (u.parentId) {
    const induk = units.get(u.parentId);
    if (!induk?.parentId) return u.id;
    u = induk;
  }
  return null;
}

export interface BarisUrut {
  pimpinan: boolean;
  status: StatusKepegawaian;
  /** Urutan pangkat/golongan (makin tinggi makin senior); 0 bila tidak ada. */
  urutanGolongan: number;
  kelas: number;
  nama: string;
}

/** Urutan form fisik: pimpinan, lalu PNS menurut golongan, lalu PPPK, lalu nama. */
export function bandingkanBarisDaftarHadir(a: BarisUrut, b: BarisUrut): number {
  return (
    Number(b.pimpinan) - Number(a.pimpinan) ||
    Number(a.status !== "PNS") - Number(b.status !== "PNS") ||
    b.urutanGolongan - a.urutanGolongan ||
    b.kelas - a.kelas ||
    a.nama.localeCompare(b.nama, "id")
  );
}
