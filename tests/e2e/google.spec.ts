import { createHmac, hkdfSync } from "node:crypto";
import { expect, test } from "@playwright/test";
import { masuk, NIP, PASSWORD } from "./bantu";

/**
 * Alur Google tanpa server Google: berjalan bila server uji dinyalakan dengan
 * GOOGLE_CLIENT_ID/SECRET palsu dan E2E_GOOGLE_SECRET = GOOGLE_CLIENT_SECRET.
 * Identitas Google "tertunda" dibuat dengan cookie bertanda tangan yang sama
 * seperti server/auth/google.ts.
 */
const RAHASIA = process.env.E2E_GOOGLE_SECRET ?? "";

function cookieTertunda(isi: { sub: string; email: string }): string {
  const kunci = Buffer.from(hkdfSync("sha256", RAHASIA, "cuti-esdm", "cookie-google", 32));
  const data = Buffer.from(JSON.stringify({ ...isi, exp: Date.now() + 10 * 60 * 1000 })).toString("base64url");
  return `${data}.${createHmac("sha256", kunci).update(data).digest("base64url")}`;
}

test.beforeEach(() => test.skip(!RAHASIA, "E2E_GOOGLE_SECRET belum diisi (server uji tanpa Google)"));

test("mulai Google: diarahkan ke Google dengan PKCE; callback palsu ditolak", async ({ page, request }) => {
  const r = await request.get("/api/auth/google?mode=masuk", { maxRedirects: 0 });
  expect(r.status()).toBe(307);
  const tujuan = new URL(r.headers().location);
  expect(tujuan.origin).toBe("https://accounts.google.com");
  expect(tujuan.searchParams.get("code_challenge_method")).toBe("S256");
  expect(tujuan.searchParams.get("redirect_uri")).toMatch(/\/api\/auth\/google\/callback$/);

  await page.goto("/api/auth/google/callback?code=palsu&state=palsu");
  await expect(page).toHaveURL(/\/login\?google=gagal/);
  await expect(page.getByText(/Masuk dengan Google gagal/)).toBeVisible();
  await page.goto("/daftar/google");
  await expect(page).toHaveURL(/\/login\?google=gagal/);
});

test("akun lama: hubungkan Google dengan NIP + password, lalu putuskan dari profil", async ({ page, context, baseURL }) => {
  test.skip(!PASSWORD, "SEED_PASSWORD_DEV belum diisi di .env");
  const email = `uji-${Date.now()}@gmail.com`;
  await context.addCookies([{ name: "g-tertunda", value: cookieTertunda({ sub: `uji-${Date.now()}`, email }), url: baseURL! }]);

  await page.goto("/daftar/google");
  await expect(page.getByText(email)).toBeVisible();
  await page.getByRole("tab", { name: "Sudah punya akun" }).click();
  await page.getByLabel("NIP / ID Pegawai").fill(NIP.staf);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Hubungkan & masuk" }).click();
  await expect(page).toHaveURL(/\/beranda/);

  await page.goto("/profil");
  await expect(page.getByText(`Terhubung dengan ${email}`)).toBeVisible();
  // Tanpa izin dari alur Google, ?atur=1 tetap meminta password lama.
  await page.goto("/profil?atur=1");
  await expect(page.getByLabel("Password lama")).toBeVisible();
  await page.getByRole("button", { name: "Putuskan Google" }).click();
  await expect(page.getByText("Akun Google sudah diputus dari akun ini.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Hubungkan akun Google" })).toBeVisible();
});

test("tanpa Google terhubung: login biasa tetap jalan", async ({ page }) => {
  test.skip(!PASSWORD, "SEED_PASSWORD_DEV belum diisi di .env");
  await masuk(page, NIP.staf);
});
