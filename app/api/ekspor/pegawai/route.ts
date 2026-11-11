import { type NextRequest } from "next/server";
import { catatAudit } from "@/server/audit";
import { penggunaSaatIni, punyaHakAkses, punyaPeran } from "@/server/auth/pengguna";
import { bukuEkspor } from "@/server/excel/buku-pegawai";
import { bacaFilter, semuaPegawaiUntukEkspor } from "@/server/kueri/pegawai";

export async function GET(req: NextRequest) {
  const u = await penggunaSaatIni();
  if (!u) return new Response("Belum masuk", { status: 401 });
  if (!punyaHakAkses(u, "KELOLA_PEGAWAI") && !punyaPeran(u, "KEPEGAWAIAN", "ADMIN")) return new Response("Akses ditolak", { status: 403 });

  const sp = Object.fromEntries(req.nextUrl.searchParams);
  const f = bacaFilter(sp);
  // Kolom NIK/alamat/HP hanya untuk pengelola pegawai yang memintanya secara eksplisit.
  const pribadi = sp.pribadi === "1" && (punyaHakAkses(u, "KELOLA_PEGAWAI") || punyaPeran(u, "KEPEGAWAIAN", "ADMIN"));
  const baris = await semuaPegawaiUntukEkspor({ ...f, hal: 1 });

  await catatAudit({ userId: u.userId, aksi: "EKSPOR_PEGAWAI", entitas: "pegawai", sesudah: { jumlah: baris.length, pribadi, filter: { ...f, hal: undefined } } });
  const tanggal = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(await bukuEkspor(baris, pribadi)), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="data-pegawai-${tanggal}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
