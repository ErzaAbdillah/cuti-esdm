/** Pemeriksaan "absen hanya dari jaringan kantor" (Keputusan D). Mendukung IPv4 & CIDR IPv4. */

function ipv4KeAngka(ip: string): number | null {
  const bagian = ip.split(".");
  if (bagian.length !== 4) return null;
  let n = 0;
  for (const b of bagian) {
    if (!/^\d{1,3}$/.test(b) || Number(b) > 255) return null;
    n = n * 256 + Number(b);
  }
  return n;
}

/** "::ffff:192.168.1.5" → "192.168.1.5"; "::1" → "127.0.0.1". */
export function normalisasiIp(ip: string): string {
  const t = ip.trim();
  if (t === "::1") return "127.0.0.1";
  return t.startsWith("::ffff:") ? t.slice(7) : t;
}

export function ipDalamCidr(ip: string, cidr: string): boolean {
  const alamat = normalisasiIp(ip);
  const [jaringan, panjangTeks] = cidr.trim().split("/");
  const a = ipv4KeAngka(alamat);
  const j = ipv4KeAngka(normalisasiIp(jaringan));
  if (a == null || j == null) return alamat === normalisasiIp(jaringan) && panjangTeks === undefined;
  const panjang = panjangTeks === undefined ? 32 : Number(panjangTeks);
  if (!Number.isInteger(panjang) || panjang < 0 || panjang > 32) return false;
  if (panjang === 0) return true;
  const mask = 2 ** 32 - 2 ** (32 - panjang);
  return (a & mask) >>> 0 === (j & mask) >>> 0;
}

/** Daftar kosong = absen boleh dari mana saja. */
export function ipDiizinkan(ip: string | null, daftar: readonly string[]): boolean {
  if (daftar.length === 0) return true;
  if (!ip) return false;
  return daftar.some((c) => ipDalamCidr(ip, c));
}

export function cidrValid(cidr: string): boolean {
  const [jaringan, panjang] = cidr.trim().split("/");
  if (ipv4KeAngka(jaringan) == null) return false;
  return panjang === undefined || (/^\d{1,2}$/.test(panjang) && Number(panjang) <= 32);
}
