import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BilahCetak } from "@/components/cetak/tombol-cetak";
import { kunciTanggal } from "@/lib/domain/hari-kerja";
import { LABEL_STATUS_ABSEN } from "@/lib/label";
import { formatJam, formatTanggal, hariIniWita } from "@/lib/tanggal";
import { wajibPeran } from "@/server/auth/pengguna";
import { db } from "@/server/db";
import { dataDaftarHadir, grupUntuk } from "@/server/kueri/daftar-hadir";

export const metadata: Metadata = { title: "Cetak Daftar Hadir" };

const UKURAN_KERTAS: Record<string, string> = {
  legal: "8.5in 14in", // form fisik Dinas ESDM
  f4: "215mm 330mm",
  a4: "A4",
};

export default async function CetakDaftarHadir({ searchParams }: PageProps<"/cetak/daftar-hadir">) {
  const u = await wajibPeran("ATASAN", "KEPEGAWAIAN");
  const sp = await searchParams;
  const grup = await grupUntuk(u);
  const grupId = typeof sp.grup === "string" && grup.some((g) => g.id === sp.grup) ? sp.grup : null;
  if (!grupId) redirect("/absen/daftar-hadir");
  const tanggal = typeof sp.tanggal === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.tanggal) ? new Date(`${sp.tanggal}T00:00:00Z`) : hariIniWita();
  const d = await dataDaftarHadir(grupId, tanggal);
  if (!d) redirect("/absen/daftar-hadir");

  await db.printLog.create({ data: { jenis: "DAFTAR_HADIR", olehUserId: u.userId, info: { grup: d.judulUnit, tanggal: kunciTanggal(tanggal) } } });
  const ukuran = UKURAN_KERTAS[d.ukuranKertas.toLowerCase()] ?? UKURAN_KERTAS.legal;

  return (
    <>
      <style>{`
        @page { size: ${ukuran}; margin: 12mm 10mm 12mm 18mm; }
        .lembar { font-family: "Times New Roman", Times, serif; font-size: 11.5pt; color: #000; }
        .lembar table.dh { width: 100%; border-collapse: collapse; }
        .lembar table.dh th, .lembar table.dh td { border: 1px solid #000; padding: 4px 6px; vertical-align: top; }
        .lembar table.dh th { text-align: center; font-weight: bold; }
        .lembar tr { break-inside: avoid; }
      `}</style>
      <BilahCetak judul={`Daftar Hadir — ${d.judulUnit} — ${formatTanggal(tanggal, { hari: true })}`} />
      <main className="lembar mx-auto max-w-[200mm] p-6 print:max-w-none print:p-0">
        <header className="mb-4 text-center">
          <p className="font-bold underline underline-offset-2">DAFTAR HADIR MASUK KERJA</p>
          <p className="font-bold">{d.judulInstansi}</p>
        </header>
        <table className="mb-2">
          <tbody>
            <tr>
              <td className="pr-2 font-bold">NAMA UNIT KERJA</td>
              <td className="pr-2">:</td>
              <td className="font-bold">{d.judulUnit}</td>
            </tr>
            <tr>
              <td className="pr-2 font-bold">HARI/TANGGAL</td>
              <td className="pr-2">:</td>
              <td>{formatTanggal(tanggal, { hari: true })}</td>
            </tr>
          </tbody>
        </table>
        <table className="dh">
          <thead>
            <tr>
              <th style={{ width: "7%" }}>No.</th>
              <th style={{ width: "33%" }}>NAMA / NIP / PPPK</th>
              <th style={{ width: "30%" }}>JABATAN / PANGKAT / GOLONGAN</th>
              <th style={{ width: "20%" }}>TANDA TANGAN</th>
              <th style={{ width: "10%" }}>KET</th>
            </tr>
          </thead>
          <tbody>
            {d.baris.map((b, i) => {
              const no = i + 1;
              const kanan = no % 2 === 0; // tanda tangan berselang kiri–kanan seperti form fisik
              const ket = b.status && b.status !== "HADIR" ? LABEL_STATUS_ABSEN[b.status] : "";
              return (
                <tr key={b.pegawaiId}>
                  <td className="text-center">{no}.</td>
                  <td>
                    {b.nama}
                    {b.nip && <br />}
                    {b.nip}
                  </td>
                  <td>
                    {b.jabatan}
                    {b.pangkat && (
                      <>
                        <br />
                        {b.pangkat}
                      </>
                    )}
                  </td>
                  <td className={kanan ? "text-right" : "text-left"}>
                    {b.online && b.jamMasuk ? (
                      <span className="text-[9pt]">
                        {no}. Absen online {formatJam(b.jamMasuk)}
                      </span>
                    ) : (
                      <span className="inline-block pt-3">{no}. ....................</span>
                    )}
                  </td>
                  <td className="text-center text-[10pt]">{ket}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {d.penandatangan && (
          <div className="mt-8 flex justify-end break-inside-avoid">
            <div className="w-[75mm] text-center">
              <p>{d.penandatangan.jabatan}</p>
              <div className="h-[22mm]" />
              <p className="font-bold underline underline-offset-2">{d.penandatangan.nama}</p>
              <p>{d.penandatangan.pangkat}</p>
              <p>NIP. {d.penandatangan.nip}</p>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
