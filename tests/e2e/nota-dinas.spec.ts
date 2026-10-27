import { expect, test } from "@playwright/test";
import { masuk, NIP, PASSWORD, tanggalUji } from "./bantu";

const KASUS = [
  { level: "Eselon III", nip: NIP.kepalaBidang, kepada: "Sekretaris Daerah Provinsi Kalimantan Selatan", berkas: "e3" },
  { level: "Eselon II", nip: NIP.kepalaDinas, kepada: "Bapak Gubernur Kalimantan Selatan", berkas: "e2" },
];

for (const k of KASUS) {
  test(`${k.level}: isi formulir & nota dinas → cetak nota dinas tanpa verifikasi`, async ({ page }) => {
    test.skip(!PASSWORD, "SEED_PASSWORD_DEV belum diisi di .env");
    const tanggal = tanggalUji();

    await masuk(page, k.nip);
    await page.goto("/cuti/ajukan");
    await page.waitForLoadState("networkidle"); // tunggu hidrasi: isian dikendalikan React
    await page.getByLabel("Tanggal mulai").fill(tanggal);
    await page.getByLabel("Tanggal selesai").fill(tanggal);
    await expect(page.getByLabel("Lamanya")).toHaveValue("1 (satu) hari kerja");
    await page.getByLabel("Alasan cuti").fill("Urusan keluarga");
    // Nota dinas sesuai eselon; hal & isi tersusun dari isian cuti.
    await expect(page.getByLabel("Kepada Yth.", { exact: true })).toHaveValue(k.kepada);
    await expect(page.getByLabel("Hal", { exact: true })).toHaveValue("Permohonan Izin Cuti Tahunan");
    await expect(page.getByLabel("Isi nota dinas")).toHaveValue(/dikarenakan urusan keluarga, maka bersama ini mohon izin cuti tahunan selama 1 \(satu\) hari kerja sejak tanggal/);
    await page.getByRole("tab", { name: "Nota dinas (Legal)" }).click();
    await expect(page.locator("figure .lembar-nota")).toContainText("dikarenakan urusan keluarga");
    await page.getByRole("button", { name: "Simpan saja" }).click();
    await expect(page).toHaveURL(/\/cuti\/[0-9a-f-]{36}\?baru=1/);
    const url = page.url().split("?")[0];

    try {
      await expect(page.getByRole("link", { name: "Cetak nota dinas" })).toBeVisible();
      await page.goto(url.replace("/cuti/", "/cetak/nota-dinas/"));
      const lembar = page.locator(".lembar-nota");
      await expect(lembar).toContainText("NOTA DINAS");
      await expect(lembar).toContainText(k.kepada);
      await expect(lembar).toContainText("Disposisi Atasan :");
      if (process.env.E2E_GAMBAR) await lembar.screenshot({ path: `${process.env.E2E_GAMBAR}/nota-${k.berkas}.png` });
    } finally {
      // Bersihkan: pemohon membatalkan agar saldo kembali dan tanggal bisa dipakai lagi.
      await page.goto(url);
      await page.getByRole("button", { name: "Batalkan pengajuan" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Batalkan pengajuan" }).click();
      await expect(page.getByText("Dibatalkan").first()).toBeVisible();
    }
  });
}
