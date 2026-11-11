import type { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { hariIniWita } from "@/lib/tanggal";
import { catatAudit } from "@/server/audit";
import { penggunaSaatIni, punyaHakAkses, punyaPeran } from "@/server/auth/pengguna";
import { rekapCutiTahunan } from "@/server/kueri/saldo";

export async function GET(req: NextRequest) {
  const u = await penggunaSaatIni();
  if (!u) return new Response("Belum masuk", { status: 401 });
  if (!punyaHakAkses(u, "KELOLA_SALDO_CUTI") && !punyaPeran(u, "KEPEGAWAIAN")) return new Response("Akses ditolak", { status: 403 });
  const t = Number(req.nextUrl.searchParams.get("tahun"));
  const tahun = t >= 2020 && t <= 2100 ? t : hariIniWita().getUTCFullYear();
  const rekap = await rekapCutiTahunan(tahun, req.nextUrl.searchParams.get("grup") || undefined);

  const wb = XLSX.utils.book_new();
  for (const g of rekap) {
    const judul = ["No", "Nama", "NIP", `${tahun - 2}`, `${tahun - 1}`, `${tahun}`, "Penyesuaian", "Jumlah Cuti", "Sudah Diambil", "Sisa Cuti"];
    const isi = g.baris.map((b, i) => [i + 1, b.nama, b.nip, b.saldo?.sisaN2 ?? "", b.saldo?.sisaN1 ?? "", b.saldo?.hakTahunIni ?? "", b.saldo?.penyesuaian ?? "", b.totalHak ?? "", b.saldo?.terpakai ?? "", b.sisa ?? ""]);
    const ws = XLSX.utils.aoa_to_sheet([[`REKAP CUTI TAHUNAN ASN ${tahun} — ${g.judul}`], [], judul, ...isi]);
    ws["!cols"] = [{ wch: 5 }, { wch: 36 }, { wch: 22 }, ...Array(7).fill({ wch: 12 })];
    // Nama sheet Excel maks. 31 karakter dan tanpa karakter khusus.
    XLSX.utils.book_append_sheet(wb, ws, g.judul.replace(/[\\/?*[\]:]/g, "").slice(0, 31));
  }
  await catatAudit({ userId: u.userId, aksi: "EKSPOR_REKAP_CUTI", entitas: "saldo_cuti", sesudah: { tahun, unit: rekap.length } });
  return new Response(new Uint8Array(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="rekap-cuti-tahunan-${tahun}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
