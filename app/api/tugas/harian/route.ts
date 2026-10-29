import { timingSafeEqual } from "node:crypto";
import { hariIniWita } from "@/lib/tanggal";
import { selesaikanCutiLewat } from "@/server/layanan/cuti";
import { kirimAntreanEmail } from "@/server/notifikasi";

/**
 * Tugas terjadwal, dipanggil layanan cron (docker-compose) tiap ±10 menit:
 *   curl -X POST -H "Authorization: Bearer $TUGAS_TOKEN" http://app:3000/api/tugas/harian
 * Idempoten: menandai cuti Selesai dan mengirim antrean email (bila SMTP diisi).
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
  const cutiSelesai = await selesaikanCutiLewat(sampai);
  const email = await kirimAntreanEmail();
  return Response.json({ ok: true, cutiSelesai, email });
}
