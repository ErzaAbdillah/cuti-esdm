import "server-only";
import type { PeranAkses } from "@/lib/generated/prisma/enums";
import { type PenggunaSaatIni, punyaHakAkses, punyaPeran } from "../auth/pengguna";
import { db } from "../db";
import { bolehLihatPengajuan } from "./akses-cuti";

export interface HakFolder {
  lihat: boolean;
  kelola: boolean;
}

const PERAN_AKSES_VALID = new Set<PeranAkses>(["PEGAWAI", "ATASAN", "KEPEGAWAIAN", "ADMIN"]);
const peranAkses = (u: PenggunaSaatIni) =>
  [...u.peran].filter((p): p is PeranAkses => PERAN_AKSES_VALID.has(p as PeranAkses));

/** Hak pengguna atas folder: gabungan hak semua perannya. Admin atau pemilik hak KELOLA_DOKUMEN_ORGANISASI selalu boleh. */
export async function hakFolder(u: PenggunaSaatIni, folderId: string): Promise<HakFolder> {
  if (punyaPeran(u, "ADMIN") || punyaHakAkses(u, "KELOLA_DOKUMEN_ORGANISASI")) {
    return { lihat: true, kelola: true };
  }
  const akses = await db.aksesFolder.findMany({ where: { folderId, peran: { in: peranAkses(u) } } });
  const kelola = akses.some((a) => a.bolehKelola);
  return { lihat: kelola || akses.some((a) => a.bolehLihat), kelola };
}

/** Semua folder yang boleh dilihat, beserta hak kelolanya. */
export async function folderTerlihat(u: PenggunaSaatIni) {
  const kelolaPenuh = punyaPeran(u, "ADMIN") || punyaHakAkses(u, "KELOLA_DOKUMEN_ORGANISASI");
  const folder = await db.folderDokumen.findMany({
    where: kelolaPenuh ? {} : { akses: { some: { peran: { in: peranAkses(u) }, OR: [{ bolehLihat: true }, { bolehKelola: true }] } } },
    include: { akses: true, _count: { select: { dokumen: { where: { dihapusPada: null } } } } },
    orderBy: [{ urutan: "asc" }, { nama: "asc" }],
  });
  return folder.map((f) => ({
    ...f,
    kelola: kelolaPenuh || f.akses.some((a) => a.bolehKelola && u.peran.has(a.peran)),
  }));
}

/** Dokumen pribadi: pemilik, Kepegawaian (KELOLA_PEGAWAI), dan Admin (spesifikasi [10], UU PDP). */
export function bolehDokumenPribadi(u: PenggunaSaatIni, pemilikPegawaiId: string | null): boolean {
  return (
    (!!u.pegawai && u.pegawai.id === pemilikPegawaiId) ||
    punyaHakAkses(u, "KELOLA_PEGAWAI") ||
    punyaPeran(u, "KEPEGAWAIAN", "ADMIN")
  );
}

type DokumenAkses = {
  ruang: "PRIBADI" | "ORGANISASI" | "LAMPIRAN_CUTI" | "LAMPIRAN_KETERANGAN";
  pemilikPegawaiId: string | null;
  folderId: string | null;
  pengajuanCuti: Parameters<typeof bolehLihatPengajuan>[1] | null;
};

export async function bolehLihatDokumen(u: PenggunaSaatIni, d: DokumenAkses): Promise<boolean> {
  switch (d.ruang) {
    case "PRIBADI":
      return bolehDokumenPribadi(u, d.pemilikPegawaiId);
    case "ORGANISASI":
      return !!d.folderId && (await hakFolder(u, d.folderId)).lihat;
    case "LAMPIRAN_CUTI":
      return !!d.pengajuanCuti && (await bolehLihatPengajuan(u, d.pengajuanCuti));
    case "LAMPIRAN_KETERANGAN":
      return punyaPeran(u, "KEPEGAWAIAN", "ATASAN", "ADMIN") || u.pegawai?.id === d.pemilikPegawaiId;
  }
}

/** Ganti nama, ubah kategori, dan hapus — hanya dokumen pribadi & organisasi. */
export async function bolehKelolaDokumen(u: PenggunaSaatIni, d: Pick<DokumenAkses, "ruang" | "pemilikPegawaiId" | "folderId">): Promise<boolean> {
  if (d.ruang === "PRIBADI") return bolehDokumenPribadi(u, d.pemilikPegawaiId);
  if (d.ruang === "ORGANISASI") return !!d.folderId && (await hakFolder(u, d.folderId)).kelola;
  return false;
}
