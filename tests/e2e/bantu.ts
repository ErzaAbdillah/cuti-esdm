import { expect, type Page } from "@playwright/test";

/** NIP akun demo dari prisma/seed/dummy/pegawai.ts (AKUN_DEMO). */
export const NIP = {
  kepalaDinas: "197001151995031901",
  kepegawaian: "198205122006042902",
  kepalaSeksi: "198103172005011904",
  staf: "199002202015031905",
};
export const PASSWORD = process.env.SEED_PASSWORD_DEV ?? "";

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
