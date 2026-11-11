import "server-only";
import { type PenggunaSaatIni, punyaHakAkses, punyaPeran } from "../auth/pengguna";
import { db } from "../db";
import { anggotaGrup, grupUntuk } from "./grup-pegawai";

export const SEMUA_UNIT = "SEMUA";

/** Grup yang dipilih (dibatasi hak akses) dan id pegawainya, untuk halaman & ekspor rekap. */
export async function lingkupRekap(u: PenggunaSaatIni, grupDiminta: unknown) {
  const grup = await grupUntuk(u);
  const kepegawaian = punyaHakAkses(u, "KELOLA_SALDO_CUTI") || punyaPeran(u, "KEPEGAWAIAN");
  const pilihan = kepegawaian ? [{ id: SEMUA_UNIT, judul: "SEMUA UNIT" }, ...grup] : grup;
  const grupId = pilihan.some((g) => g.id === grupDiminta) ? (grupDiminta as string) : pilihan[0]?.id;
  const pegawaiIds = !grupId
    ? []
    : grupId === SEMUA_UNIT
      ? (await db.pegawai.findMany({ where: { aktif: true }, select: { id: true } })).map((p) => p.id)
      : await anggotaGrup(grupId);
  return { pilihan, grupId, judul: pilihan.find((g) => g.id === grupId)?.judul ?? "", pegawaiIds };
}
