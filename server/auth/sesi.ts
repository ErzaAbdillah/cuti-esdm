import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "../db";
import { infoPermintaan } from "../permintaan";

/** Sesi berakhir setelah 8 jam tidak aktif, dan paling lama 12 jam sejak login. */
const IDLE_MS = 8 * 60 * 60 * 1000;
const MAKS_MS = 12 * 60 * 60 * 1000;
/** Perpanjangan idle ditulis ke DB paling sering tiap 5 menit. */
const INTERVAL_SENTUH_MS = 5 * 60 * 1000;

/** Cookie Secure + prefiks __Host- hanya bila aplikasi diakses lewat HTTPS. */
function aman(): boolean {
  return (process.env.APP_URL ?? "").startsWith("https://");
}
export function namaCookieSesi(): string {
  return aman() ? "__Host-sesi" : "sesi";
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function buatSesi(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const sekarang = Date.now();
  const { ip, userAgent } = await infoPermintaan();
  await db.sesi.create({
    data: {
      id: hashToken(token),
      userId,
      csrfToken: randomBytes(24).toString("base64url"),
      ip,
      userAgent,
      kedaluwarsaPada: new Date(sekarang + IDLE_MS),
    },
  });
  (await cookies()).set(namaCookieSesi(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: aman(),
    path: "/",
    maxAge: MAKS_MS / 1000,
  });
}

export type SesiAktif = NonNullable<Awaited<ReturnType<typeof bacaSesi>>>;

/** Membaca & memvalidasi sesi dari cookie (sekali per request). */
export const bacaSesi = cache(async () => {
  const token = (await cookies()).get(namaCookieSesi())?.value;
  if (!token) return null;

  const sesi = await db.sesi.findUnique({
    where: { id: hashToken(token) },
    include: { user: { include: { peran: true, hakAkses: true } } },
  });
  if (!sesi) return null;

  const sekarang = Date.now();
  const kedaluwarsa = sesi.kedaluwarsaPada.getTime() <= sekarang || sesi.dibuatPada.getTime() + MAKS_MS <= sekarang;
  if (kedaluwarsa || !sesi.user.aktif) {
    await db.sesi.delete({ where: { id: sesi.id } }).catch(() => {});
    return null;
  }

  if (sekarang - sesi.terakhirAktif.getTime() > INTERVAL_SENTUH_MS) {
    await db.sesi.update({
      where: { id: sesi.id },
      data: {
        terakhirAktif: new Date(sekarang),
        kedaluwarsaPada: new Date(Math.min(sekarang + IDLE_MS, sesi.dibuatPada.getTime() + MAKS_MS)),
      },
    });
  }
  return sesi;
});

export async function hapusSesi(): Promise<void> {
  const store = await cookies();
  const token = store.get(namaCookieSesi())?.value;
  if (token) await db.sesi.deleteMany({ where: { id: hashToken(token) } });
  store.delete(namaCookieSesi());
}

/** Keluarkan semua sesi lain milik user (setelah ganti/reset password). */
export async function hapusSesiLain(userId: string, kecualiSesiId?: string): Promise<void> {
  await db.sesi.deleteMany({ where: { userId, ...(kecualiSesiId ? { id: { not: kecualiSesiId } } : {}) } });
}
