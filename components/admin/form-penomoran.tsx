"use client";

import { SaveIcon } from "lucide-react";
import { useActionState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { HasilForm } from "@/lib/validasi/auth";
import { aturPenomoran } from "@/server/aksi/surat-admin";

export function FormPenomoran({ otomatis }: { otomatis: boolean }) {
  const [, aksi, proses] = useActionState<HasilForm, FormData>(async (s, fd) => {
    const h = await aturPenomoran(s, fd);
    if (h.galat) toast.error(h.galat);
    else if (h.sukses) toast.success(h.sukses);
    return h;
  }, {});

  return (
    <form action={aksi} className="grid gap-3">
      <fieldset className="grid gap-2">
        <legend className="sr-only">Cara pemberian nomor urut</legend>
        <label className="flex items-start gap-2 text-sm">
          <input type="radio" name="otomatis" value="ya" defaultChecked={otomatis} className="mt-1 size-4 accent-primary" />
          <span>
            <b>Otomatis saat dicetak</b> — nomor terakhir tahun itu + 1. Kepegawaian tetap bisa mengisi nomor dari buku agenda sebelum mencetak.
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="radio" name="otomatis" value="tidak" defaultChecked={!otomatis} className="mt-1 size-4 accent-primary" />
          <span>
            <b>Kosong, diisi tangan</b> — nomor urut dicetak sebagai ruang kosong kecuali diisi Kepegawaian.
          </span>
        </label>
      </fieldset>
      <Button type="submit" disabled={proses} className="justify-self-start">
        <SaveIcon data-icon="inline-start" /> Simpan
      </Button>
    </form>
  );
}
