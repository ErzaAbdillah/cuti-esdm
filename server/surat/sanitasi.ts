import "server-only";
import sanitizeHtml from "sanitize-html";
import { KUNCI_TERKUNCI } from "@/lib/surat/render";

/**
 * HTML dari editor surat disanitasi di server sebelum disimpan (daftar tag &
 * atribut yang diizinkan). Hanya struktur yang bisa dibuat editor yang lolos:
 * paragraf, tebal/miring/garis bawah, daftar, tabel sederhana, rata teks,
 * blok identitas, dan isian terkunci.
 */
const RATA = { "text-align": [/^(left|right|center|justify)$/] };
const ISIAN: ReadonlySet<string> = new Set(KUNCI_TERKUNCI);

const OPSI_ISI: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "s", "ol", "ul", "li", "table", "colgroup", "col", "thead", "tbody", "tr", "th", "td", "div", "span"],
  allowedAttributes: {
    p: ["style"],
    li: ["style"],
    th: ["style", "colspan", "rowspan"],
    td: ["style", "colspan", "rowspan"],
    ol: ["start"],
    table: ["class"],
    div: [{ name: "data-blok", multiple: false, values: ["identitas"] }],
    span: [{ name: "data-isian", multiple: false, values: [...KUNCI_TERKUNCI] }],
  },
  allowedClasses: { table: ["tabel-isian"] },
  allowedStyles: { p: RATA, li: RATA, th: RATA, td: RATA },
  allowedSchemes: [],
  transformTags: {
    b: "strong",
    i: "em",
    // <div> hanya sah sebagai blok identitas; selain itu menjadi paragraf.
    div: (tagName, attribs): sanitizeHtml.Tag =>
      attribs["data-blok"] === "identitas" ? { tagName, attribs: { "data-blok": "identitas" } } : { tagName: "p", attribs: {} },
    // <span> hanya sah sebagai isian terkunci; selain itu dilepas (teksnya tetap).
    span: (tagName, attribs): sanitizeHtml.Tag => {
      const k = attribs["data-isian"] ?? "";
      return ISIAN.has(k) ? { tagName, attribs: { "data-isian": k } } : { tagName: "lepas", attribs: {} };
    },
  },
  nonTextTags: ["style", "script", "textarea", "option", "noscript", "title"],
};

export function sanitasiIsiSurat(html: string): string {
  return sanitizeHtml(html, OPSI_ISI)
    .replace(/<div data-blok="identitas">[\s\S]*?<\/div>/g, '<div data-blok="identitas"></div>')
    .replace(/<span data-isian="([a-z_]+)">[^<]*<\/span>/g, '<span data-isian="$1"></span>');
}

/** Blok tujuan surat (Admin): teks dengan baris baru dan penekanan sederhana. */
export function sanitasiTujuan(html: string): string {
  return sanitizeHtml(html, { allowedTags: ["p", "br", "strong", "em", "u"], allowedAttributes: {}, allowedSchemes: [] });
}
