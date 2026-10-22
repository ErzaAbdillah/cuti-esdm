"use client";

import { SaveIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDeferredValue, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { EditorTeks, type Sisipan } from "@/components/surat/editor-teks";
import { LembarSurat } from "@/components/surat/lembar-surat";
import { PratinjauA4 } from "@/components/surat/pratinjau-a4";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { IDENTITAS_CONTOH, NILAI_CONTOH } from "@/lib/surat/contoh";
import type { DataLembar } from "@/lib/surat/lembar";
import type { TataLetakSurat } from "@/lib/surat/placeholder";
import { PLACEHOLDER_SURAT } from "@/lib/surat/placeholder";
import { escapeHtml, formatNomor, isiPlaceholder, isiTeks, rapikanTembusan, tampilkanIsi } from "@/lib/surat/render";
import { simpanTemplate } from "@/server/aksi/surat-admin";
import { Pilihan } from "../form/pilihan";

export interface DataFormTemplate {
  id: string;
  nama: string;
  hal: string;
  sifat: string;
  lampiran: string;
  tujuan: string[];
  tembusan: string[];
  disposisi: string[];
  dapatDicetakSejak: "DIVERIFIKASI" | "DISETUJUI";
  formatNomor: string;
  aktif: boolean;
  isiHtml: string;
}

interface Props {
  awal: DataFormTemplate;
  /** Kop, penandatangan saat ini, dll. untuk pratinjau. */
  dasar: Omit<DataLembar, "tataLetak" | "isiHtml" | "hal" | "tembusan" | "nomor" | "sifat" | "lampiran" | "tujuanHtml" | "disposisi">;
  nomor: { klasifikasi: string; kodeInstansi: string };
  tataLetak: TataLetakSurat;
}

const pecah = (s: string) =>
  s
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

function Area({ id, label, nilai, ubah, petunjuk, baris = 3 }: { id: string; label: string; nilai: string; ubah: (v: string) => void; petunjuk?: string; baris?: number }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} rows={baris} value={nilai} onChange={(e) => ubah(e.target.value)} aria-describedby={petunjuk ? `${id}-ket` : undefined} />
      {petunjuk && (
        <p id={`${id}-ket`} className="text-xs text-slate-600">
          {petunjuk}
        </p>
      )}
    </div>
  );
}

export function FormTemplate({ awal, dasar, nomor, tataLetak }: Props) {
  const notaDinas = tataLetak === "NOTA_DINAS";
  const router = useRouter();
  const [f, setF] = useState({ ...awal, tujuan: awal.tujuan.join("\n"), tembusan: awal.tembusan.join("\n"), disposisi: awal.disposisi.join("\n") });
  const [galat, setGalat] = useState<string | null>(null);
  const [menunggu, mulai] = useTransition();
  const ubah = <K extends keyof typeof f>(k: K) => (v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const sisipan = useMemo<Sisipan[]>(
    () => PLACEHOLDER_SURAT.map((p) => ({ label: `{{${p.kunci}}}`, konten: p.kunci === "blok_identitas" ? "<p>{{blok_identitas}}</p>" : `{{${p.kunci}}}` })),
    [],
  );

  const isiTunda = useDeferredValue(f.isiHtml);
  const lembar: DataLembar = {
    ...dasar,
    tataLetak,
    hal: isiTeks(f.hal, NILAI_CONTOH),
    sifat: f.sifat || null,
    lampiran: f.lampiran || null,
    tujuanHtml: pecah(f.tujuan).length ? `<p>${pecah(f.tujuan).map((t) => escapeHtml(isiTeks(t, NILAI_CONTOH))).join("<br>")}</p>` : "",
    tembusan: rapikanTembusan(pecah(f.tembusan), NILAI_CONTOH),
    disposisi: notaDinas ? pecah(f.disposisi) : [],
    nomor: formatNomor(f.formatNomor, { ...nomor, urut: 123, tahun: 2026 }),
    isiHtml: tampilkanIsi(isiPlaceholder(isiTunda, NILAI_CONTOH), IDENTITAS_CONTOH, NILAI_CONTOH),
  };

  function simpan() {
    setGalat(null);
    mulai(async () => {
      const h = await simpanTemplate({ ...f, tujuan: pecah(f.tujuan), tembusan: pecah(f.tembusan), disposisi: notaDinas ? pecah(f.disposisi) : [] });
      if (h.galat) {
        setGalat(h.galat);
        toast.error(h.galat);
      } else {
        toast.success(h.sukses);
        router.refresh();
      }
    });
  }

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="nama">Nama template</Label>
            <Input id="nama" value={f.nama} onChange={(e) => ubah("nama")(e.target.value)} />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="hal">Hal</Label>
            <Input id="hal" value={f.hal} onChange={(e) => ubah("hal")(e.target.value)} />
          </div>
          {tataLetak === "SURAT" && (
            <>
              <div className="grid gap-1.5">
                <Label htmlFor="sifat">Sifat</Label>
                <Input id="sifat" value={f.sifat} onChange={(e) => ubah("sifat")(e.target.value)} placeholder="kosong = tidak ditampilkan" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="lampiran">Lampiran</Label>
                <Input id="lampiran" value={f.lampiran} onChange={(e) => ubah("lampiran")(e.target.value)} placeholder="kosong = tidak ditampilkan" />
              </div>
            </>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="sejak">Bisa dicetak sejak</Label>
            <Pilihan id="sejak" value={f.dapatDicetakSejak} onChange={(e) => ubah("dapatDicetakSejak")(e.target.value as DataFormTemplate["dapatDicetakSejak"])}>
              <option value="DIVERIFIKASI">Diverifikasi Kepegawaian</option>
              <option value="DISETUJUI">Disetujui pejabat</option>
            </Pilihan>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="format">Format nomor</Label>
            <Input id="format" value={f.formatNomor} onChange={(e) => ubah("formatNomor")(e.target.value)} aria-describedby="format-ket" />
            <p id="format-ket" className="text-xs text-slate-600">
              {"{klasifikasi}"}, {"{urut}"}, {"{tahun}"}, {"{kode}"}
            </p>
          </div>
        </div>

        {tataLetak !== "SURAT_IZIN" && <Area id="tujuan" label="Tujuan (Kepada Yth.)" nilai={f.tujuan} ubah={ubah("tujuan")} petunjuk="Satu baris per baris cetak." />}

        <div className="grid gap-1.5">
          <span className="text-sm font-medium">Isi surat</span>
          <EditorTeks html={f.isiHtml} onChange={ubah("isiHtml")} sisipan={sisipan} label="Isi template surat" />
          <p className="text-xs text-slate-600">
            Placeholder seperti {"{{nama}}"} diisi dari data pengajuan. {"{{blok_identitas}}"} menjadi tabel Nama/NIP/Pangkat/Jabatan/Satuan Organisasi yang terkunci di editor surat.
          </p>
        </div>

        <Area id="tembusan" label="Tembusan" nilai={f.tembusan} ubah={ubah("tembusan")} baris={5} petunjuk="Satu per baris. Baris dengan placeholder kosong atau ganda dilewati otomatis." />
        {notaDinas && <Area id="disposisi" label="Kotak disposisi" nilai={f.disposisi} ubah={ubah("disposisi")} petunjuk="Satu kotak per baris, urut dari kiri." />}

        <div className="flex items-center gap-2">
          <Checkbox id="aktif" checked={f.aktif} onCheckedChange={(v) => ubah("aktif")(v === true)} />
          <Label htmlFor="aktif">Template aktif</Label>
        </div>

        {galat && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-merah">
            {galat}
          </p>
        )}
        <Button type="button" onClick={simpan} disabled={menunggu} className="justify-self-start">
          <SaveIcon data-icon="inline-start" /> Simpan template
        </Button>
        <p className="text-xs text-slate-600">Perubahan berlaku untuk surat yang disiapkan setelah ini; draft dan surat yang sudah dicetak tidak berubah.</p>
      </div>

      <div className="grid gap-2 xl:sticky xl:top-4">
        <h2 className="text-sm font-semibold text-judul">Pratinjau dengan data contoh</h2>
        <PratinjauA4 label="Pratinjau template">
          <LembarSurat d={lembar} />
        </PratinjauA4>
      </div>
    </div>
  );
}
