import type { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { LABEL_STATUS_ABSEN } from "@/lib/label";
import { catatAudit } from "@/server/audit";
import { penggunaSaatIni, punyaPeran } from "@/server/auth/pengguna";
import { lingkupRekap } from "@/server/kueri/lingkup-rekap";
import { KOLOM_REKAP, rekapBulanan, rentangBulan } from "@/server/kueri/rekap-absen";

export async function GET(req: NextRequest) {
  const u = await penggunaSaatIni();
  if (!u) return new Response("Belum masuk", { status: 401 });
  if (!punyaPeran(u, "ATASAN", "KEPEGAWAIAN")) return new Response("Akses ditolak", { status: 403 });

  const sp = req.nextUrl.searchParams;
  const r = rentangBulan(sp.get("bulan") ?? undefined);
  if (!r.valid) return new Response("Bulan belum berjalan", { status: 400 });
  const l = await lingkupRekap(u, sp.get("grup"));
  const data = await rekapBulanan(l.pegawaiIds, r.dari, r.sampai);

  const judul = ["No", "Nama", "NIP / ID", "Jabatan", "Unit Kerja", "Hari Kerja", ...KOLOM_REKAP.map((k) => LABEL_STATUS_ABSEN[k]), "Belum Tercatat"];
  const isi = data.baris.map((b, i) => [i + 1, b.nama, b.nip ?? "", b.jabatan, b.unit, data.hariKerja, ...KOLOM_REKAP.map((k) => b.jumlah[k]), b.belum]);
  const ws = XLSX.utils.aoa_to_sheet([[`REKAP ABSEN ${r.kunci} — ${l.judul}`], [], judul, ...isi]);
  ws["!cols"] = judul.map((j, i) => ({ wch: i === 1 ? 36 : i === 3 || i === 4 ? 30 : Math.max(8, j.length + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rekap");

  await catatAudit({ userId: u.userId, aksi: "EKSPOR_REKAP_ABSEN", entitas: "absensi", sesudah: { bulan: r.kunci, grup: l.judul, jumlah: isi.length } });
  return new Response(new Uint8Array(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="rekap-absen-${r.kunci}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
