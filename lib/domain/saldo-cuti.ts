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
