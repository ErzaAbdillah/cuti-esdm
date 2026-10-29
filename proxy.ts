import { type NextRequest, NextResponse } from "next/server";

/**
 * Pemeriksaan optimistis: tanpa cookie sesi, halaman aplikasi langsung
 * diarahkan ke /login. Validasi sesi yang sebenarnya (DB, kedaluwarsa,
 * peran) tetap dilakukan di server pada setiap halaman, aksi, dan route.
 * Proxy juga memasang CSP dengan nonce per permintaan: hanya skrip inline
 * milik Next.js (yang diberi nonce) yang boleh berjalan.
 */
const PUBLIK = ["/login", "/daftar", "/api/sehat", "/api/tugas", "/api/auth/google"];

function kebijakanKeamanan(nonce: string): string {
  const dev = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-src 'self' blob:",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const publik = PUBLIK.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const adaSesi = req.cookies.has("__Host-sesi") || req.cookies.has("sesi");

  if (!publik && !adaSesi) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" || pathname === "/beranda" ? "" : `?lanjut=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = kebijakanKeamanan(nonce);
  const headers = new Headers(req.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  const res = NextResponse.next({ request: { headers } });
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

export const config = {
  // Lewati aset statis & berkas di /public.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|lambang-kalsel.png|motif-awan.svg).*)"],
};
