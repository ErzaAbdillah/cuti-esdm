"use client";

import { CircleCheckIcon, SaveIcon, TriangleAlertIcon } from "lucide-react";
import { useActionState } from "react";
import { Bidang } from "@/components/form/bidang";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DefPengaturan } from "@/lib/pengaturan";
import type { HasilForm } from "@/lib/validasi/auth";
import { simpanPengaturan } from "@/server/aksi/admin";

const NAMA_HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

interface Props {
  kelompok: { judul: string; item: (DefPengaturan & { nilai: unknown })[] }[];
}

/** Isian terakhir (setelah galat) dalam bentuk nilai pengaturan. */
function nilaiDariIsian(d: DefPengaturan, teks: string): unknown {
  if (d.tipe === "daftar-hari") return teks.split(",").filter(Boolean).map(Number);
  if (d.tipe === "daftar-teks") return teks.split("\n").filter(Boolean);
  return teks;
}

export function FormPengaturan({ kelompok: kelompokAwal }: Props) {
  const [hasil, aksi, proses] = useActionState<HasilForm, FormData>(simpanPengaturan, {});
  const g = hasil.galatField ?? {};
  const isian = hasil.nilai;
  const kelompok = isian
    ? kelompokAwal.map((k) => ({ ...k, item: k.item.map((d) => (d.kunci in isian ? { ...d, nilai: nilaiDariIsian(d, isian[d.kunci] ?? "") } : d)) }))
    : kelompokAwal;

  return (
    <form action={aksi} className="grid gap-6" noValidate key={hasil.stempel ?? 0}>
      {hasil.galat && (
        <Alert variant="destructive" role="alert">
          <TriangleAlertIcon />
          <AlertDescription>{hasil.galat}</AlertDescription>
        </Alert>
      )}
      {hasil.sukses && (
        <Alert className="border-emerald-300 bg-emerald-50" role="status">
          <CircleCheckIcon className="text-emerald-700" />
          <AlertDescription className="text-emerald-900">{hasil.sukses}</AlertDescription>
        </Alert>
      )}

      {kelompok.map((k) => (
        <fieldset key={k.judul} className="kaca grid gap-4 rounded-xl p-5 md:grid-cols-2">
          <legend className="sr-only">{k.judul}</legend>
          <h2 className="text-lg font-semibold text-judul md:col-span-2">{k.judul}</h2>
          {k.item.map((d) => {
            const kosongWajib = d.wajib && (d.nilai == null || d.nilai === "");
            const petunjuk = `${kosongWajib ? "[ISI] Belum diisi. " : ""}${d.deskripsi}`;
            const tanda = <input type="hidden" name={`ada:${d.kunci}`} value="1" />;
            if (d.tipe === "daftar-hari") {
              const terpilih = new Set(Array.isArray(d.nilai) ? (d.nilai as number[]) : []);
              return (
                <fieldset key={d.kunci} className="grid gap-1.5">
                  {tanda}
                  <legend className="text-sm font-medium text-judul">{d.label}</legend>
                  <div className="flex flex-wrap gap-3">
                    {NAMA_HARI.map((h, i) => (
                      <label key={h} className="flex items-center gap-1.5 text-sm">
                        <input type="checkbox" name={d.kunci} value={i + 1} defaultChecked={terpilih.has(i + 1)} className="size-4 accent-primary" />
                        {h}
                      </label>
                    ))}
                  </div>
                  {g[d.kunci] && <p className="text-xs font-medium text-destructive">{g[d.kunci]}</p>}
                </fieldset>
              );
            }
            if (d.tipe === "daftar-teks") {
              const id = `p-${d.kunci}`;
              return (
                <div key={d.kunci} className="grid gap-1.5">
                  {tanda}
                  <Label htmlFor={id} className="text-judul">
                    {d.label}
                  </Label>
                  <Textarea id={id} name={d.kunci} rows={3} defaultValue={Array.isArray(d.nilai) ? (d.nilai as string[]).join("\n") : ""} className="bg-white" placeholder="Satu per baris, mis. 192.168.10.0/24" aria-invalid={g[d.kunci] ? true : undefined} />
                  <p className={g[d.kunci] ? "text-xs font-medium text-destructive" : "text-xs text-muted-foreground"}>{g[d.kunci] ?? d.deskripsi}</p>
                </div>
              );
            }
            return (
              <div key={d.kunci} className={kosongWajib ? "rounded-xl ring-2 ring-emas ring-offset-4 ring-offset-transparent" : undefined}>
                {tanda}
                <Bidang
                  label={d.label}
                  name={d.kunci}
                  type={d.tipe === "angka" ? "number" : d.tipe === "jam" ? "time" : "text"}
                  min={d.tipe === "angka" ? 0 : undefined}
                  defaultValue={d.nilai == null ? "" : String(d.nilai)}
                  galat={g[d.kunci]}
                  petunjuk={petunjuk}
                />
              </div>
            );
          })}
        </fieldset>
      ))}

      <Button type="submit" size="lg" disabled={proses} className="justify-self-start">
        <SaveIcon data-icon="inline-start" /> {proses ? "Menyimpan…" : "Simpan pengaturan"}
      </Button>
    </form>
  );
}
