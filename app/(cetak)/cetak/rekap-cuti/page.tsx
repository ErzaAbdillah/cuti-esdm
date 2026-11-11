import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BilahCetak } from "@/components/cetak/tombol-cetak";
import { hariIniWita } from "@/lib/tanggal";
import { punyaHakAkses, punyaPeran, wajibLogin } from "@/server/auth/pengguna";
import { db } from "@/server/db";
import { rekapCutiTahunan } from "@/server/kueri/saldo";

export const metadata: Metadata = { title: "Cetak Rekap Cuti Tahunan" };

/** "--" untuk nol, seperti rekap fisik. */
const angka = (n: number | null | undefined) => (n ? String(n) : "--");

export default async function CetakRekapCuti({ searchParams }: PageProps<"/cetak/rekap-cuti">) {
  const u = await wajibLogin();
  if (!punyaHakAkses(u, "KELOLA_SALDO_CUTI") && !punyaPeran(u, "KEPEGAWAIAN")) {
    redirect("/akses-ditolak");
  }
  const sp = await searchParams;
  const hariIni = hariIniWita();
  const t = Number(sp.tahun);
  const tahun = t >= 2020 && t <= 2100 ? t : hariIni.getUTCFullYear();
  const rekap = await rekapCutiTahunan(tahun, typeof sp.grup === "string" && sp.grup ? sp.grup : undefined);
  const bulan =
    tahun === hariIni.getUTCFullYear()
      ? new Intl.DateTimeFormat("id-ID", { month: "long", timeZone: "UTC" }).format(hariIni)
      : "Desember";
  await db.printLog.create({ data: { jenis: "REKAP_CUTI", olehUserId: u.userId, info: { tahun, unit: rekap.map((g) => g.judul) } } });

  return (
    <>
      <style>{`
        @page { size: A4; margin: 15mm 12mm; }
        .lembar { font-family: "Times New Roman", Times, serif; font-size: 10.5pt; color: #000; }
        .lembar table.rk { width: 100%; border-collapse: collapse; }
        .lembar table.rk th, .lembar table.rk td { border: 1px solid #000; padding: 2px 5px; }
        .lembar table.rk th { font-weight: bold; text-align: center; }
        .lembar tr { break-inside: avoid; }
      `}</style>
      <BilahCetak judul={`Rekap Cuti Tahunan ASN ${tahun}`} />
      <main className="lembar mx-auto max-w-[186mm] p-6 print:max-w-none print:p-0">
        {rekap.map((g) => (
          <section key={g.id} className="mb-8 break-inside-avoid-page">
            <header className="mb-2 text-center leading-tight">
              <p className="font-bold">REKAP CUTI TAHUNAN ASN</p>
              <p className="font-bold">( {g.judul} )</p>
              <p>
                Bulan Januari s/d {bulan} {tahun}
              </p>
            </header>
            <table className="rk">
              <thead>
                <tr>
                  <th rowSpan={2} style={{ width: "6%" }}>
                    NO.
                  </th>
                  <th rowSpan={2}>NAMA</th>
                  <th colSpan={3}>CUTI / TAHUN</th>
                  <th rowSpan={2} style={{ width: "10%" }}>
                    JUMLAH CUTI
                  </th>
                  <th rowSpan={2} style={{ width: "10%" }}>
                    SUDAH DIAMBIL
                  </th>
                  <th rowSpan={2} style={{ width: "9%" }}>
                    SISA CUTI
                  </th>
                </tr>
                <tr>
                  <th style={{ width: "7%" }}>{tahun - 2}</th>
                  <th style={{ width: "7%" }}>{tahun - 1}</th>
                  <th style={{ width: "7%" }}>{tahun}</th>
                </tr>
              </thead>
              <tbody>
                {g.baris.map((b, i) => (
                  <tr key={b.pegawaiId}>
                    <td className="text-center">{i + 1}.</td>
                    <td>{b.nama}</td>
                    <td className="text-center">{angka(b.saldo?.sisaN2)}</td>
                    <td className="text-center">{angka(b.saldo?.sisaN1)}</td>
                    <td className="text-center">{angka(b.saldo?.hakTahunIni)}</td>
                    <td className="text-center font-bold">{angka(b.totalHak)}</td>
                    <td className="text-center">{angka(b.saldo?.terpakai)}</td>
                    <td className="text-center font-bold">{b.sisa ?? "--"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </main>
    </>
  );
}
