import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FormAjukanCuti } from "@/components/cuti/form-ajukan";
import { Card, CardContent } from "@/components/ui/card";
import { kunciTanggal } from "@/lib/domain/hari-kerja";
import { hariIniWita } from "@/lib/tanggal";
import { wajibPeran } from "@/server/auth/pengguna";
import { opsiPengajuan } from "@/server/kueri/cuti";

export const metadata: Metadata = { title: "Ajukan Cuti" };

export default async function AjukanCuti() {
  const u = await wajibPeran("PEGAWAI");
  const o = await opsiPengajuan(u.pegawai!.id);

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-5">
      <div>
        <Link href="/cuti" className="mb-1 inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeftIcon className="size-4" /> Cuti Saya
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-judul">Ajukan cuti</h1>
      </div>
      {o.jenis.length === 0 ? (
        <Card>
          <CardContent className="text-sm text-slate-700">Belum ada jenis cuti yang berlaku untuk status kepegawaian Anda. Hubungi Kepegawaian.</CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <FormAjukanCuti jenis={o.jenis} rekan={o.rekan} atasan={o.atasan} awal={{ noHp: o.noHp, alamat: o.alamat, hariIni: kunciTanggal(hariIniWita()) }} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
