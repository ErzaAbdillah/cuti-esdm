import "server-only";
import { db } from "../db";
import { infoPermintaan } from "../permintaan";

/** 5 kali gagal berturut-turut → akun dikunci 15 menit (spesifikasi [4]). */
export const MAKS_GAGAL_AKUN = 5;
export const LAMA_KUNCI_MS = 15 * 60 * 1000;
/** Lapisan kedua terhadap tebak-tebakan massal dari satu alamat. */
const MAKS_GAGAL_PER_IP = 20;
const JENDELA_MS = 15 * 60 * 1000;

export async function catatPercobaan(loginIdDicoba: string, berhasil: boolean, alasan: string | null, userId?: string | null) {
  const { ip, userAgent } = await infoPermintaan();
  await db.logLogin.create({
    data: { loginIdDicoba: loginIdDicoba.slice(0, 100), userId: userId ?? null, berhasil, alasan, ip, userAgent },
  });
}

export async function ipTerlaluBanyakGagal(): Promise<boolean> {
  const { ip } = await infoPermintaan();
  if (!ip) return false;
  const n = await db.logLogin.count({
    where: { ip, berhasil: false, waktu: { gt: new Date(Date.now() - JENDELA_MS) } },
  });
  return n >= MAKS_GAGAL_PER_IP;
}

/** Jumlah gagal untuk satu kunci (mis. "aktivasi:<nip>") dalam 15 menit terakhir. */
export async function gagalTerakhir(loginIdDicoba: string): Promise<number> {
  return db.logLogin.count({
    where: { loginIdDicoba, berhasil: false, waktu: { gt: new Date(Date.now() - JENDELA_MS) } },
  });
}
