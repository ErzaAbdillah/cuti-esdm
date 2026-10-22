/**
 * Membuat akun Admin pertama di production (sekali):
 *   npm run admin:buat -- <loginId>
 * Password sementara acak dicetak satu kali; wajib diganti saat login pertama.
 */
import { randomBytes } from "node:crypto";
import { hashPassword } from "../../lib/password";
import { buatKlien } from "./klien";

async function main() {
  const loginId = (process.argv[2] ?? "admin").trim();
  if (!/^[a-z0-9._-]{3,40}$/i.test(loginId)) throw new Error("loginId: 3–40 huruf/angka/titik/garis.");
  const db = buatKlien();
  try {
    if (await db.user.findFirst({ where: { loginId: { equals: loginId, mode: "insensitive" } } })) {
      console.log(`Akun "${loginId}" sudah ada — tidak diubah. Reset password lewat Admin lain bila perlu.`);
      return;
    }
    const sementara = randomBytes(12).toString("base64url");
    await db.user.create({ data: { loginId, passwordHash: await hashPassword(sementara), wajibGantiPassword: true, peran: { create: [{ peran: "ADMIN" }] } } });
    console.log(`Akun Admin "${loginId}" dibuat. Password sementara (catat sekarang, tidak ditampilkan lagi): ${sementara}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
