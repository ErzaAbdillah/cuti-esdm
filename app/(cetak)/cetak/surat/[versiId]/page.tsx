import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BilahCetak } from "@/components/cetak/tombol-cetak";
import { CetakOtomatis } from "@/components/cetak/cetak-otomatis";
import { LembarSurat } from "@/components/surat/lembar-surat";
import { PratinjauA4 } from "@/components/surat/pratinjau-a4";
import { CSS_HALAMAN_A4 } from "@/lib/surat/lembar";
import { wajibLogin } from "@/server/auth/pengguna";
import { db } from "@/server/db";
import { bolehLihatPengajuan } from "@/server/layanan/akses-cuti";
import { versiTerkunci } from "@/server/kueri/surat";
import { LOGO_WEB } from "@/server/surat/data";

export const metadata: Metadata = { title: "Cetak Surat Cuti" };

/** Lembar surat versi terkunci; setiap pembukaan halaman ini dicatat di print log. */
export default async function CetakSurat({ params, searchParams }: PageProps<"/cetak/surat/[versiId]">) {
  const u = await wajibLogin();
  const { versiId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(versiId)) notFound();
  const d = await versiTerkunci(versiId);
  if (!d) notFound();
  if (!(await bolehLihatPengajuan(u, d.pengajuan))) redirect("/akses-ditolak");
  const { otomatis } = await searchParams;

  await db.printLog.create({ data: { jenis: "SURAT_CETAK", suratVersiId: versiId, olehUserId: u.userId, info: { kode: d.surat.kodeDokumen, nomor: d.surat.nomorLengkap } } });

  return (
    <>
      <style>{CSS_HALAMAN_A4}</style>
      <BilahCetak judul={`${d.surat.template.nama} · versi ${d.versi.versi}`} />
      <main className="min-h-[calc(100dvh-3rem)] bg-slate-200 p-4 print:min-h-0 print:bg-white print:p-0">
        <div className="mx-auto max-w-[210mm] print:max-w-none">
          <PratinjauA4 label="Lembar surat">
            <LembarSurat d={{ ...d.beku, logoSrc: LOGO_WEB }} />
          </PratinjauA4>
        </div>
      </main>
      {otomatis === "1" && <CetakOtomatis />}
    </>
  );
}
