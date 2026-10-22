import { type NextRequest, NextResponse } from "next/server";

/**
 * Pemeriksaan optimistis: tanpa cookie sesi, halaman aplikasi langsung
 * diarahkan ke /login. Validasi sesi yang sebenarnya (DB, kedaluwarsa,
 * peran) tetap dilakukan di server pada setiap halaman, aksi, dan route.
 */
const PUBLIK = ["/login", "/daftar", "/api/sehat"];

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIK.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();

  const adaSesi = req.cookies.has("__Host-sesi") || req.cookies.has("sesi");
  if (adaSesi) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = pathname === "/" || pathname === "/beranda" ? "" : `?lanjut=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Lewati aset statis & berkas di /public.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|lambang-kalsel.png|motif-awan.svg).*)"],
};
