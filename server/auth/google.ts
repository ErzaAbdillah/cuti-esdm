import "server-only";
import { createHash, createHmac, createPublicKey, createVerify, hkdfSync, type JsonWebKey, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Masuk dengan Google (OpenID Connect, Authorization Code + PKCE) tanpa
 * pustaka tambahan. Status alur, identitas Google yang belum terhubung, dan
 * izin atur ulang password disimpan di cookie httpOnly bertanda tangan HMAC
 * yang berumur 10 menit.
 *
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (atau CLIENT_ID_/CLIENT_SECRET_
 * yang terlanjur dibuat di Vercel), APP_URL. Redirect URI yang
 * didaftarkan di Google Cloud: `${APP_URL}/api/auth/google/callback`.
 */
export type ModeGoogle = "masuk" | "hubungkan" | "reset";
export const MODE_GOOGLE: readonly ModeGoogle[] = ["masuk", "hubungkan", "reset"];

const idKlien = () => process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID_ || "";
const rahasiaKlien = () => process.env.GOOGLE_CLIENT_SECRET || process.env.CLIENT_SECRET_ || "";

const URL_OTORISASI = "https://accounts.google.com/o/oauth2/v2/auth";
const URL_TOKEN = "https://oauth2.googleapis.com/token";
const URL_JWKS = "https://www.googleapis.com/oauth2/v3/certs";
const UMUR_MS = 10 * 60 * 1000;
const TIMEOUT_GOOGLE_MS = 8000;
const UMUR_CACHE_JWKS_MS = 60 * 60 * 1000;

interface JwkGoogle extends JsonWebKey {
  kid?: string;
  alg?: string;
}
let cacheJwks: { kunci: Map<string, JwkGoogle>; kadaluarsa: number } | null = null;

async function ambilJwkGoogle(kid: string): Promise<JwkGoogle | null> {
  const sekarang = Date.now();
  if (cacheJwks && cacheJwks.kadaluarsa > sekarang && cacheJwks.kunci.has(kid)) {
    return cacheJwks.kunci.get(kid)!;
  }
  const res = await fetch(URL_JWKS, { cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_GOOGLE_MS) });
  if (!res.ok) return null;
  const body = (await res.json()) as { keys?: JwkGoogle[] };
  const peta = new Map<string, JwkGoogle>();
  for (const k of body.keys ?? []) {
    if (k.kid) peta.set(k.kid, k);
  }
  cacheJwks = { kunci: peta, kadaluarsa: sekarang + UMUR_CACHE_JWKS_MS };
  return peta.get(kid) ?? null;
}

async function verifikasiIdTokenGoogle(idToken: string) {
  const bagian = idToken.split(".");
  if (bagian.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = bagian;
  if (!headerB64 || !payloadB64 || !sigB64) return null;
  let header: { alg?: string; kid?: string };
  let klaim: { iss?: string; aud?: string; exp?: number; nonce?: string; sub?: string; email?: string; email_verified?: boolean };
  try {
    header = JSON.parse(Buffer.from(headerB64, "base64url").toString("utf8"));
    klaim = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (header.alg !== "RS256" || !header.kid) return null;
  const jwk = await ambilJwkGoogle(header.kid);
  if (!jwk) return null;
  try {
    const pub = createPublicKey({ key: jwk, format: "jwk" });
    const sah = createVerify("RSA-SHA256").update(`${headerB64}.${payloadB64}`).verify(pub, sigB64, "base64url");
    return sah ? klaim : null;
  } catch {
    return null;
  }
}

export function googleAktif(): boolean {
  return !!(idKlien() && rahasiaKlien() && process.env.APP_URL);
}

const appUrl = () => (process.env.APP_URL ?? "").replace(/\/$/, "");
const aman = () => appUrl().startsWith("https://");
const namaCookie = (n: string) => (aman() ? `__Host-${n}` : n);
const b64 = (b: Buffer) => b.toString("base64url");

/** Kunci HMAC diturunkan dari client secret, terpisah per keperluan. */
function kunci(): Buffer {
  return Buffer.from(hkdfSync("sha256", rahasiaKlien(), "cuti-esdm", "cookie-google", 32));
}

function tanda(data: object): string {
  const isi = b64(Buffer.from(JSON.stringify({ ...data, exp: Date.now() + UMUR_MS })));
  return `${isi}.${b64(createHmac("sha256", kunci()).update(isi).digest())}`;
}

function bacaTanda<T>(token: string | undefined): T | null {
  if (!token) return null;
  const [isi, sig] = token.split(".");
  if (!isi || !sig) return null;
  const harap = createHmac("sha256", kunci()).update(isi).digest();
  const dapat = Buffer.from(sig, "base64url");
  if (dapat.length !== harap.length || !timingSafeEqual(dapat, harap)) return null;
  try {
    const data = JSON.parse(Buffer.from(isi, "base64url").toString("utf8")) as T & { exp: number };
    return data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}

async function pasang(nama: string, data: object) {
  (await cookies()).set(namaCookie(nama), tanda(data), { httpOnly: true, sameSite: "lax", secure: aman(), path: "/", maxAge: UMUR_MS / 1000 });
}
async function ambil<T>(nama: string): Promise<T | null> {
  return bacaTanda<T>((await cookies()).get(namaCookie(nama))?.value);
}
async function buang(nama: string) {
  (await cookies()).delete(namaCookie(nama));
}

export interface PengikatSesiGoogle {
  userId: string;
  sesiId: string;
}

/** URL halaman pilih akun Google; status alur (state, PKCE, nonce) disimpan di cookie. */
export async function mulaiGoogle(mode: ModeGoogle, pengikat?: PengikatSesiGoogle): Promise<string> {
  const state = b64(randomBytes(24));
  const verifier = b64(randomBytes(48));
  const nonce = b64(randomBytes(24));
  await pasang("g-alur", { state, verifier, nonce, mode, ...pengikat });
  const q = new URLSearchParams({
    client_id: idKlien(),
    redirect_uri: `${appUrl()}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: b64(createHash("sha256").update(verifier).digest()),
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  return `${URL_OTORISASI}?${q}`;
}

export interface IdentitasGoogle {
  sub: string;
  email: string;
}

/**
 * Menukar kode dari callback dengan token, lalu memeriksa id_token. Token
 * diterima langsung dari endpoint token Google lewat TLS dengan client secret,
 * jadi cukup memeriksa klaimnya (OIDC Core 3.1.3.7).
 */
export async function selesaikanGoogle(
  q: URLSearchParams,
): Promise<({ ok: true; mode: ModeGoogle; userId?: string; sesiId?: string } & IdentitasGoogle) | { ok: false }> {
  const alur = await ambil<{ state: string; verifier: string; nonce: string; mode: ModeGoogle; userId?: string; sesiId?: string }>("g-alur");
  await buang("g-alur");
  const code = q.get("code");
  if (!alur || !code || q.get("error") || q.get("state") !== alur.state) return { ok: false };

  try {
    const res = await fetch(URL_TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: idKlien(),
        client_secret: rahasiaKlien(),
        redirect_uri: `${appUrl()}/api/auth/google/callback`,
        grant_type: "authorization_code",
        code_verifier: alur.verifier,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_GOOGLE_MS),
    });
    if (!res.ok) return { ok: false };
    const { id_token } = (await res.json()) as { id_token?: string };
    if (!id_token) return { ok: false };
    const k = await verifikasiIdTokenGoogle(id_token);
    if (!k) return { ok: false };
    const sah =
      (k.iss === "https://accounts.google.com" || k.iss === "accounts.google.com") &&
      k.aud === idKlien() &&
      typeof k.exp === "number" &&
      k.exp * 1000 > Date.now() &&
      k.nonce === alur.nonce &&
      !!k.sub &&
      !!k.email &&
      k.email_verified === true;
    return sah ? { ok: true, mode: alur.mode, userId: alur.userId, sesiId: alur.sesiId, sub: k.sub!, email: k.email!.toLowerCase() } : { ok: false };
  } catch {
    return { ok: false };
  }
}

/** Identitas Google yang belum terhubung ke akun mana pun (menunggu verifikasi NIP). */
export const simpanIdentitasTertunda = (g: IdentitasGoogle) => pasang("g-tertunda", g);
export const bacaIdentitasTertunda = () => ambil<IdentitasGoogle>("g-tertunda");
export const hapusIdentitasTertunda = () => buang("g-tertunda");

/** Izin membuat password baru tanpa password lama, setelah masuk lewat Google (lupa password). */
export const izinkanAturPassword = (userId: string) => pasang("g-reset", { userId });
export async function bolehAturPassword(userId: string): Promise<boolean> {
  return (await ambil<{ userId: string }>("g-reset"))?.userId === userId;
}
export const hapusIzinAturPassword = () => buang("g-reset");

/** Bersihkan semua cookie sementara Google saat logout agar tidak tertinggal di komputer bersama. */
export async function hapusSemuaCookieGoogle() {
  await Promise.all([buang("g-alur"), buang("g-tertunda"), buang("g-reset")]);
}
