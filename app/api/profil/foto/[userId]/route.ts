import type { NextRequest } from "next/server";
import { MIME_FOTO_PROFIL_SAH } from "@/lib/foto-profil";
import { penggunaSaatIni } from "@/server/auth/pengguna";
import { db } from "@/server/db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Menyajikan foto profil pegawai hanya untuk pengguna yang sudah login. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/profil/foto/[userId]">) {
  const u = await penggunaSaatIni();
  if (!u) return new Response("Belum masuk", { status: 401 });

  const { userId } = await ctx.params;
  if (!UUID_RE.test(userId)) return new Response("Tidak ditemukan", { status: 404 });

  const foto = await db.fotoProfil.findUnique({
    where: { userId },
    select: {
      data: true,
      mime: true,
      ukuran: true,
      diubahPada: true,
      user: { select: { aktif: true, pegawai: { select: { aktif: true } } } },
    },
  });

  if (!foto || !foto.user.aktif || (foto.user.pegawai && !foto.user.pegawai.aktif)) {
    return new Response("Tidak ditemukan", { status: 404 });
  }
  if (!MIME_FOTO_PROFIL_SAH.has(foto.mime)) {
    return new Response("Format gambar tidak valid", { status: 415 });
  }

  const etag = `"${foto.diubahPada.getTime()}-${foto.ukuran}"`;
  const cacheControl = req.nextUrl.searchParams.has("v")
    ? "private, max-age=86400, immutable"
    : "private, max-age=3600, must-revalidate";

  if (req.headers.get("if-none-match") === etag) {
    return new Response(null, {
      status: 304,
      headers: { ETag: etag, "Cache-Control": cacheControl, Vary: "Cookie" },
    });
  }

  return new Response(new Uint8Array(foto.data), {
    headers: {
      "Content-Type": foto.mime,
      "Content-Length": String(foto.data.length),
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": cacheControl,
      Vary: "Cookie",
      ETag: etag,
    },
  });
}
