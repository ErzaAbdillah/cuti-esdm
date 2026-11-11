import "server-only";
import type { LevelSurat, StatusCuti } from "@/lib/generated/prisma/enums";
import { type PenggunaSaatIni, punyaHakAkses, punyaPeran } from "../auth/pengguna";
import { db } from "../db";
import { tahapPengajuan } from "./cuti";
import { bolehPutuskan } from "./wewenang-cuti";

/**
 * Pemohon, atasan langsungnya, Kepegawaian/Proses Cuti, Admin, pemutus tahap yang sedang
 * berjalan, dan siapa pun yang pernah memutuskan pengajuan ini (mis. pejabat).
 */
export async function bolehLihatPengajuan(
  u: PenggunaSaatIni,
  p: { id: string; pegawaiId: string; atasanLangsungId: string | null; levelSurat: LevelSurat; status: StatusCuti },
): Promise<boolean> {
  if (punyaHakAkses(u, "PROSES_CUTI") || punyaPeran(u, "KEPEGAWAIAN", "ADMIN")) return true;
  if (u.pegawai && (u.pegawai.id === p.pegawaiId || u.pegawai.id === p.atasanLangsungId)) return true;
  if (await db.riwayatStatusCuti.findFirst({ where: { pengajuanId: p.id, olehUserId: u.userId }, select: { id: true } })) return true;
  const tahap = await tahapPengajuan(p);
  return !!tahap && (await bolehPutuskan(u, p, tahap));
}

/**
 * Menyiapkan, mengedit, dan mencetak surat: pemegang hak PROSES_CUTI / Kepegawaian & Admin.
 */
export function bolehUbahSurat(u: PenggunaSaatIni, _p: { pegawaiId: string }): boolean {
  return punyaHakAkses(u, "PROSES_CUTI") || punyaPeran(u, "KEPEGAWAIAN", "ADMIN");
}

export function bolehAturNomorSurat(u: PenggunaSaatIni): boolean {
  return punyaHakAkses(u, "PROSES_CUTI") || punyaPeran(u, "KEPEGAWAIAN", "ADMIN");
}
