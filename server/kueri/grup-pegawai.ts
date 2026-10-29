import "server-only";
import { unitDaftarHadir } from "@/lib/domain/daftar-hadir";
import { type PenggunaSaatIni, punyaPeran } from "../auth/pengguna";
import { db } from "../db";

export const GRUP_PJLP = "PJLP";

export interface GrupPegawai {
  id: string;
  judul: string;
}

/** Kelompok pegawai per unit tingkat-1 (Sekretariat, Bidang, UPTD) + lembar PJLP (Non-ASN). */
export async function semuaGrup(): Promise<GrupPegawai[]> {
  const units = await db.unitKerja.findMany({ where: { aktif: true, judulDaftarHadir: { not: null } }, orderBy: { urutan: "asc" } });
  return [...units.map((u) => ({ id: u.id, judul: u.judulDaftarHadir! })), { id: GRUP_PJLP, judul: "PENYEDIA JASA LAINNYA PERORANGAN (PJLP)" }];
}

/** Kepegawaian & Kepala Dinas: semua grup. Atasan lain: grup unitnya sendiri. */
export async function grupUntuk(u: PenggunaSaatIni): Promise<GrupPegawai[]> {
  const semua = await semuaGrup();
  if (punyaPeran(u, "KEPEGAWAIAN")) return semua;
  if (!punyaPeran(u, "ATASAN") || !u.pegawai) return [];
  const units = await db.unitKerja.findMany({ select: { id: true, parentId: true } });
  const grupSaya = unitDaftarHadir(u.pegawai.unitId, new Map(units.map((x) => [x.id, x])));
  if (grupSaya === null) return semua; // pimpinan tingkat Dinas
  const sekretariat = semua.find((g) => g.judul === "SEKRETARIAT");
  return semua.filter((g) => g.id === grupSaya || (g.id === GRUP_PJLP && grupSaya === sekretariat?.id));
}
/**
 * Id pegawai aktif yang masuk satu kelompok (unit tingkat-1). Kepala Dinas tidak ikut;
 * pegawai tingkat Dinas lainnya ikut Sekretariat; PJLP = semua Non-ASN.
 */
export async function anggotaGrup(grupId: string): Promise<string[]> {
  const units = await db.unitKerja.findMany({ select: { id: true, parentId: true, kode: true } });
  const pohon = new Map(units.map((x) => [x.id, x]));
  const dinas = units.find((x) => !x.parentId);
  const sekretariat = units.find((x) => x.kode === "SEKRETARIAT");
  const pjlp = grupId === GRUP_PJLP;
  const pegawai = await db.pegawai.findMany({
    where: { aktif: true, ...(pjlp ? { statusKepegawaian: "NON_ASN" } : { statusKepegawaian: { not: "NON_ASN" } }) },
    select: { id: true, unitKerjaId: true, jabatan: { select: { memimpinUnitId: true } } },
  });
  return pegawai
    .filter((p) => {
      if (pjlp) return true;
      if (dinas && p.jabatan?.memimpinUnitId === dinas.id) return false;
      return (unitDaftarHadir(p.unitKerjaId, pohon) ?? sekretariat?.id) === grupId;
    })
    .map((p) => p.id);
}

