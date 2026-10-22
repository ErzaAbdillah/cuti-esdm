import type { Metadata } from "next";
import { BilahCetak } from "@/components/cetak/tombol-cetak";
import { LABEL_STATUS_KEPEGAWAIAN } from "@/lib/domain/pegawai";
import { LABEL_LEVEL_SURAT } from "@/lib/label";
import { formatTanggal, hariIniWita } from "@/lib/tanggal";
import { catatAudit } from "@/server/audit";
import { wajibPeran } from "@/server/auth/pengguna";
import { bacaFilter, semuaPegawaiUntukEkspor } from "@/server/kueri/pegawai";

export const metadata: Metadata = { title: "Cetak Data Pegawai" };

export default async function CetakPegawai({ searchParams }: PageProps<"/cetak/pegawai">) {
  const u = await wajibPeran("KEPEGAWAIAN", "ADMIN");
  const f = bacaFilter(await searchParams);
  const baris = await semuaPegawaiUntukEkspor({ ...f, hal: 1 });
  await catatAudit({ userId: u.userId, aksi: "EKSPOR_PEGAWAI", entitas: "pegawai", sesudah: { jumlah: baris.length, format: "cetak", filter: { ...f, hal: undefined } } });

  return (
    <>
      <style>{`@page { size: A4 landscape; margin: 12mm 10mm; }`}</style>
      <BilahCetak judul={`Data Pegawai — ${baris.length} orang`} />
      <main className="mx-auto max-w-[277mm] p-4 font-[Times_New_Roman,serif] text-[10pt] print:p-0">
        <header className="mb-3 text-center">
          <p className="font-bold">DATA PEGAWAI</p>
          <p className="font-bold">DINAS ENERGI DAN SUMBER DAYA MINERAL PROVINSI KALIMANTAN SELATAN</p>
          <p>Keadaan per {formatTanggal(hariIniWita())}</p>
        </header>
        <table className="w-full border-collapse [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1">
          <thead className="bg-slate-100 print:bg-transparent">
            <tr>
              <th className="w-8">No</th>
              <th>Nama</th>
              <th>NIP / ID</th>
              <th>Pangkat / Gol.</th>
              <th>Jabatan</th>
              <th>Eselon</th>
              <th>Unit Kerja</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {baris.map((b, i) => (
              <tr key={b.id} className="break-inside-avoid">
                <td className="text-center">{i + 1}</td>
                <td>{b.nama}</td>
                <td className="whitespace-nowrap">{b.nip ?? b.idNonAsn}</td>
                <td>{b.pangkat}</td>
                <td>{b.jabatan}</td>
                <td className="whitespace-nowrap">{LABEL_LEVEL_SURAT[b.level]}</td>
                <td>{b.unit}</td>
                <td className="whitespace-nowrap">{LABEL_STATUS_KEPEGAWAIAN[b.status]}{b.aktif ? "" : " (nonaktif)"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </>
  );
}
