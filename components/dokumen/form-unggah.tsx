"use client";

import { UploadIcon } from "lucide-react";
import { useActionState, useId } from "react";
import { toast } from "sonner";
import { Bidang } from "@/components/form/bidang";
import { Pilihan } from "@/components/form/pilihan";
import { Button } from "@/components/ui/button";
import { ACCEPT_DOKUMEN, KATEGORI_PRIBADI, LABEL_KATEGORI } from "@/lib/dokumen";
import type { HasilForm } from "@/lib/validasi/auth";

interface Props {
  aksi: (s: HasilForm, fd: FormData) => Promise<HasilForm>;
  /** Tampilkan pilihan kategori (dokumen pribadi). */
  kategori?: boolean;
  maksMb: number;
}

/** Unggah satu berkas PDF/JPG/PNG/DOCX/XLSX; diperiksa ulang di server (ekstensi, MIME, isi, ukuran). */
export function FormUnggah({ aksi, kategori = false, maksMb }: Props) {
  const id = useId();
  const [hasil, kirim, proses] = useActionState<HasilForm, FormData>(async (s, fd) => {
    const h = await aksi(s, fd);
    if (h.galat) toast.error(h.galat);
    else if (h.sukses) toast.success(h.sukses);
    return h;
  }, {});
  const g = hasil.galatField ?? {};

  return (
    // key: kosongkan form setelah berhasil (React 19 mereset form saat action selesai).
    <form key={hasil.stempel ?? 0} action={kirim} className="grid items-start gap-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,12rem)_auto]">
      <div className="grid gap-1.5">
        <label htmlFor={`${id}-berkas`} className="text-sm font-medium text-judul">
          Berkas
        </label>
        <input
          id={`${id}-berkas`}
          name="berkas"
          type="file"
          accept={ACCEPT_DOKUMEN}
          required
          aria-invalid={g.berkas ? true : undefined}
          aria-describedby={`${id}-ket`}
          className="h-11 w-full min-w-0 rounded-lg border border-input bg-white px-2 py-2 text-sm text-slate-800 file:mr-3 file:rounded-md file:border-0 file:bg-sky-100 file:px-3 file:py-1 file:text-sm file:font-medium file:text-judul"
        />
        <p id={`${id}-ket`} className={g.berkas ? "text-xs font-medium text-merah" : "text-xs text-slate-600"}>
          {g.berkas ?? `PDF, JPG, PNG, DOCX, atau XLSX · maks. ${maksMb} MB`}
        </p>
      </div>
      <Bidang label="Nama dokumen (opsional)" name="nama" placeholder="mis. SK Kenaikan Pangkat 2024" galat={g.nama} maxLength={200} />
      {kategori ? (
        <label className="grid gap-1.5 text-sm font-medium text-judul">
          Kategori
          <Pilihan name="kategori" className="h-11" defaultValue="" required aria-invalid={g.kategori ? true : undefined}>
            <option value="" disabled>
              Pilih…
            </option>
            {KATEGORI_PRIBADI.map((k) => (
              <option key={k} value={k}>
                {LABEL_KATEGORI[k]}
              </option>
            ))}
          </Pilihan>
          {g.kategori && <span className="text-xs font-medium text-merah">{g.kategori}</span>}
        </label>
      ) : (
        <span className="hidden md:block" />
      )}
      <Button type="submit" disabled={proses} className="h-11 md:mt-6">
        <UploadIcon data-icon="inline-start" /> {proses ? "Mengunggah…" : "Unggah"}
      </Button>
    </form>
  );
}
