import { hash, verify } from "@node-rs/argon2";

/** Argon2id dengan parameter minimum rekomendasi OWASP (19 MiB, t=2, p=1). */
const OPSI_ARGON2 = {
  algorithm: 2, // Algorithm.Argon2id (const enum tidak bisa dipakai dengan isolatedModules)
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

/** Mengembalikan pesan galat, atau null jika password memenuhi syarat. */
export function validasiPassword(password: string): string | null {
  if (password.length < 8) return "Password minimal 8 karakter.";
  if (password.length > 128) return "Password maksimal 128 karakter.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Password harus berisi huruf dan angka.";
  return null;
}

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPSI_ARGON2);
}

export async function cocokPassword(hashTersimpan: string, password: string): Promise<boolean> {
  try {
    return await verify(hashTersimpan, password);
  } catch {
    return false;
  }
}
