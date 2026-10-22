import { expect, test } from "@playwright/test";
import { keluar, masuk, NIP, PASSWORD } from "./bantu";

const NIP_TIDAK_TERDAFTAR = "199901012020121001";

test("NIP tidak terdaftar ditolak saat login dan aktivasi", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/NIP/).fill(NIP_TIDAK_TERDAFTAR);
  await page.getByLabel("Password", { exact: true }).fill("SalahSekali123");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page.getByText("NIP/ID atau password salah.")).toBeVisible();

  await page.goto("/daftar");
  await page.getByLabel("NIP / ID Pegawai").fill(NIP_TIDAK_TERDAFTAR);
  await page.getByLabel("NIK atau kode aktivasi").fill("9999000000000001");
  await page.getByLabel("Password baru", { exact: true }).fill("PasswordUji123!");
  await page.getByLabel("Ulangi password", { exact: true }).fill("PasswordUji123!");
  await page.getByRole("button", { name: /Aktifkan|Buat akun|Daftar/ }).click();
  await expect(page.getByText("NIP belum terdaftar, hubungi Kepegawaian.")).toBeVisible();
});

test("NIP terdaftar: aktivasi ganda ditolak, login berhasil", async ({ page }) => {
  test.skip(!PASSWORD, "SEED_PASSWORD_DEV belum diisi di .env");
  await page.goto("/daftar");
  await page.getByLabel("NIP / ID Pegawai").fill(NIP.staf);
  await page.getByLabel("NIK atau kode aktivasi").fill("9999000000000905");
  await page.getByLabel("Password baru", { exact: true }).fill("PasswordUji123!");
  await page.getByLabel("Ulangi password", { exact: true }).fill("PasswordUji123!");
  await page.getByRole("button", { name: /Aktifkan|Buat akun|Daftar/ }).click();
  await expect(page.getByText(/Akun untuk NIP ini sudah ada/)).toBeVisible();

  await masuk(page, NIP.staf);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await keluar(page);
});
