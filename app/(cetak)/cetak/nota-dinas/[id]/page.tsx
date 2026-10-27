import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BilahCetak } from "@/components/cetak/tombol-cetak";
import { CetakOtomatis } from "@/components/cetak/cetak-otomatis";
import { PratinjauA4 } from "@/components/surat/pratinjau-a4";
import { CSS_NOTA_DINAS, htmlNotaDinas, perluNotaDinas } from "@/lib/formulir/nota-dinas";
import { wajibLogin } from "@/server/auth/pengguna";
import { db } from "@/server/db";
import { isianFormulir } from "@/server/formulir/data";
import { bolehLihatPengajuan } from "@/server/layanan/akses-cuti";

export const metadata: Metadata = { title: "Cetak Nota Dinas Cuti" };

/** Nota dinas pengantar cuti (Eselon II & III), kertas Legal seperti contoh. */
export default async function CetakNotaDinas({ params, searchParams }: PageProps<"/cetak/nota-dinas/[id]">) {
  const u = await wajibLogin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const p = await db.pengajuanCuti.findUnique({ where: { id }, include: { jenisCuti: true } });
  if (!p || !perluNotaDinas(p.levelSurat)) notFound();
  if (!(await bolehLihatPengajuan(u, p))) redirect("/akses-ditolak");
  const { otomatis } = await searchParams;
  const isian = await isianFormulir(p);
  if (!isian.notaDinas) notFound();
  // Nota dinas termasuk berkas permohonan yang dicetak pemohon; dibedakan dari formulir lewat info.dokumen.
  await db.printLog.create({ data: { jenis: "FORMULIR_CUTI", olehUserId: u.userId, info: { pengajuanId: id, dokumen: "NOTA_DINAS" } } });

  return (
    <>
      <style>{`@page { size: legal; margin: 0; } @media print { html, body { margin: 0; } } ${CSS_NOTA_DINAS}`}</style>
      <BilahCetak judul={`Nota dinas cuti · ${isian.nama}`} />
      <main className="min-h-[calc(100dvh-3rem)] bg-slate-200 p-4 print:min-h-0 print:bg-white print:p-0">
        <div className="mx-auto max-w-[215.9mm] print:max-w-none">
          <PratinjauA4 label="Nota dinas cuti" lebarMm={215.9}>
            <div dangerouslySetInnerHTML={{ __html: htmlNotaDinas(isian.notaDinas, p.levelSurat) }} />
          </PratinjauA4>
        </div>
      </main>
      {otomatis === "1" && <CetakOtomatis />}
    </>
  );
}
