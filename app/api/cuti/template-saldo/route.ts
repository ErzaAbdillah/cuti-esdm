import type { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { hariIniWita } from "@/lib/tanggal";
import { penggunaSaatIni, punyaHakAkses, punyaPeran } from "@/server/auth/pengguna";
import { rekapCutiTahunan } from "@/server/kueri/saldo";

/** Template impor saldo, sudah berisi semua ASN aktif & saldo yang ada — edit lalu unggah kembali. */
export async function GET(req: NextRequest) {
  const u = await penggunaSaatIni();
  if (!u) return new Response("Belum masuk", { status: 401 });
  if (!punyaHakAkses(u, "KELOLA_SALDO_CUTI") && !punyaPeran(u, "KEPEGAWAIAN")) return new Response("Akses ditolak", { status: 403 });
  const t = Number(req.nextUrl.searchParams.get("tahun"));
  const tahun = t >= 2020 && t <= 2100 ? t : hariIniWita().getUTCFullYear();

  const rekap = await rekapCutiTahunan(tahun);
  const judul = ["NIP", "Nama", "Unit", "Sisa N-2", "Sisa N-1", "Hak Tahun Ini", "Terpakai"];
  const isi = rekap.flatMap((g) =>
    g.baris.map((b) => [b.nip.replace(/\s/g, ""), b.nama, g.judul, b.saldo?.sisaN2 ?? 0, b.saldo?.sisaN1 ?? 0, b.saldo?.hakTahunIni ?? 12, b.saldo?.terpakai ?? 0]),
  );
  const ws = XLSX.utils.aoa_to_sheet([judul, ...isi]);
  // NIP sebagai teks agar 18 digit tidak dibulatkan Excel.
  for (let r = 1; r <= isi.length; r++) {
    const sel = ws[XLSX.utils.encode_cell({ r, c: 0 })];
    if (sel) Object.assign(sel, { t: "s", z: "@" });
  }
  ws["!cols"] = [{ wch: 20 }, { wch: 36 }, { wch: 28 }, { wch: 9 }, { wch: 9 }, { wch: 13 }, { wch: 9 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Saldo ${tahun}`);
  return new Response(new Uint8Array(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="saldo-cuti-${tahun}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
