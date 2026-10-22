/**
 * NIP ASN 18 digit.
 *
 *   PNS : YYYYMMDD (lahir) + YYYYMM (TMT CPNS) + G + NNN
 *   PPPK: YYYYMMDD (lahir) + YYYY (tahun TMT) + "21" + G + NNN
 *
 * G = 1 laki-laki, 2 perempuan. Disimpan tanpa spasi, ditampilkan "8 6 1 3".
 */

export type JenisNip = "PNS" | "PPPK";

export interface InfoNip {
  nip: string;
  jenis: JenisNip;
  tanggalLahir: { tahun: number; bulan: number; hari: number };
  tahunTmt: number;
  /** null untuk PPPK (digit bulan diganti kode 21). */
  bulanTmt: number | null;
  jenisKelamin: "L" | "P";
  nomorUrut: number;
}

export type HasilNip = { ok: true; data: InfoNip } | { ok: false; galat: string };

const KODE_PPPK = 21;

/** Buang spasi, titik, dan tanda hubung yang biasa muncul saat NIP diketik. */
export function normalisasiNip(input: string): string {
  return input.replace(/[\s.\-]/g, "");
}

export function formatNip(nip: string): string {
  const n = normalisasiNip(nip);
  if (!/^\d{18}$/.test(n)) return nip;
  return `${n.slice(0, 8)} ${n.slice(8, 14)} ${n.slice(14, 15)} ${n.slice(15)}`;
}

function tanggalValid(tahun: number, bulan: number, hari: number): boolean {
  const d = new Date(Date.UTC(tahun, bulan - 1, hari));
  return d.getUTCFullYear() === tahun && d.getUTCMonth() === bulan - 1 && d.getUTCDate() === hari;
}

export function parseNip(input: string, tahunSekarang = new Date().getFullYear()): HasilNip {
  const nip = normalisasiNip(input);
  if (!/^\d{18}$/.test(nip)) {
    return { ok: false, galat: "NIP harus 18 digit angka." };
  }

  const tahunLahir = Number(nip.slice(0, 4));
  const bulanLahir = Number(nip.slice(4, 6));
  const hariLahir = Number(nip.slice(6, 8));
  if (!tanggalValid(tahunLahir, bulanLahir, hariLahir) || tahunLahir < 1940 || tahunLahir > tahunSekarang) {
    return { ok: false, galat: "8 digit pertama NIP bukan tanggal lahir yang valid." };
  }

  const tahunTmt = Number(nip.slice(8, 12));
  const kodeTmt = Number(nip.slice(12, 14));
  if (tahunTmt <= tahunLahir || tahunTmt > tahunSekarang + 1) {
    return { ok: false, galat: "Tahun TMT pada NIP tidak valid." };
  }

  let jenis: JenisNip;
  if (kodeTmt === KODE_PPPK) {
    jenis = "PPPK";
  } else if (kodeTmt >= 1 && kodeTmt <= 12) {
    jenis = "PNS";
  } else {
    return { ok: false, galat: "Digit 13–14 NIP harus bulan TMT (01–12) atau kode PPPK (21)." };
  }

  const g = nip[14];
  if (g !== "1" && g !== "2") {
    return { ok: false, galat: "Digit ke-15 NIP harus 1 (laki-laki) atau 2 (perempuan)." };
  }

  const nomorUrut = Number(nip.slice(15));
  if (nomorUrut === 0) {
    return { ok: false, galat: "Nomor urut NIP tidak boleh 000." };
  }

  return {
    ok: true,
    data: {
      nip,
      jenis,
      tanggalLahir: { tahun: tahunLahir, bulan: bulanLahir, hari: hariLahir },
      tahunTmt,
      bulanTmt: jenis === "PNS" ? kodeTmt : null,
      jenisKelamin: g === "1" ? "L" : "P",
      nomorUrut,
    },
  };
}
