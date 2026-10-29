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
  /** Kosong = semua pengguna yang login. */
  peran?: PeranEfektif[];
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
      { href: "/cuti/proses", label: "Proses Cuti", ikon: "proses", peran: ["ATASAN", "KEPEGAWAIAN", "ADMIN"] },
      { href: "/cuti/saldo", label: "Saldo & Rekap Cuti", ikon: "rekap", peran: ["KEPEGAWAIAN"] },
    ],
  },
  {
    judul: "Kepegawaian",
    item: [{ href: "/pegawai", label: "Data Pegawai", ikon: "pegawai", peran: ["KEPEGAWAIAN", "ADMIN"] }],
  },
  {
    judul: "Dokumen",
    item: [
      { href: "/dokumen", label: "Dokumen Saya", ikon: "dokumen", peran: ["PEGAWAI"] },
      { href: "/dokumen/organisasi", label: "Dokumen Organisasi", ikon: "folder" },
    ],
  },
  { judul: "Sistem", item: [{ href: "/admin", label: "Admin", ikon: "admin", peran: ["ADMIN"] }] },
];

export function menuUntuk(peran: ReadonlySet<PeranEfektif>): GrupMenu[] {
  return MENU.map((g) => ({ ...g, item: g.item.filter((i) => !i.peran || i.peran.some((p) => peran.has(p))) })).filter(
    (g) => g.item.length > 0,
  );
}
