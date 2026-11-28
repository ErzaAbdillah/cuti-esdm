export interface UnitDasar {
  id: string;
  parentId: string | null;
  nama: string;
  urutan: number;
}

export const FILTER_UNIT_PJLP = "PJLP" as const;

const URUTAN_UNIT_FILTER_PEGAWAI: readonly { kode: string; label: string }[] = [
  { kode: "SEKRETARIAT", label: "Sekretariat" },
  { kode: "BIDANG_GEOLOGI", label: "Geologi" },
  { kode: "BIDANG_PERTAMBANGAN", label: "Pertambangan" },
  { kode: "BIDANG_ENERGI", label: "Energi" },
  { kode: "BIDANG_KETENAGALISTRIKAN", label: "Ketenagalistrikan" },
];

export interface OpsiUnitFilter {
  id: string;
  label: string;
  kode: string;
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

/**
 * Daftar ringkas khusus dropdown filter Unit Kerja di halaman Data Pegawai:
 * 5 unit utama (Sekretariat, Geologi, Pertambangan, Energi, Ketenagalistrikan) + PJLP.
 * Daftar pohon unit lengkap (`urutkanPohon`) tetap dipakai oleh form Tambah/Ubah Pegawai.
 */
export function susunOpsiUnitFilterPegawai(
  units: readonly { id: string; kode: string; nama: string }[],
): OpsiUnitFilter[] {
  const hasil: OpsiUnitFilter[] = [];
  for (const target of URUTAN_UNIT_FILTER_PEGAWAI) {
    const cocok =
      units.find((u) => u.kode.toUpperCase() === target.kode) ??
      units.find((u) => u.nama.trim().toLowerCase() === target.label.toLowerCase()) ??
      units.find((u) => u.nama.trim().toLowerCase() === `bidang ${target.label.toLowerCase()}`);
    if (cocok) {
      hasil.push({ id: cocok.id, label: target.label, kode: cocok.kode });
    }
  }
  hasil.push({ id: FILTER_UNIT_PJLP, label: "PJLP", kode: FILTER_UNIT_PJLP });
  return hasil;
}
