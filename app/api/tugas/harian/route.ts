import { timingSafeEqual } from "node:crypto";
import { hariIniWita } from "@/lib/tanggal";
import { selesaikanCutiLewat } from "@/server/layanan/cuti";
import { kirimAntreanEmail } from "@/server/notifikasi";

/**
 * Tugas terjadwal harian:
 * - Di Vercel Cron: GET /api/tugas/harian dengan header `Authorization: Bearer <CRON_SECRET>`
 *   (jadwal di vercel.json: "0 17 * * *" = setiap hari pukul 01:00 WITA).
 * - Di server lokal/Docker: POST /api/tugas/harian dengan `Authorization: Bearer <TUGAS_TOKEN>`.
 * Idempoten: menandai cuti Selesai dan mengirim antrean email (bila SMTP diisi).
 */
function cocokRahasia(diberikan: string, harapan: string | undefined): boolean {
  if (!harapan || harapan.length < 24 || !diberikan) return false;
  const a = Buffer.from(harapan);
  const b = Buffer.from(diberikan);
  return a.length === b.length && timingSafeEqual(a, b);
}

function tokenSah(req: Request): boolean {
  const diberikan = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  return cocokRahasia(diberikan, process.env.CRON_SECRET) || cocokRahasia(diberikan, process.env.TUGAS_TOKEN);
}

async function jalankanTugas(req: Request) {
  if (!tokenSah(req)) {
    return Response.json({ galat: "Token tidak sah." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const sampai = hariIniWita();
  const cutiSelesai = await selesaikanCutiLewat(sampai);
  const email = await kirimAntreanEmail();
  return Response.json({ ok: true, cutiSelesai, email }, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(req: Request) {
  return jalankanTugas(req);
}

export async function POST(req: Request) {
  return jalankanTugas(req);
}
