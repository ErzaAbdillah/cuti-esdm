import type { LevelSurat } from "@/lib/generated/prisma/enums";

export interface KandidatPejabat {
  level: LevelSurat | null;
  kodeDokumen: string | null;
  berlakuMulai: Date;
  berlakuSampai: Date | null;
  aktif: boolean;
}

/**
 * Pejabat penandatangan yang berlaku pada `tanggal` untuk level & dokumen.
 * Entri paling spesifik menang (level+dokumen > level > dokumen > umum), lalu
 * yang mulai berlaku paling akhir — sehingga Plt./Plh. untuk periode tertentu
 * menggantikan pejabat definitif selama periode itu.
 */
export function pilihPejabat<T extends KandidatPejabat>(kandidat: readonly T[], level: LevelSurat, kodeDokumen: string | null, tanggal: Date): T | null {
  const skor = (p: T) => (p.level ? 2 : 0) + (p.kodeDokumen ? 1 : 0);
  const cocok = kandidat.filter(
    (p) =>
      p.aktif &&
      p.berlakuMulai.getTime() <= tanggal.getTime() &&
      (!p.berlakuSampai || p.berlakuSampai.getTime() >= tanggal.getTime()) &&
      (p.level === null || p.level === level) &&
      (p.kodeDokumen === null || p.kodeDokumen === kodeDokumen),
  );
  return cocok.sort((a, b) => skor(b) - skor(a) || b.berlakuMulai.getTime() - a.berlakuMulai.getTime())[0] ?? null;
}
