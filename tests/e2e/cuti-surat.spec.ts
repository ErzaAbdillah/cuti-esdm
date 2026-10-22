import { expect, type Page, test } from "@playwright/test";
import { keluar, masuk, NIP, PASSWORD } from "./bantu";

/** Hari kerja acak Feb–Mei 2027 agar pengajuan uji tidak bertabrakan antar-run (libur 2027 belum diisi seed). */
function tanggalUji(): string {
  for (;;) {
    const d = new Date(Date.UTC(2027, 1 + Math.floor(Math.random() * 4), 1 + Math.floor(Math.random() * 28)));
    if (d.getUTCDay() >= 1 && d.getUTCDay() <= 5) return d.toISOString().slice(0, 10);
  }
}

async function setujui(page: Page, url: string) {
  await page.goto(url);
  await page.getByRole("button", { name: "Setujui", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Setujui" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
}

test("staf: ajukan → atasan → Kepegawaian → Kepala Dinas → cetak surat izin", async ({ page }) => {
  test.skip(!PASSWORD, "SEED_PASSWORD_DEV belum diisi di .env");
  const tanggal = tanggalUji();

  // 1. Pemohon mengajukan cuti tahunan 1 hari.
  await masuk(page, NIP.staf);
  await page.goto("/cuti/ajukan");
  await page.waitForLoadState("networkidle"); // tunggu hidrasi: input tanggal dikendalikan React
  await page.getByLabel("Tanggal mulai").fill(tanggal);
  await page.getByLabel("Tanggal selesai").fill(tanggal);
  await expect(page.getByText(/1 hari kerja/).first()).toBeVisible();
  await page.getByLabel("Alasan cuti").fill("uji otomatis E2E");
  await page.getByRole("button", { name: "Ajukan cuti" }).click();
  await expect(page).toHaveURL(/\/cuti\/[0-9a-f-]{36}\?baru=1/);
  const url = page.url().split("?")[0];
  await keluar(page);

  try {
    // 2–4. Persetujuan berjenjang.
    for (const nip of [NIP.kepalaSeksi, NIP.kepegawaian, NIP.kepalaDinas]) {
      await masuk(page, nip);
      await setujui(page, url);
      await keluar(page);
    }

    // 5. Pemohon mencetak surat izin → versi terkunci, status Surat Terbit.
    await masuk(page, NIP.staf);
    await page.goto(`${url}/surat/SURAT_IZIN`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("figure .lembar-surat")).toContainText("SURAT IZIN CUTI TAHUNAN");
    const [cetak] = await Promise.all([page.waitForEvent("popup"), page.getByRole("button", { name: "Cetak", exact: true }).click()]);
    await cetak.waitForURL(/\/cetak\/surat\/[0-9a-f-]{36}/);
    await expect(cetak.locator(".lembar-surat")).toContainText(/NOMOR : 800\.1\.11\.4\/\d+\/DESDM\/\d{4}/);
    await cetak.close();
    await page.goto(url);
    await expect(page.getByText("Surat Terbit").first()).toBeVisible();
    await expect(page.getByText(/Versi 1 terkunci/)).toBeVisible();
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
