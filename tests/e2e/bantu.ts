import { expect, type Page } from "@playwright/test";

/** NIP akun demo dari prisma/seed/dummy/pegawai.ts (AKUN_DEMO). */
export const NIP = {
  kepalaDinas: "197001151995031901",
  kepegawaian: "198205122006042902",
  kepalaBidang: "197608212003121903",
  kepalaSeksi: "198103172005011904",
  staf: "199002202015031905",
};
export const PASSWORD = process.env.SEED_PASSWORD_DEV ?? "";

/** Hari kerja acak November 2026 (tanpa libur nasional; saldo 2026 ada di seed) agar run tidak saling bertabrakan. */
export function tanggalUji(): string {
  for (;;) {
    const d = new Date(Date.UTC(2026, 10, 2 + Math.floor(Math.random() * 28)));
    if (d.getUTCDay() >= 1 && d.getUTCDay() <= 5) return d.toISOString().slice(0, 10);
  }
}

export async function masuk(page: Page, loginId: string) {
  await page.goto("/login");
  await page.getByLabel(/NIP/).fill(loginId);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/beranda/);
}

export async function keluar(page: Page) {
  await page.getByRole("button", { name: /Menu akun/ }).click();
  await page.getByRole("menuitem", { name: "Keluar" }).click();
  await expect(page).toHaveURL(/\/login/);
}
