export interface UnitDasar {
  id: string;
  parentId: string | null;
  nama: string;
  urutan: number;
}

/** id unit beserta seluruh turunannya (memilih Bidang ikut memilih Seksi di bawahnya). */
export function idTurunan(unitId: string, units: UnitDasar[]): Set<string> {
  const hasil = new Set([unitId]);
  let bertambah = true;
  while (bertambah) {
    bertambah = false;
    for (const u of units) {
      if (u.parentId && hasil.has(u.parentId) && !hasil.has(u.id)) {
        hasil.add(u.id);
        bertambah = true;
      }
    }
  }
  return hasil;
}

/** Daftar unit berurutan menurut pohon, dengan kedalaman untuk indentasi di dropdown. */
export function urutkanPohon<T extends UnitDasar>(units: T[]): (T & { kedalaman: number })[] {
  const hasil: (T & { kedalaman: number })[] = [];
  const kunjungi = (parentId: string | null, kedalaman: number) => {
    for (const u of units.filter((x) => x.parentId === parentId).sort((a, b) => a.urutan - b.urutan)) {
      hasil.push({ ...u, kedalaman });
      kunjungi(u.id, kedalaman + 1);
    }
  };
  kunjungi(null, 0);
  return hasil;
}
