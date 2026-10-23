/**
 * Ekstensi Tiptap untuk badan surat: blok identitas & isian data sistem yang
 * terkunci (tidak bisa diketik), serta tabel yang mempertahankan kelas
 * `tabel-isian` dari template. Hanya dipakai di klien.
 */
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import { Plugin } from "@tiptap/pm/state";
import type { Node as PMNode } from "@tiptap/pm/model";
import { type Extensions, Node } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { type IdentitasSurat, tabelIdentitas } from "@/lib/surat/render";

const TabelSurat = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      class: {
        default: null,
        parseHTML: (el) => el.getAttribute("class"),
        renderHTML: (a) => (a.class ? { class: a.class } : {}),
      },
    };
  },
});

/** Ekstensi dasar: paragraf, tebal/miring/garis bawah, daftar, rata teks, tabel sederhana. */
export function ekstensiDasar(): Extensions {
  return [
    StarterKit.configure({ heading: false, code: false, codeBlock: false, blockquote: false, horizontalRule: false, link: false, trailingNode: false }),
    TextAlign.configure({ types: ["paragraph"] }),
    TabelSurat.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
  ];
}

function hitungBlok(doc: PMNode): number {
  let n = 0;
  doc.descendants((node) => {
    if (node.type.name === "blokIdentitas") n++;
    return node.isBlock;
  });
  return n;
}

/** Tabel Nama/NIP/Pangkat/Jabatan/Satuan Organisasi; tidak bisa diedit, dihapus, atau digandakan. */
export const BlokIdentitas = Node.create<{ identitas: IdentitasSurat | null }>({
  name: "blokIdentitas",
  group: "block",
  atom: true,
  selectable: false,
  draggable: false,
  addOptions() {
    return { identitas: null };
  },
  parseHTML() {
    return [{ tag: 'div[data-blok="identitas"]' }];
  },
  renderHTML() {
    return ["div", { "data-blok": "identitas" }];
  },
  addNodeView() {
    return () => {
      const dom = document.createElement("div");
      dom.contentEditable = "false";
      dom.className = "blok-terkunci";
      dom.title = "Data identitas pemohon diambil dari database dan tidak bisa diubah.";
      // tabelIdentitas meng-escape semua nilai.
      dom.innerHTML = this.options.identitas ? tabelIdentitas(this.options.identitas) : "<p>[Blok identitas pemohon]</p>";
      return { dom };
    };
  },
  addProseMirrorPlugins() {
    return [new Plugin({ filterTransaction: (tr, state) => !tr.docChanged || !!tr.getMeta("muatUlang") || hitungBlok(tr.doc) === hitungBlok(state.doc) })];
  },
});

/** Data sistem di tengah kalimat (nama, NIP, tanggal cuti, …): tampil sebagai label terkunci. */
export const Isian = Node.create<{ nilai: Record<string, string> }>({
  name: "isian",
  group: "inline",
  inline: true,
  atom: true,
  addOptions() {
    return { nilai: {} };
  },
  addAttributes() {
    return {
      kunci: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-isian"),
        renderHTML: (a) => ({ "data-isian": a.kunci }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-isian]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", HTMLAttributes];
  },
  renderText({ node }) {
    return this.options.nilai[node.attrs.kunci] ?? "";
  },
  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("span");
      dom.contentEditable = "false";
      dom.className = "isian-terkunci";
      dom.title = "Data dari sistem — tidak bisa diubah";
      dom.textContent = this.options.nilai[node.attrs.kunci] || `[${node.attrs.kunci}]`;
      return { dom };
    };
  },
});
