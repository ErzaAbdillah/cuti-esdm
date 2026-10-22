export interface UnitStruktur {
  id: string;
  parentId: string | null;
}

/**
 * Atasan langsung menurut struktur organisasi:
 * - staf di sebuah unit → kepala unit itu;
 * - kepala unit → kepala unit induknya;
 * - jika kepala unit kosong, naik ke unit induk berikutnya.
 * Mengembalikan null untuk pimpinan tertinggi (Kepala Dinas).
 *
 * @param kepalaUnit peta unitId → pegawaiId yang memegang jabatan kepala unit itu
 */
export function tentukanAtasanLangsung(
  pegawaiId: string,
  unitId: string,
  units: Map<string, UnitStruktur>,
  kepalaUnit: Map<string, string>,
): string | null {
  const dikunjungi = new Set<string>();
  let saatIni: string | null = unitId;

  while (saatIni && !dikunjungi.has(saatIni)) {
    dikunjungi.add(saatIni);
    const kepala = kepalaUnit.get(saatIni);
    if (kepala && kepala !== pegawaiId) return kepala;
    saatIni = units.get(saatIni)?.parentId ?? null;
  }
  return null;
}
