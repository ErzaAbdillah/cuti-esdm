export interface DataSaldo {
  hakTahunIni: number;
  sisaN1: number;
  sisaN2: number;
  penyesuaian: number;
  terpakai: number;
}

/** Seluruh hak cuti tahunan yang berlaku tahun ini (maks. 24 menurut PP 11/2017). */
export function totalHak(s: DataSaldo): number {
  return s.hakTahunIni + s.sisaN1 + s.sisaN2 + s.penyesuaian;
}

/** Saldo yang masih bisa diajukan; `dipesan` = hari pada pengajuan yang sedang diproses. */
export function saldoTersedia(s: DataSaldo, dipesan = 0): number {
  return Math.max(0, totalHak(s) - s.terpakai - dipesan);
}

/**
 * Rincian pemakaian: sisa tertua dipakai lebih dulu (N-2 → N-1 → tahun berjalan),
 * agar hak tahun berjalan yang tersisa bisa dibawa ke tahun berikutnya.
 */
export function rincianPemakaian(s: DataSaldo) {
  let sisa = s.terpakai;
  const dariN2 = Math.min(sisa, s.sisaN2);
  sisa -= dariN2;
  const dariN1 = Math.min(sisa, s.sisaN1);
  sisa -= dariN1;
  const dariN = sisa;
  return { dariN2, dariN1, dariN };
}

export interface BatasAkumulasi {
  maksSisaN1: number;
  maksSisaN2: number;
}

/**
 * Saldo awal tahun berikutnya dari saldo tahun ini (PP 11/2017 Ps. 312):
 * sisa hak tahun berjalan → N-1 (maks. 6); sisa N-1 yang tidak terpakai → N-2 (maks. 6).
 * Sisa N-2 tahun ini hangus. Batas diatur Admin; verifikasi ke BKD.
 */
export function saldoTahunBerikut(s: DataSaldo, hakBaru: number, batas: BatasAkumulasi): Pick<DataSaldo, "hakTahunIni" | "sisaN1" | "sisaN2"> {
  const r = rincianPemakaian(s);
  const sisaTahunIni = Math.max(0, s.hakTahunIni + s.penyesuaian - r.dariN);
  const sisaN1 = Math.max(0, s.sisaN1 - r.dariN1);
  return {
    hakTahunIni: hakBaru,
    sisaN1: Math.min(sisaTahunIni, batas.maksSisaN1),
    sisaN2: Math.min(sisaN1, batas.maksSisaN2),
  };
}
