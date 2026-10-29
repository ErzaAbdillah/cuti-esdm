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

test("lupa password akun lama: NIK salah ditolak dengan pesan umum", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "g-tertunda", value: cookieTertunda({ sub: `uji-${Date.now()}`, email: "lupa@gmail.com" }), url: baseURL! }]);
  await page.goto("/daftar/google?lupa=1");
  await expect(page.getByRole("tab", { name: "Lupa password" })).toHaveAttribute("aria-selected", "true");
  // NIP tak terdaftar: tidak menyentuh batas percobaan akun demo.
  await page.getByLabel("NIP / ID Pegawai").fill("PJLP-TIDAK-ADA");
  await page.getByLabel("NIK").fill("9999000000000000");
  await page.getByRole("button", { name: "Verifikasi & buat password baru" }).click();
  await expect(page.getByText(/Verifikasi gagal: NIP atau NIK tidak cocok/)).toBeVisible();
});

/** Butuh E2E_DATABASE_URL (DB yang sama dengan server uji) untuk membaca NIK akun demo. */
test("lupa password akun lama: NIP + NIK → Google terhubung → password baru tanpa password lama", async ({ page, context, baseURL }) => {
  test.skip(!PASSWORD || !process.env.E2E_DATABASE_URL, "SEED_PASSWORD_DEV / E2E_DATABASE_URL belum diisi");
  const { Client } = await import("pg");
  const pg = new Client({ connectionString: process.env.E2E_DATABASE_URL });
  await pg.connect();
  const { rows } = await pg.query<{ nik: string }>("select nik from pegawai where nip = $1", [NIP.staf]);
  await pg.end();

  const email = `lupa-${Date.now()}@gmail.com`;
  await context.addCookies([{ name: "g-tertunda", value: cookieTertunda({ sub: `uji-${Date.now()}`, email }), url: baseURL! }]);
  await page.goto("/daftar/google?lupa=1");
  await page.getByLabel("NIP / ID Pegawai").fill(NIP.staf);
  await page.getByLabel("NIK").fill(rows[0].nik);
  await page.getByRole("button", { name: "Verifikasi & buat password baru" }).click();
  await expect(page).toHaveURL(/\/profil\?atur=1/);
  await expect(page.getByLabel("Password lama")).toHaveCount(0);
  // Kembalikan ke password seed agar tes lain tetap jalan.
  await page.getByLabel("Password baru", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Ulangi password baru").fill(PASSWORD);
  await page.getByRole("button", { name: "Simpan password" }).click();
  await expect(page.getByText(/Password baru tersimpan/)).toBeVisible();
  await expect(page.getByText(`Terhubung dengan ${email}`)).toBeVisible();
  await page.getByRole("button", { name: "Putuskan Google" }).click();
  await expect(page.getByText("Akun Google sudah diputus dari akun ini.")).toBeVisible();
});

test("tanpa Google terhubung: login biasa tetap jalan", async ({ page }) => {
  test.skip(!PASSWORD, "SEED_PASSWORD_DEV belum diisi di .env");
  await masuk(page, NIP.staf);
});
