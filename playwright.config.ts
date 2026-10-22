import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

/** E2E terhadap server dev + database seed dummy (`npm run db:seed`). */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: { baseURL: process.env.E2E_URL ?? "http://localhost:3000", locale: "id-ID", timezoneId: "Asia/Makassar", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: { command: "npm run dev", url: "http://localhost:3000/api/sehat", reuseExistingServer: true, timeout: 120_000 },
});
