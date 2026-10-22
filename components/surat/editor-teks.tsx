"use client";

import { EditorContent, type Extensions, useEditor, useEditorState } from "@tiptap/react";
import {
  AlignCenterIcon,
  AlignJustifyIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  Columns3Icon,
  ItalicIcon,
  ListIcon,
  ListOrderedIcon,
  type LucideIcon,
  Redo2Icon,
  Rows3Icon,
  TableIcon,
  Trash2Icon,
  UnderlineIcon,
  Undo2Icon,
} from "lucide-react";
import { useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ekstensiDasar } from "./ekstensi-surat";

export interface Sisipan {
  label: string;
  /** Konten yang disisipkan di posisi kursor (HTML atau JSON node). */
  konten: string | { type: string; attrs?: Record<string, unknown> };
}

interface Props {
  html: string;
  onChange: (html: string) => void;
  ekstensi?: Extensions;
  sisipan?: Sisipan[];
  /** Ganti isi editor dari luar (mis. "Kembalikan ke template"); naikkan angkanya untuk memicu. */
  muatUlang?: number;
  label: string;
}

function Tombol({ ikon: Ikon, label, aktif, onClick, disabled }: { ikon: LucideIcon; label: string; aktif?: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={aktif}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md text-slate-700 hover:bg-sky-100 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40",
        aktif && "bg-sky-200 text-judul",
      )}
    >
      <Ikon className="size-4" />
    </button>
  );
}

const Pemisah = () => <span className="mx-1 h-6 w-px bg-sky-200" aria-hidden />;

/** Editor teks kaya untuk badan surat: tebal, miring, garis bawah, daftar, rata teks, tabel sederhana. */
export function EditorTeks({ html, onChange, ekstensi = [], sisipan = [], muatUlang = 0, label }: Props) {
  const semuaEkstensi = useMemo(() => [...ekstensiDasar(), ...ekstensi], [ekstensi]);
  const editor = useEditor({
    extensions: semuaEkstensi,
    content: html,
    immediatelyRender: false,
    editorProps: { attributes: { class: "editor-surat", "aria-label": label, role: "textbox", "aria-multiline": "true" } },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (editor && muatUlang > 0) editor.commands.setContent(html, { emitUpdate: true });
    // Hanya saat diminta muat ulang, bukan setiap html berubah karena ketikan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muatUlang, editor]);

  const s = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            underline: e.isActive("underline"),
            bullet: e.isActive("bulletList"),
            ordered: e.isActive("orderedList"),
            kiri: e.isActive({ textAlign: "left" }),
            tengah: e.isActive({ textAlign: "center" }),
            kanan: e.isActive({ textAlign: "right" }),
            rata: e.isActive({ textAlign: "justify" }),
            tabel: e.isActive("table"),
            undo: e.can().undo(),
            redo: e.can().redo(),
          }
        : null,
  });

  const c = () => editor!.chain().focus();
  return (
    <div className="overflow-hidden rounded-xl border border-sky-200 bg-white">
      <div role="toolbar" aria-label="Format teks" className="flex flex-wrap items-center gap-0.5 border-b border-sky-100 bg-sky-50/70 p-1.5">
        <Tombol ikon={BoldIcon} label="Tebal" aktif={s?.bold} onClick={() => c().toggleBold().run()} />
        <Tombol ikon={ItalicIcon} label="Miring" aktif={s?.italic} onClick={() => c().toggleItalic().run()} />
        <Tombol ikon={UnderlineIcon} label="Garis bawah" aktif={s?.underline} onClick={() => c().toggleUnderline().run()} />
        <Pemisah />
        <Tombol ikon={ListIcon} label="Daftar poin" aktif={s?.bullet} onClick={() => c().toggleBulletList().run()} />
        <Tombol ikon={ListOrderedIcon} label="Daftar bernomor" aktif={s?.ordered} onClick={() => c().toggleOrderedList().run()} />
        <Pemisah />
        <Tombol ikon={AlignLeftIcon} label="Rata kiri" aktif={s?.kiri} onClick={() => c().setTextAlign("left").run()} />
        <Tombol ikon={AlignCenterIcon} label="Rata tengah" aktif={s?.tengah} onClick={() => c().setTextAlign("center").run()} />
        <Tombol ikon={AlignRightIcon} label="Rata kanan" aktif={s?.kanan} onClick={() => c().setTextAlign("right").run()} />
        <Tombol ikon={AlignJustifyIcon} label="Rata kiri-kanan" aktif={s?.rata} onClick={() => c().setTextAlign("justify").run()} />
        <Pemisah />
        <Tombol ikon={TableIcon} label="Sisipkan tabel 3×3" onClick={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: false }).run()} />
        <Tombol ikon={Rows3Icon} label="Tambah baris" disabled={!s?.tabel} onClick={() => c().addRowAfter().run()} />
        <Tombol ikon={Columns3Icon} label="Tambah kolom" disabled={!s?.tabel} onClick={() => c().addColumnAfter().run()} />
        <Tombol ikon={Trash2Icon} label="Hapus baris" disabled={!s?.tabel} onClick={() => c().deleteRow().run()} />
        <Pemisah />
        <Tombol ikon={Undo2Icon} label="Urungkan" disabled={!s?.undo} onClick={() => c().undo().run()} />
        <Tombol ikon={Redo2Icon} label="Ulangi" disabled={!s?.redo} onClick={() => c().redo().run()} />
        {sisipan.length > 0 && (
          <select
            aria-label="Sisipkan data"
            className="ml-auto h-8 max-w-44 rounded-md border border-sky-200 bg-white px-2 text-sm text-slate-800"
            value=""
            onChange={(e) => {
              const x = sisipan[Number(e.target.value)];
              if (x && editor) editor.chain().focus().insertContent(x.konten).run();
            }}
          >
            <option value="">Sisipkan data…</option>
            {sisipan.map((x, i) => (
              <option key={x.label} value={i}>
                {x.label}
              </option>
            ))}
          </select>
        )}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
