const SATUAN = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];

/** Bilangan bulat 0–999.999 dalam kata (huruf kecil), mis. 12 → "dua belas". */
export function terbilang(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 999_999) throw new RangeError("terbilang: 0–999.999");
  if (n === 0) return "nol";
  const kata = (x: number): string => {
    if (x < 12) return SATUAN[x];
    if (x < 20) return `${SATUAN[x - 10]} belas`;
    if (x < 100) return `${SATUAN[Math.floor(x / 10)]} puluh${x % 10 ? ` ${SATUAN[x % 10]}` : ""}`;
    if (x < 200) return `seratus${x - 100 ? ` ${kata(x - 100)}` : ""}`;
    if (x < 1000) return `${SATUAN[Math.floor(x / 100)]} ratus${x % 100 ? ` ${kata(x % 100)}` : ""}`;
    if (x < 2000) return `seribu${x - 1000 ? ` ${kata(x - 1000)}` : ""}`;
    return `${kata(Math.floor(x / 1000))} ribu${x % 1000 ? ` ${kata(x % 1000)}` : ""}`;
  };
  return kata(n);
}
