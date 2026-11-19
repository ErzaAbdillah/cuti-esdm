import "server-only";

/**
 * Route Handler yang mengubah data wajib dipanggil dari origin aplikasi sendiri.
 * (Server Actions sudah memeriksa Origin bawaan Next.js; cookie sesi juga SameSite=Lax.)
 */
export function asalSah(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    return false;
  }
  if (originUrl.protocol !== "https:" && originUrl.protocol !== "http:") return false;

  const appUrl = process.env.APP_URL;
  if (appUrl) {
    try {
      const resmi = new URL(appUrl);
      if (originUrl.host === resmi.host && originUrl.protocol === resmi.protocol) return true;
    } catch {
      // Abaikan APP_URL bila tidak valid.
    }
  }

  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host"))?.trim();
  if (!host || /[\s,]/.test(host)) return false;
  return originUrl.host === host;
}
