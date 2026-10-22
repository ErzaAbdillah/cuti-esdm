import { CSS_LEMBAR, type DataLembar, htmlLembar } from "@/lib/surat/lembar";

/**
 * Lembar surat A4. Markup berasal dari `htmlLembar` — sumber yang sama dengan
 * halaman cetak dan PDF — sehingga pratinjau identik dengan hasil cetak.
 */
export function LembarSurat({ d, denganCss = true }: { d: DataLembar; denganCss?: boolean }) {
  return (
    <>
      {denganCss && <style>{CSS_LEMBAR}</style>}
      <div dangerouslySetInnerHTML={{ __html: htmlLembar(d) }} />
    </>
  );
}
