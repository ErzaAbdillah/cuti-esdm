import "server-only";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { LevelSurat, TahapPersetujuan } from "@/lib/generated/prisma/enums";
import { hariIniWita } from "@/lib/tanggal";
import { type PenggunaSaatIni, punyaPeran } from "../auth/pengguna";
import { db } from "../db";
import { userDariPegawai, userDenganPeran } from "../notifikasi";
import { alurTahap } from "./cuti";
import { pejabatBerlaku } from "./pejabat";

interface PengajuanRingkas {
  pegawaiId: string;
  atasanLangsungId: string | null;
  levelSurat: LevelSurat;
}

/** Akun penyetuju untuk tahap pejabat berwenang yang diputuskan di aplikasi. */
async function userPejabat(level: LevelSurat, tx: Prisma.TransactionClient = db): Promise<string | null> {
  const alur = await alurTahap(level, "PEJABAT_BERWENANG", tx);
  if (alur?.penyetujuUserId) return alur.penyetujuUserId;
  const pejabat = await pejabatBerlaku(level, null, hariIniWita(), tx);
  return userDariPegawai(pejabat?.pegawaiId, tx);
}

export async function modeTahap(level: LevelSurat, tahap: TahapPersetujuan, tx: Prisma.TransactionClient = db) {
  return (await alurTahap(level, tahap, tx))?.mode ?? "PENGGUNA";
}

/** Siapa boleh memutuskan tahap ini. Tidak ada yang boleh memutuskan pengajuannya sendiri. */
export async function bolehPutuskan(u: PenggunaSaatIni, p: PengajuanRingkas, tahap: TahapPersetujuan, tx: Prisma.TransactionClient = db): Promise<boolean> {
  if (u.pegawai?.id === p.pegawaiId) return false;
  switch (tahap) {
    case "ATASAN_LANGSUNG":
      return !!u.pegawai && u.pegawai.id === p.atasanLangsungId;
    case "KEPEGAWAIAN":
      return punyaPeran(u, "KEPEGAWAIAN");
    case "PEJABAT_BERWENANG":
      // Kepegawaian & Admin selalu boleh memutuskan langsung (alur ringkas kantor).
      if (punyaPeran(u, "KEPEGAWAIAN", "ADMIN")) return true;
      if ((await modeTahap(p.levelSurat, tahap, tx)) === "EKSTERNAL") return false;
      return (await userPejabat(p.levelSurat, tx)) === u.userId;
  }
}

/** Akun yang perlu diberi tahu bahwa sebuah pengajuan menunggu tahap ini. */
export async function penerimaTahap(p: PengajuanRingkas, tahap: TahapPersetujuan, tx: Prisma.TransactionClient = db): Promise<string[]> {
  switch (tahap) {
    case "ATASAN_LANGSUNG":
      return [await userDariPegawai(p.atasanLangsungId, tx)].filter((x): x is string => !!x);
    case "KEPEGAWAIAN":
      return userDenganPeran("KEPEGAWAIAN", tx);
    case "PEJABAT_BERWENANG":
      return [...new Set([...(await userDenganPeran("KEPEGAWAIAN", tx)), ...(await userDenganPeran("ADMIN", tx))])];
  }
}
