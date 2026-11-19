import "server-only";
import type { Prisma } from "@/lib/generated/prisma/client";
import { db } from "../db";
import { infoPermintaan } from "../permintaan";

/** 5 kali gagal berturut-turut → akun dikunci 15 menit (spesifikasi [4]). */
export const MAKS_GAGAL_AKUN = 5;
export const LAMA_KUNCI_MS = 15 * 60 * 1000;
/** Lapisan kedua terhadap tebak-tebakan massal dari satu alamat (disesuaikan agar 1 jaringan kantor kecil tidak mudah terblokir). */
export const MAKS_GAGAL_PER_IP = 60;
const JENDELA_MS = 15 * 60 * 1000;

export async function catatPercobaan(
  loginIdDicoba: string,
  berhasil: boolean,
  alasan: string | null,
  userId?: string | null,
  tx: Prisma.TransactionClient = db,
) {
  const { ip, userAgent } = await infoPermintaan();
  await tx.logLogin.create({
    data: { loginIdDicoba: loginIdDicoba.slice(0, 100), userId: userId ?? null, berhasil, alasan, ip, userAgent },
  });
}

export async function ipTerlaluBanyakGagal(tx: Prisma.TransactionClient = db): Promise<boolean> {
  const { ip } = await infoPermintaan();
  if (!ip) return false;
  const n = await tx.logLogin.count({
    where: {
      ip,
      berhasil: false,
      alasan: { not: "IP_DIBATASI" },
      waktu: { gt: new Date(Date.now() - JENDELA_MS) },
    },
  });
  return n >= MAKS_GAGAL_PER_IP;
}

/** Jumlah gagal untuk satu kunci (mis. "aktivasi:<nip>") dalam jendela waktu (bawaan 15 menit). */
export async function gagalTerakhir(loginIdDicoba: string, jendelaMs = JENDELA_MS, tx: Prisma.TransactionClient = db): Promise<number> {
  return tx.logLogin.count({
    where: { loginIdDicoba, berhasil: false, waktu: { gt: new Date(Date.now() - jendelaMs) } },
  });
}
