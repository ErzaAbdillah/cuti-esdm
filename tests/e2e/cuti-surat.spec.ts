import { expect, test } from "@playwright/test";
import { keluar, masuk, NIP, PASSWORD } from "./bantu";

/** Hari kerja acak November 2026 (tanpa libur nasional; saldo 2026 ada di seed) agar run tidak saling bertabrakan. */
function tanggalUji(): string {
  for (;;) {
    const d = new Date(Date.UTC(2026, 10, 2 + Math.floor(Math.random() * 28)));
    if (d.getUTCDay() >= 1 && d.getUTCDay() <= 5) return d.toISOString().slice(0, 10);
  }
}

test("staf: isi & cetak formulir → Kepegawaian terima formulir → buat & cetak surat izin", async ({ page }) => {
  test.skip(!PASSWORD, "SEED_PASSWORD_DEV belum diisi di .env");
  const tanggal = tanggalUji();

  // 1. Pemohon mengisi formulir cuti tahunan 1 hari lalu menyimpannya (tanpa verifikasi).
  await masuk(page, NIP.staf);
  await page.goto("/cuti/ajukan");
  await page.waitForLoadState("networkidle"); // tunggu hidrasi: isian dikendalikan React
  await page.getByLabel("Tanggal mulai").fill(tanggal);
  await page.getByLabel("Tanggal selesai").fill(tanggal);
  await expect(page.getByLabel("Lamanya")).toHaveValue("1 (satu) hari kerja");
  await page.getByLabel("Alasan cuti").fill("uji otomatis E2E");
  await page.getByRole("button", { name: "Simpan saja" }).click();
  await expect(page).toHaveURL(/\/cuti\/[0-9a-f-]{36}\?baru=1/);
  const url = page.url().split("?")[0];
  // Formulir bisa langsung dicetak.
  await page.goto(url.replace("/cuti/", "/cetak/formulir/"));
  await expect(page.locator(".lembar-formulir")).toContainText("FORMULIR PERMINTAAN DAN PEMBERIAN CUTI");
  await page.goto("/beranda"); // halaman cetak tanpa menu
  await keluar(page);

  try {
    // 2. Kepegawaian menerima formulir bertanda tangan → diarahkan ke editor surat.
    await masuk(page, NIP.kepegawaian);
    await page.goto(url);
    await page.getByRole("button", { name: "Formulir diterima — buat surat cuti" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Ya, buat surat cuti" }).click();
    await expect(page).toHaveURL(/\/surat\/SURAT_IZIN$/);
    await page.waitForLoadState("networkidle");

    // 3. Kepegawaian mencetak surat izin → versi terkunci, status Surat Terbit.
    await expect(page.locator("figure .lembar-surat")).toContainText("SURAT IZIN CUTI TAHUNAN");
    const [cetak] = await Promise.all([page.waitForEvent("popup"), page.getByRole("button", { name: "Cetak", exact: true }).click()]);
    await cetak.waitForURL(/\/cetak\/surat\/[0-9a-f-]{36}/);
    await expect(cetak.locator(".lembar-surat")).toContainText(/NOMOR : 800\.1\.11\.4\/\d+\/DESDM\/\d{4}/);
    await cetak.close();
    await page.goto(url);
    await expect(page.getByText("Surat Terbit").first()).toBeVisible();
    await expect(page.getByText(/Versi 1 terkunci/)).toBeVisible();
    await keluar(page);
  } finally {
    // Bersihkan: pemohon membatalkan agar saldo kembali dan tanggal bisa dipakai lagi.
    if (!page.url().includes("/login")) await keluar(page).catch(() => {});
    await masuk(page, NIP.staf);
    await page.goto(url);
    await page.getByRole("button", { name: "Batalkan pengajuan" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Batalkan pengajuan" }).click();
    await expect(page.getByText("Dibatalkan").first()).toBeVisible();
  }
});
