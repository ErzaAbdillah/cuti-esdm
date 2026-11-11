import { penggunaSaatIni, punyaHakAkses, punyaPeran } from "@/server/auth/pengguna";
import { bukuTemplate } from "@/server/excel/buku-pegawai";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function GET() {
  const u = await penggunaSaatIni();
  if (!u) return new Response("Belum masuk", { status: 401 });
  if (!punyaHakAkses(u, "KELOLA_PEGAWAI") && !punyaPeran(u, "KEPEGAWAIAN", "ADMIN")) return new Response("Akses ditolak", { status: 403 });

  return new Response(new Uint8Array(await bukuTemplate()), {
    headers: {
      "Content-Type": XLSX_MIME,
      "Content-Disposition": 'attachment; filename="template-impor-pegawai.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
