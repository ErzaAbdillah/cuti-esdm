import { dokumenHtml } from "@/lib/surat/lembar";
import { penggunaSaatIni } from "@/server/auth/pengguna";
import { db } from "@/server/db";
import { bolehLihatPengajuan } from "@/server/layanan/akses-cuti";
import { versiTerkunci } from "@/server/kueri/surat";
import { htmlKePdf } from "@/server/surat/pdf";
import { logoUntukPdf } from "@/server/surat/data";

/** PDF versi surat yang sudah dikunci, dirender Gotenberg dari HTML yang sama dengan halaman cetak. */
export async function GET(req: Request, ctx: RouteContext<"/api/surat/[versiId]/pdf">) {
  const u = await penggunaSaatIni();
  if (!u) return new Response("Sesi berakhir. Silakan login kembali.", { status: 401 });
  const { versiId } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(versiId)) return new Response("Tidak ditemukan.", { status: 404 });
  const d = await versiTerkunci(versiId);
  if (!d) return new Response("Versi surat tidak ditemukan atau belum dikunci.", { status: 404 });
  if (!(await bolehLihatPengajuan(u, d.pengajuan))) return new Response("Akses ditolak.", { status: 403 });

  const judul = `${d.surat.template.nama} v${d.versi.versi}`;
  const hasil = await htmlKePdf(dokumenHtml({ ...d.beku, logoSrc: await logoUntukPdf() }, judul));
  // Tanpa layanan PDF (mis. di Vercel): buka lembar cetak; pengguna memilih "Simpan sebagai PDF" di dialog cetak.
  if (!hasil.ok) return Response.redirect(new URL(`/cetak/surat/${versiId}?otomatis=1`, req.url), 303);

  await db.printLog.create({ data: { jenis: "SURAT_PDF", suratVersiId: versiId, olehUserId: u.userId, info: { kode: d.surat.kodeDokumen, nomor: d.surat.nomorLengkap } } });
  const nama = `${d.surat.kodeDokumen}-${d.surat.nomorUrut ?? "tanpa-nomor"}-${d.surat.tahun}-v${d.versi.versi}.pdf`.toLowerCase();
  return new Response(new Uint8Array(hasil.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nama}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
