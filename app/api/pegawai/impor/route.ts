import { penggunaSaatIni, punyaPeran } from "@/server/auth/pengguna";
import { asalSah } from "@/server/auth/csrf";
import { pratinjauImpor } from "@/server/excel/impor-pegawai";

const MAKS_BYTE = 5 * 1024 * 1024;

/** Membaca file Excel dan mengembalikan pratinjau validasi per baris. Belum menyimpan apa pun. */
export async function POST(req: Request) {
  if (!asalSah(req)) return Response.json({ galat: "Permintaan ditolak." }, { status: 403 });
  const u = await penggunaSaatIni();
  if (!u) return Response.json({ galat: "Sesi berakhir. Silakan masuk lagi." }, { status: 401 });
  if (!punyaPeran(u, "KEPEGAWAIAN", "ADMIN")) return Response.json({ galat: "Akses ditolak." }, { status: 403 });

  const form = await req.formData().catch(() => null);
  const berkas = form?.get("berkas");
  if (!(berkas instanceof File)) return Response.json({ galat: "Pilih berkas .xlsx." }, { status: 400 });
  if (berkas.size > MAKS_BYTE) return Response.json({ galat: "Berkas maksimal 5 MB." }, { status: 400 });
  if (!berkas.name.toLowerCase().endsWith(".xlsx")) return Response.json({ galat: "Hanya berkas .xlsx." }, { status: 400 });

  const hasil = await pratinjauImpor(await berkas.arrayBuffer());
  return Response.json(hasil, { status: hasil.galat ? 400 : 200, headers: { "Cache-Control": "no-store" } });
}
