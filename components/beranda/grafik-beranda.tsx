"use client";

import { BarChart3Icon, PieChartIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { useId, useState } from "react";
import type {
  DataBulananCuti,
  DataBulananPengajuanDinas,
  SegmenDonat,
  TitikTrenSaldo,
} from "@/lib/domain/beranda-analitik";
import { cn } from "@/lib/utils";

function skalaSumbuY(maksNilai: number): number {
  if (maksNilai <= 4) return 4;
  if (maksNilai <= 8) return 8;
  if (maksNilai <= 12) return 12;
  if (maksNilai <= 20) return 20;
  if (maksNilai <= 24) return 24;
  return Math.ceil(maksNilai / 4) * 4;
}

/** 1) Grafik Batang Bulanan (Jan–Des): membedakan Cuti Tahunan & Cuti Lainnya. */
export function GrafikBatangBulanan({
  data,
  tahun,
  terpakaiAwalImpor = 0,
  labelKosong,
}: {
  data: readonly DataBulananCuti[];
  tahun: number;
  terpakaiAwalImpor?: number;
  labelKosong?: string;
}) {
  const [terpilih, setTerpilih] = useState<number | null>(null);
  const [terarah, setTerarah] = useState<number | null>(null);
  const indeksAktif = terarah ?? terpilih;

  const totalSemua = data.reduce((sum, d) => sum + d.total, 0);
  const adaLainnya = data.some((d) => d.lainnya > 0);
  const maksData = Math.max(0, ...data.map((d) => d.total));
  const maksY = skalaSumbuY(maksData);
  const garisY = [0, 0.25, 0.5, 0.75, 1];

  const W = 440;
  const H = 200;
  const padL = 30;
  const padR = 10;
  const padT = 18;
  const padB = 28;
  const lebarPlot = W - padL - padR;
  const tinggiPlot = H - padT - padB;
  const lebarSlot = lebarPlot / 12;
  const lebarBatang = Math.min(20, lebarSlot * 0.58);

  const aktif = indeksAktif !== null ? data[indeksAktif] : null;

  return (
    <div className="flex h-full flex-col gap-3">
      {totalSemua > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: "var(--chart-1)" }} />
              Cuti Tahunan
            </span>
            {adaLainnya && (
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: "var(--chart-2)" }} />
                Cuti Lainnya
              </span>
            )}
          </div>
          <div className="min-h-5 text-right font-medium text-judul" aria-live="polite">
            {aktif ? (
              <span>
                {aktif.namaLengkap}:{" "}
                <b>
                  {aktif.total} hari
                </b>
                {aktif.lainnya > 0 && (
                  <span className="text-muted-foreground">
                    {" "}
                    ({aktif.tahunan} tahunan, {aktif.lainnya} lainnya)
                  </span>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground">Arahkan / ketuk batang untuk rincian</span>
            )}
          </div>
        </div>
      )}

      {totalSemua === 0 ? (
        <div className="flex min-h-46 flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 px-4 py-6 text-center">
          <BarChart3Icon className="mb-2 size-7 text-muted-foreground/70" aria-hidden />
          <p className="text-sm font-medium text-judul">
            {labelKosong ?? `Belum ada pemakaian cuti tercatat di tahun ${tahun}`}
          </p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            Grafik bulanan akan terisi otomatis setelah pengajuan cuti disetujui.
          </p>
        </div>
      ) : (
        <div className="w-full">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`Grafik batang pemakaian cuti bulanan tahun ${tahun}`}
            className="h-auto w-full select-none overflow-visible"
          >
            {garisY.map((fraksi) => {
              const nilai = Math.round(maksY * fraksi);
              const y = padT + tinggiPlot * (1 - fraksi);
              return (
                <g key={fraksi}>
                  <line
                    x1={padL}
                    x2={W - padR}
                    y1={y}
                    y2={y}
                    stroke="var(--border)"
                    strokeDasharray={fraksi === 0 ? undefined : "3 3"}
                    strokeWidth={1}
                  />
                  <text
                    x={padL - 6}
                    y={y + 3.5}
                    textAnchor="end"
                    fontSize={10}
                    fill="var(--muted-foreground)"
                  >
                    {nilai}
                  </text>
                </g>
              );
            })}

            {data.map((d, idx) => {
              const cx = padL + idx * lebarSlot + lebarSlot / 2;
              const x = cx - lebarBatang / 2;
              const tinggiTahunan = (d.tahunan / maksY) * tinggiPlot;
              const tinggiLainnya = (d.lainnya / maksY) * tinggiPlot;
              const yTahunan = padT + tinggiPlot - tinggiTahunan;
              const yLainnya = yTahunan - tinggiLainnya;
              const sedangAktif = indeksAktif === idx;

              return (
                <g
                  key={d.bulan}
                  tabIndex={0}
                  role="button"
                  aria-label={`${d.namaLengkap}: ${d.total} hari (${d.tahunan} tahunan, ${d.lainnya} lainnya)`}
                  onMouseEnter={() => setTerarah(idx)}
                  onMouseLeave={() => setTerarah(null)}
                  onFocus={() => setTerarah(idx)}
                  onBlur={() => setTerarah(null)}
                  onClick={() => setTerpilih((prev) => (prev === idx ? null : idx))}
                  className="cursor-pointer outline-none"
                >
                  <rect
                    x={padL + idx * lebarSlot + 1}
                    y={padT - 4}
                    width={lebarSlot - 2}
                    height={tinggiPlot + padB}
                    rx={6}
                    fill={sedangAktif ? "var(--accent)" : "transparent"}
                    opacity={sedangAktif ? 0.65 : 0}
                  />
                  {d.tahunan > 0 && (
                    <rect
                      x={x}
                      y={yTahunan}
                      width={lebarBatang}
                      height={Math.max(2, tinggiTahunan)}
                      rx={d.lainnya > 0 ? 2 : 5}
                      fill="var(--chart-1)"
                      opacity={indeksAktif !== null && !sedangAktif ? 0.45 : 1}
                    />
                  )}
                  {d.lainnya > 0 && (
                    <rect
                      x={x}
                      y={yLainnya}
                      width={lebarBatang}
                      height={Math.max(2, tinggiLainnya)}
                      rx={5}
                      fill="var(--chart-2)"
                      opacity={indeksAktif !== null && !sedangAktif ? 0.45 : 1}
                    />
                  )}
                  {d.total > 0 && (
                    <text
                      x={cx}
                      y={Math.min(yTahunan, yLainnya) - 4}
                      textAnchor="middle"
                      fontSize={9.5}
                      fontWeight={sedangAktif ? 700 : 600}
                      fill="var(--judul)"
                    >
                      {d.total}
                    </text>
                  )}
                  <text
                    x={cx}
                    y={H - 8}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight={sedangAktif ? 700 : 500}
                    fill={sedangAktif ? "var(--judul)" : "var(--muted-foreground)"}
                  >
                    {d.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {terpakaiAwalImpor > 0 && (
        <p className="rounded-xl bg-muted/70 px-3 py-2 text-xs text-muted-foreground">
          Termasuk <b className="text-judul">{terpakaiAwalImpor} hari</b> dari rekap saldo awal sebelum pencatatan bulanan di aplikasi.
        </p>
      )}
    </div>
  );
}

/** 2A) Grafik Garis Tren Sisa Saldo Cuti (13 titik: Awal + Jan–Des). */
export function GrafikTrenSaldo({
  data,
  tahun,
  punyaSaldo,
  dipesan,
}: {
  data: readonly TitikTrenSaldo[];
  tahun: number;
  punyaSaldo: boolean;
  dipesan: number;
}) {
  const gradId = useId();
  const [terpilih, setTerpilih] = useState<number | null>(null);
  const [terarah, setTerarah] = useState<number | null>(null);
  const indeksAktif = terarah ?? terpilih;

  if (!punyaSaldo) {
    return (
      <div className="flex min-h-46 flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 px-4 py-6 text-center">
        <TrendingDownIcon className="mb-2 size-7 text-muted-foreground/70" aria-hidden />
        <p className="text-sm font-medium text-judul">Saldo cuti tahun {tahun} belum diatur</p>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          Setelah Kepegawaian mengatur saldo tahunan, tren sisa cuti Anda akan tampil di sini.
        </p>
      </div>
    );
  }

  const W = 380;
  const H = 200;
  const padL = 30;
  const padR = 14;
  const padT = 18;
  const padB = 28;
  const lebarPlot = W - padL - padR;
  const tinggiPlot = H - padT - padB;

  const maksSaldo = Math.max(12, ...data.map((d) => d.sisa));
  const maksY = skalaSumbuY(maksSaldo);
  const garisY = [0, 0.25, 0.5, 0.75, 1];

  const koordinat = data.map((d, idx) => {
    const x = padL + (idx / Math.max(1, data.length - 1)) * lebarPlot;
    const y = padT + tinggiPlot - (d.sisa / maksY) * tinggiPlot;
    return { ...d, x, y };
  });

  const jalurGaris = koordinat
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const dasarY = padT + tinggiPlot;
  const jalurArea =
    koordinat.length > 0
      ? `${jalurGaris} L ${koordinat[koordinat.length - 1].x.toFixed(1)} ${dasarY.toFixed(1)} L ${koordinat[0].x.toFixed(1)} ${dasarY.toFixed(1)} Z`
      : "";

  const terakhir = koordinat[koordinat.length - 1];
  const yProyeksi = terakhir
    ? padT + tinggiPlot - (terakhir.proyeksiSetelahDipesan / maksY) * tinggiPlot
    : dasarY;

  const aktif = indeksAktif !== null ? koordinat[indeksAktif] : null;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="min-h-5 text-xs" aria-live="polite">
        {aktif ? (
          <p className="font-medium text-judul">
            {aktif.namaLengkap}: <b>sisa {aktif.sisa} hari</b>
            {aktif.indeks === 0 && aktif.terpakaiBulan > 0 && (
              <span className="text-muted-foreground"> (setelah {aktif.terpakaiBulan} hari saldo awal)</span>
            )}
            {aktif.indeks > 0 && aktif.terpakaiBulan > 0 && (
              <span className="text-muted-foreground"> (−{aktif.terpakaiBulan} hari)</span>
            )}
          </p>
        ) : (
          <p className="text-muted-foreground">
            Perjalanan sisa hak cuti tahunan dari awal hingga akhir {tahun}
          </p>
        )}
      </div>

      <div className="w-full">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Grafik garis tren sisa saldo cuti tahun ${tahun}`}
          className="h-auto w-full select-none overflow-visible"
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.01} />
            </linearGradient>
          </defs>

          {garisY.map((fraksi) => {
            const nilai = Math.round(maksY * fraksi);
            const y = padT + tinggiPlot * (1 - fraksi);
            return (
              <g key={fraksi}>
                <line
                  x1={padL}
                  x2={W - padR}
                  y1={y}
                  y2={y}
                  stroke="var(--border)"
                  strokeDasharray={fraksi === 0 ? undefined : "3 3"}
                  strokeWidth={1}
                />
                <text x={padL - 6} y={y + 3.5} textAnchor="end" fontSize={10} fill="var(--muted-foreground)">
                  {nilai}
                </text>
              </g>
            );
          })}

          {jalurArea && <path d={jalurArea} fill={`url(#${gradId})`} />}
          {jalurGaris && (
            <path
              d={jalurGaris}
              fill="none"
              stroke="var(--chart-1)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {dipesan > 0 && terakhir && (
            <g>
              <line
                x1={terakhir.x}
                x2={terakhir.x}
                y1={terakhir.y}
                y2={yProyeksi}
                stroke="var(--chart-3)"
                strokeWidth={2}
                strokeDasharray="3 2"
              />
              <circle
                cx={terakhir.x}
                cy={yProyeksi}
                r={4}
                fill="var(--card)"
                stroke="var(--chart-3)"
                strokeWidth={2}
              />
            </g>
          )}

          {koordinat.map((p, idx) => {
            const sedangAktif = indeksAktif === idx;
            const tampilLabelX = idx === 0 || idx === 3 || idx === 6 || idx === 9 || idx === 12 || sedangAktif;
            return (
              <g
                key={p.indeks}
                tabIndex={0}
                role="button"
                aria-label={`${p.namaLengkap}: sisa ${p.sisa} hari`}
                onMouseEnter={() => setTerarah(idx)}
                onMouseLeave={() => setTerarah(null)}
                onFocus={() => setTerarah(idx)}
                onBlur={() => setTerarah(null)}
                onClick={() => setTerpilih((prev) => (prev === idx ? null : idx))}
                className="cursor-pointer outline-none"
              >
                <circle cx={p.x} cy={p.y} r={12} fill="transparent" />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={sedangAktif ? 5 : idx === 0 || idx === koordinat.length - 1 || p.terpakaiBulan > 0 ? 3.5 : 2.2}
                  fill={sedangAktif ? "var(--card)" : "var(--chart-1)"}
                  stroke="var(--chart-1)"
                  strokeWidth={sedangAktif ? 2.5 : 1.5}
                />
                {sedangAktif && (
                  <text x={p.x} y={Math.max(12, p.y - 9)} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--judul)">
                    {p.sisa}
                  </text>
                )}
                {tampilLabelX && (
                  <text
                    x={p.x}
                    y={H - 8}
                    textAnchor="middle"
                    fontSize={9.5}
                    fontWeight={sedangAktif ? 700 : 500}
                    fill={sedangAktif ? "var(--judul)" : "var(--muted-foreground)"}
                  >
                    {p.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {dipesan > 0 && terakhir && (
        <p className="rounded-xl bg-muted/70 px-3 py-2 text-xs text-muted-foreground">
          Proyeksi setelah <b className="text-judul">{dipesan} hari</b> yang sedang diproses:{" "}
          <b className="text-judul">{terakhir.proyeksiSetelahDipesan} hari tersedia</b>.
        </p>
      )}
    </div>
  );
}

/** 2B) Grafik Garis Tren Jumlah Pengajuan Masuk per Bulan (Mode Admin). */
export function GrafikTrenPengajuanDinas({
  data,
  tahun,
}: {
  data: readonly DataBulananPengajuanDinas[];
  tahun: number;
}) {
  const gradId = useId();
  const [terpilih, setTerpilih] = useState<number | null>(null);
  const [terarah, setTerarah] = useState<number | null>(null);
  const indeksAktif = terarah ?? terpilih;

  const totalPengajuan = data.reduce((sum, d) => sum + d.jumlah, 0);
  if (totalPengajuan === 0) {
    return (
      <div className="flex min-h-46 flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 px-4 py-6 text-center">
        <TrendingUpIcon className="mb-2 size-7 text-muted-foreground/70" aria-hidden />
        <p className="text-sm font-medium text-judul">Belum ada pengajuan di tahun {tahun}</p>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          Tren volume pengajuan cuti pegawai per bulan akan tampil otomatis saat ada pengajuan masuk.
        </p>
      </div>
    );
  }

  const W = 380;
  const H = 200;
  const padL = 30;
  const padR = 14;
  const padT = 18;
  const padB = 28;
  const lebarPlot = W - padL - padR;
  const tinggiPlot = H - padT - padB;

  const maksY = skalaSumbuY(Math.max(4, ...data.map((d) => d.jumlah)));
  const garisY = [0, 0.25, 0.5, 0.75, 1];

  const koordinat = data.map((d, idx) => {
    const x = padL + (idx / Math.max(1, data.length - 1)) * lebarPlot;
    const y = padT + tinggiPlot - (d.jumlah / maksY) * tinggiPlot;
    return { ...d, x, y };
  });

  const jalurGaris = koordinat
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const dasarY = padT + tinggiPlot;
  const jalurArea = `${jalurGaris} L ${koordinat[koordinat.length - 1].x.toFixed(1)} ${dasarY.toFixed(1)} L ${koordinat[0].x.toFixed(1)} ${dasarY.toFixed(1)} Z`;
  const aktif = indeksAktif !== null ? koordinat[indeksAktif] : null;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="min-h-5 text-xs" aria-live="polite">
        {aktif ? (
          <p className="font-medium text-judul">
            {aktif.namaLengkap}: <b>{aktif.jumlah} pengajuan</b>
          </p>
        ) : (
          <p className="text-muted-foreground">
            Jumlah pengajuan cuti masuk tiap bulan di tahun {tahun}
          </p>
        )}
      </div>

      <div className="w-full">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Grafik tren pengajuan cuti dinas per bulan tahun ${tahun}`}
          className="h-auto w-full select-none overflow-visible"
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          {garisY.map((fraksi) => {
            const nilai = Math.round(maksY * fraksi);
            const y = padT + tinggiPlot * (1 - fraksi);
            return (
              <g key={fraksi}>
                <line
                  x1={padL}
                  x2={W - padR}
                  y1={y}
                  y2={y}
                  stroke="var(--border)"
                  strokeDasharray={fraksi === 0 ? undefined : "3 3"}
                  strokeWidth={1}
                />
                <text x={padL - 6} y={y + 3.5} textAnchor="end" fontSize={10} fill="var(--muted-foreground)">
                  {nilai}
                </text>
              </g>
            );
          })}

          <path d={jalurArea} fill={`url(#${gradId})`} />
          <path
            d={jalurGaris}
            fill="none"
            stroke="var(--chart-2)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {koordinat.map((p, idx) => {
            const sedangAktif = indeksAktif === idx;
            const tampilLabelX = idx % 2 === 0 || idx === 11 || sedangAktif;
            return (
              <g
                key={p.bulan}
                tabIndex={0}
                role="button"
                aria-label={`${p.namaLengkap}: ${p.jumlah} pengajuan`}
                onMouseEnter={() => setTerarah(idx)}
                onMouseLeave={() => setTerarah(null)}
                onFocus={() => setTerarah(idx)}
                onBlur={() => setTerarah(null)}
                onClick={() => setTerpilih((prev) => (prev === idx ? null : idx))}
                className="cursor-pointer outline-none"
              >
                <circle cx={p.x} cy={p.y} r={12} fill="transparent" />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={sedangAktif ? 5 : p.jumlah > 0 ? 3.5 : 2.2}
                  fill={sedangAktif ? "var(--card)" : "var(--chart-2)"}
                  stroke="var(--chart-2)"
                  strokeWidth={sedangAktif ? 2.5 : 1.5}
                />
                {sedangAktif && (
                  <text x={p.x} y={Math.max(12, p.y - 9)} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--judul)">
                    {p.jumlah}
                  </text>
                )}
                {tampilLabelX && (
                  <text
                    x={p.x}
                    y={H - 8}
                    textAnchor="middle"
                    fontSize={9.5}
                    fontWeight={sedangAktif ? 700 : 500}
                    fill={sedangAktif ? "var(--judul)" : "var(--muted-foreground)"}
                  >
                    {p.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/** 3) Grafik Lingkaran Donat Interaktif (Komposisi Jatah Cuti / Komposisi Status Pengajuan). */
export function GrafikDonatKomposisi({
  segmen,
  totalPusat,
  labelPusat,
  satuan,
  labelKosong,
}: {
  segmen: readonly SegmenDonat[];
  totalPusat: number;
  labelPusat: string;
  satuan: string;
  labelKosong: string;
}) {
  const [terpilih, setTerpilih] = useState<string | null>(null);
  const [terarah, setTerarah] = useState<string | null>(null);
  const kunciAktif = terarah ?? terpilih;
  const jumlahSegmen = segmen.reduce((sum, s) => sum + s.nilai, 0);

  if (jumlahSegmen === 0) {
    return (
      <div className="flex min-h-46 flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 px-4 py-6 text-center">
        <PieChartIcon className="mb-2 size-7 text-muted-foreground/70" aria-hidden />
        <p className="text-sm font-medium text-judul">{labelKosong}</p>
      </div>
    );
  }

  const ukuran = 152;
  const cx = ukuran / 2;
  const cy = ukuran / 2;
  const r = 56;
  const keliling = 2 * Math.PI * r;

  const segmenAktif = segmen.find((s) => s.kunci === kunciAktif) ?? null;

  const busur = segmen
    .filter((s) => s.nilai > 0)
    .reduce<Array<SegmenDonat & { panjang: number; offset: number }>>((acc, s) => {
      const panjang = (s.nilai / jumlahSegmen) * keliling;
      const sebelumnya = acc[acc.length - 1];
      const offset = sebelumnya ? sebelumnya.offset - sebelumnya.panjang : 0;
      acc.push({ ...s, panjang, offset });
      return acc;
    }, []);

  return (
    <div className="flex h-full flex-col items-center justify-between gap-4">
      <div className="relative flex items-center justify-center">
        <svg
          width={ukuran}
          height={ukuran}
          viewBox={`0 0 ${ukuran} ${ukuran}`}
          role="img"
          aria-label={`${labelPusat}: ${totalPusat} ${satuan}`}
          className="select-none"
        >
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--muted)" strokeWidth={18} />
          {busur.map((b) => {
            const aktif = kunciAktif === b.kunci;
            return (
              <circle
                key={b.kunci}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={b.warnaVar}
                strokeWidth={aktif ? 21 : 18}
                strokeDasharray={`${b.panjang} ${Math.max(0, keliling - b.panjang)}`}
                strokeDashoffset={b.offset}
                transform={`rotate(-90 ${cx} ${cy})`}
                opacity={kunciAktif && !aktif ? 0.4 : 1}
                tabIndex={0}
                role="button"
                aria-label={`${b.label}: ${b.nilai} ${satuan} (${b.persen}%)`}
                onMouseEnter={() => setTerarah(b.kunci)}
                onMouseLeave={() => setTerarah(null)}
                onFocus={() => setTerarah(b.kunci)}
                onBlur={() => setTerarah(null)}
                onClick={() => setTerpilih((prev) => (prev === b.kunci ? null : b.kunci))}
                className="cursor-pointer transition-all duration-150 outline-none"
              />
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
          <span className="text-2xl font-bold leading-none text-judul">
            {segmenAktif ? segmenAktif.nilai : totalPusat}
          </span>
          <span className="mt-1 max-w-20 truncate text-[0.68rem] font-medium leading-tight text-muted-foreground">
            {segmenAktif ? segmenAktif.label : labelPusat}
          </span>
          {segmenAktif && (
            <span className="mt-0.5 text-[0.65rem] font-semibold leading-none text-judul/80">
              {segmenAktif.persen}%
            </span>
          )}
        </div>
      </div>

      <ul className="grid w-full gap-1.5 text-xs">
        {segmen.map((s) => {
          const aktif = kunciAktif === s.kunci;
          return (
            <li key={s.kunci}>
              <button
                type="button"
                aria-pressed={terpilih === s.kunci}
                onMouseEnter={() => setTerarah(s.kunci)}
                onMouseLeave={() => setTerarah(null)}
                onFocus={() => setTerarah(s.kunci)}
                onBlur={() => setTerarah(null)}
                onClick={() => setTerpilih((prev) => (prev === s.kunci ? null : s.kunci))}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1 text-left transition-colors",
                  aktif ? "bg-accent text-judul" : "hover:bg-muted/70",
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.warnaVar }} />
                  <span className="truncate font-medium text-foreground">{s.label}</span>
                </span>
                <span className="shrink-0 font-semibold text-judul">
                  {s.nilai} <span className="font-normal text-muted-foreground">({s.persen}%)</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
