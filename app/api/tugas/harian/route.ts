import { timingSafeEqual } from "node:crypto";
import { hariIniWita } from "@/lib/tanggal";
import { tandaiAlpa } from "@/server/layanan/absen";

/**
 * Tugas terjadwal, dipanggil layanan cron (docker-compose) tiap ±10 menit:
 *   curl -X POST -H "Authorization: Bearer $TUGAS_TOKEN" http://app:3000/api/tugas/harian
 * Idempoten. Menandai Alpa untuk 7 hari kerja terakhir yang batasnya sudah lewat.
 */
function tokenSah(req: Request): boolean {
  const harapan = process.env.TUGAS_TOKEN;
  const diberikan = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!harapan || harapan.length < 24) return false;
  const a = Buffer.from(harapan);
  const b = Buffer.from(diberikan);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!tokenSah(req)) return Response.json({ galat: "Token tidak sah." }, { status: 401 });
  const sampai = hariIniWita();
  const dari = new Date(sampai.getTime() - 7 * 24 * 60 * 60 * 1000);
  const alpa = await tandaiAlpa(dari, sampai);
  return Response.json({ ok: true, alpa });
}
