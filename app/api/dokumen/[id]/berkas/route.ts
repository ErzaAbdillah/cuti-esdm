import type { NextRequest } from "next/server";
import { catatAudit } from "@/server/audit";
import { penggunaSaatIni } from "@/server/auth/pengguna";
import { db } from "@/server/db";
import { bacaBerkas, GalatBerkasTidakDitemukan, GalatKonfigurasiBerkas } from "@/server/dokumen/penyimpanan";
import { bolehLihatDokumen } from "@/server/layanan/akses-dokumen";

const teks = (pesan: string, status: number) => new Response(pesan, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

/** Pratinjau/unduh berkas — selalu lewat pemeriksaan hak akses, tidak pernah dari /public. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/dokumen/[id]/berkas">) {
  const u = await penggunaSaatIni();
  if (!u) return teks("Belum masuk", 401);
  if (u.wajibGantiPassword) return teks("Ganti password sementara terlebih dahulu di halaman Profil.", 403);
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return teks("Tidak ditemukan", 404);

  const d = await db.dokumen.findUnique({ where: { id }, include: { pengajuanCuti: true } });
  if (!d || d.dihapusPada) return teks("Tidak ditemukan", 404);

  if (!(await bolehLihatDokumen(u, d))) return teks("Akses ditolak", 403);

  const unduh = req.nextUrl.searchParams.get("unduh") === "1";
  let isi: Buffer;
  try {
    isi = await bacaBerkas(d);
  } catch (e) {
    if (e instanceof GalatBerkasTidakDitemukan) return teks(e.message, 404);
    if (e instanceof GalatKonfigurasiBerkas) return teks(e.message, 503);
    throw e;
  }
  await catatAudit({ userId: u.userId, aksi: unduh ? "UNDUH_DOKUMEN" : "LIHAT_DOKUMEN", entitas: "dokumen", entitasId: d.id });

  const nama = encodeURIComponent(d.namaTampilan.endsWith(`.${d.ekstensi}`) ? d.namaTampilan : `${d.namaTampilan}.${d.ekstensi}`);
  const inline = !unduh && (d.mime === "application/pdf" || d.mime.startsWith("image/"));
  return new Response(new Uint8Array(isi), {
    headers: {
      "Content-Type": d.mime,
      "Content-Length": String(isi.length),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${nama}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
