/**
 * Buat nama tab (sheet) Excel yang aman dan unik:
 * - Hapus karakter terlarang Excel (\ / ? * [ ] :) serta tanda petik di awal/akhir
 * - Maksimal 31 karakter
 * - Jika tab dengan nama sama (case-insensitive) sudah ada, tambahkan akhiran " (2)", " (3)", dst.
 */
export function buatNamaSheetUnik(judul: string, terpakai: Set<string>): string {
  const bersih =
    judul
      .replace(/[\\/?*[\]:]/g, "")
      .replace(/^'+|'+$/g, "")
      .trim() || "Unit";
  const dasar = bersih.slice(0, 31).trim() || "Unit";
  if (!terpakai.has(dasar.toLowerCase())) {
    terpakai.add(dasar.toLowerCase());
    return dasar;
  }
  for (let n = 2; n < 1000; n++) {
    const akhiran = ` (${n})`;
    const potong = bersih.slice(0, 31 - akhiran.length).trimEnd() || "Unit";
    const kandidat = `${potong}${akhiran}`;
    if (!terpakai.has(kandidat.toLowerCase())) {
      terpakai.add(kandidat.toLowerCase());
      return kandidat;
    }
  }
  const fallback = `${dasar.slice(0, 24)} (${terpakai.size + 1})`;
  terpakai.add(fallback.toLowerCase());
  return fallback;
}
