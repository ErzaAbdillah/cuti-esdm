import type { JenisJabatan, LevelSurat } from "@/lib/generated/prisma/enums";

export interface AturanMappingEselon {
  jenisJabatan: JenisJabatan;
  kelasMin: number;
  kelasMax: number;
  level: LevelSurat;
}

export interface DataLevelSurat {
  jenisJabatan: JenisJabatan | null;
  kelas: number | null;
  override?: LevelSurat | null;
}

/**
 * Level surat cuti seorang pegawai. Mapping kelas → eselon hanya berlaku
 * untuk jabatan struktural; JF dan pelaksana selalu STAF meskipun kelasnya
 * tinggi (mis. JF Perencana Ahli Madya kelas 12).
 */
export function tentukanLevelSurat(data: DataLevelSurat, mapping: AturanMappingEselon[]): LevelSurat {
  if (data.override) return data.override;
  if (data.jenisJabatan !== "STRUKTURAL" || data.kelas == null) return "STAF";

  const kelas = data.kelas;
  const cocok = mapping.find(
    (m) => m.jenisJabatan === "STRUKTURAL" && kelas >= m.kelasMin && kelas <= m.kelasMax,
  );
  return cocok?.level ?? "STAF";
}
