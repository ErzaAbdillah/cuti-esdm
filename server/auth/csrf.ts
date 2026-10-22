import "server-only";

/**
 * Route Handler yang mengubah data wajib dipanggil dari origin aplikasi sendiri.
 * (Server Actions sudah memeriksa Origin bawaan Next.js; cookie sesi juga SameSite=Lax.)
 */
export function asalSah(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
