import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BilahCetak } from "@/components/cetak/tombol-cetak";
import { CetakOtomatis } from "@/components/cetak/cetak-otomatis";
import { PratinjauA4 } from "@/components/surat/pratinjau-a4";
import { CSS_FORMULIR, htmlFormulir } from "@/lib/formulir/lembar";
import { wajibLogin } from "@/server/auth/pengguna";
import { db } from "@/server/db";
import { dataPengajuanFormulir, isianFormulir } from "@/server/formulir/data";
import { bolehLihatPengajuan } from "@/server/layanan/akses-cuti";
import { teksPengaturan } from "@/server/pengaturan";

export const metadata: Metadata = { title: "Cetak Formulir Cuti" };

export default async function CetakFormulir({ params, searchParams }: PageProps<"/cetak/formulir/[id]">) {
  const u = await wajibLogin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const p = await db.pengajuanCuti.findUnique({ where: { id }, include: { jenisCuti: true } });
  if (!p) notFound();
  if (!(await bolehLihatPengajuan(u, p))) redirect("/akses-ditolak");
  const { otomatis } = await searchParams;
  const [isian, kota] = await Promise.all([isianFormulir(p), teksPengaturan("instansi.kota")]);
  await db.printLog.create({ data: { jenis: "FORMULIR_CUTI", olehUserId: u.userId, info: { pengajuanId: id } } });

  return (
    <>
      <style>{`@page { size: A4; margin: 0; } @media print { html, body { margin: 0; } } ${CSS_FORMULIR}`}</style>
      <BilahCetak judul={`Formulir cuti · ${isian.nama}`} />
      <main className="min-h-[calc(100dvh-3rem)] bg-slate-200 p-4 print:min-h-0 print:bg-white print:p-0">
        <div className="mx-auto max-w-[210mm] print:max-w-none">
          <PratinjauA4 label="Formulir cuti">
            <div dangerouslySetInnerHTML={{ __html: htmlFormulir(isian, dataPengajuanFormulir(p), kota || undefined) }} />
          </PratinjauA4>
        </div>
      </main>
      {otomatis === "1" && <CetakOtomatis />}
    </>
  );
}
