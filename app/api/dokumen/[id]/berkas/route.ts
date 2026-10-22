import type { NextRequest } from "next/server";
import { catatAudit } from "@/server/audit";
import { penggunaSaatIni } from "@/server/auth/pengguna";
import { db } from "@/server/db";
import { bacaBerkas } from "@/server/dokumen/penyimpanan";
import { bolehLihatDokumen } from "@/server/layanan/akses-dokumen";

/** Pratinjau/unduh berkas — selalu lewat pemeriksaan hak akses, tidak pernah dari /public. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/dokumen/[id]/berkas">) {
  const u = await penggunaSaatIni();
  if (!u) return new Response("Belum masuk", { status: 401 });
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Tidak ditemukan", { status: 404 });

  const d = await db.dokumen.findUnique({ where: { id }, include: { pengajuanCuti: true } });
  if (!d || d.dihapusPada) return new Response("Tidak ditemukan", { status: 404 });

  if (!(await bolehLihatDokumen(u, d))) return new Response("Akses ditolak", { status: 403 });

  const unduh = req.nextUrl.searchParams.get("unduh") === "1";
  const isi = await bacaBerkas(d);
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
