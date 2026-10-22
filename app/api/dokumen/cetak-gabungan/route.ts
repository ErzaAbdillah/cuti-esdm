import { z } from "zod";
import { MAKS_GABUNG } from "@/lib/dokumen";
import { catatAudit } from "@/server/audit";
import { asalSah } from "@/server/auth/csrf";
import { penggunaSaatIni } from "@/server/auth/pengguna";
import { db } from "@/server/db";
import { GalatGabung, gabungkanPdf } from "@/server/dokumen/gabung";
import { bolehLihatDokumen } from "@/server/layanan/akses-dokumen";

const skema = z.object({ ids: z.array(z.uuid()).min(1, "Pilih minimal satu dokumen.").max(MAKS_GABUNG.berkas, `Paling banyak ${MAKS_GABUNG.berkas} dokumen sekali cetak.`) });

const teks = (pesan: string, status: number) => new Response(pesan, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

/** Gabungkan dokumen terpilih (urutan sesuai pilihan) menjadi satu PDF untuk dicetak. */
export async function POST(req: Request) {
  if (!asalSah(req)) return teks("Permintaan ditolak.", 403);
  const u = await penggunaSaatIni();
  if (!u) return teks("Sesi berakhir. Silakan login kembali.", 401);
  const v = skema.safeParse(await req.json().catch(() => null));
  if (!v.success) return teks(v.error.issues[0]?.message ?? "Permintaan tidak valid.", 400);
  const ids = [...new Set(v.data.ids)];

  const dokumen = await db.dokumen.findMany({ where: { id: { in: ids }, dihapusPada: null }, include: { pengajuanCuti: true } });
  if (dokumen.length !== ids.length) return teks("Sebagian dokumen tidak ditemukan atau sudah dihapus.", 404);
  for (const d of dokumen) if (!(await bolehLihatDokumen(u, d))) return teks(`Anda tidak berhak membuka "${d.namaTampilan}".`, 403);
  if (dokumen.reduce((n, d) => n + d.ukuran, 0) > MAKS_GABUNG.byte) return teks("Ukuran total terlalu besar untuk dicetak sekaligus. Kurangi jumlah dokumen.", 413);

  const urut = ids.map((id) => dokumen.find((d) => d.id === id)!);
  let pdf: Uint8Array;
  try {
    pdf = await gabungkanPdf(urut);
  } catch (e) {
    if (e instanceof GalatGabung) return teks(e.message, 422);
    throw e;
  }
  await db.printLog.create({ data: { jenis: "DOKUMEN_GABUNGAN", olehUserId: u.userId, info: { dokumen: ids } } });
  await catatAudit({ userId: u.userId, aksi: "CETAK_GABUNGAN", entitas: "dokumen", sesudah: { dokumen: ids } });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="dokumen-gabungan.pdf"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
