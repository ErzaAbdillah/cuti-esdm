import type { HakAkses } from "@/lib/hak-akses";
import type { PeranEfektif } from "@/lib/peran";

export type NamaIkon =
  | "beranda"
  | "rekap"
  | "cuti"
  | "proses"
  | "pegawai"
  | "dokumen"
  | "folder"
  | "admin";

export interface ItemMenu {
  href: string;
  label: string;
  ikon: NamaIkon;
  /** Kosong (bersama hakAkses kosong) = semua pengguna yang login. */
  peran?: PeranEfektif[];
  /** Hak akses granular yang mengizinkan menu ini tampil. */
  hakAkses?: HakAkses[];
}

export interface GrupMenu {
  judul?: string;
  item: ItemMenu[];
}

export const MENU: GrupMenu[] = [
  { item: [{ href: "/beranda", label: "Beranda", ikon: "beranda" }] },
  {
    judul: "Cuti",
    item: [
      { href: "/cuti", label: "Cuti Saya", ikon: "cuti", peran: ["PEGAWAI"] },
      { href: "/cuti/proses", label: "Proses Cuti", ikon: "proses", peran: ["ATASAN", "ADMIN"], hakAkses: ["PROSES_CUTI"] },
      { href: "/cuti/saldo", label: "Saldo & Rekap Cuti", ikon: "rekap", peran: ["ADMIN"], hakAkses: ["KELOLA_SALDO_CUTI"] },
    ],
  },
  {
    judul: "Kepegawaian",
    item: [{ href: "/pegawai", label: "Data Pegawai", ikon: "pegawai", peran: ["ADMIN"], hakAkses: ["KELOLA_PEGAWAI"] }],
  },
  {
    judul: "Dokumen",
    item: [
      { href: "/dokumen", label: "Dokumen Saya", ikon: "dokumen", peran: ["PEGAWAI"] },
      { href: "/dokumen/organisasi", label: "Dokumen Organisasi", ikon: "folder" },
    ],
  },
  { judul: "Sistem", item: [{ href: "/admin", label: "Admin", ikon: "admin", peran: ["ADMIN"], hakAkses: ["PENGATURAN_ADMIN"] }] },
];

function bolehTampilItem(
  item: ItemMenu,
  peran: ReadonlySet<PeranEfektif>,
  hakAkses: ReadonlySet<HakAkses>,
): boolean {
  if (!item.peran && !item.hakAkses) return true;
  const cocokPeran = item.peran ? item.peran.some((p) => peran.has(p)) : false;
  const cocokHak = item.hakAkses ? item.hakAkses.some((h) => hakAkses.has(h)) : false;
  return cocokPeran || cocokHak;
}

export function menuUntuk(
  peran: ReadonlySet<PeranEfektif>,
  hakAkses: ReadonlySet<HakAkses> = new Set(),
): GrupMenu[] {
  return MENU.map((g) => ({
    ...g,
    item: g.item.filter((i) => bolehTampilItem(i, peran, hakAkses)),
  })).filter((g) => g.item.length > 0);
}
