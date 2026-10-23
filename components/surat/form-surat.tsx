"use client";

import { DownloadIcon, LockIcon, PencilIcon, PrinterIcon, RotateCcwIcon, SaveIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDeferredValue, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type KandidatPejabat, pilihPejabat } from "@/lib/domain/pejabat";
import type { DataLembar, Penandatangan } from "@/lib/surat/lembar";
import { formatNomor, formatTanggalSurat, type IdentitasSurat, KUNCI_TERKUNCI, type KunciTerkunci, tampilkanIsi } from "@/lib/surat/render";
import { type NiatSurat, simpanSurat } from "@/server/aksi/surat";
import { BlokIdentitas, Isian } from "./ekstensi-surat";
import { EditorTeks, type Sisipan } from "./editor-teks";
import { LembarSurat } from "./lembar-surat";
import { PratinjauA4 } from "./pratinjau-a4";

interface Konten {
  isiHtml: string;
  isian: { hal: string; tembusan: string[]; tanggal: string; hariKosong?: boolean };
}

export interface PropsFormSurat {
  pengajuanId: string;
  kode: string;
  awal: Konten;
  dariTemplate: Konten;
  /** Bagian lembar yang tidak diedit di sini (kop, tujuan, penandatangan, …). */
  dasar: Omit<DataLembar, "isiHtml" | "hal" | "tembusan" | "tanggal" | "nomor" | "penandatangan">;
  /** Calon penandatangan; yang tampil dipilih menurut tanggal surat. */
  kandidat: (KandidatPejabat & Penandatangan)[];
  level: Parameters<typeof pilihPejabat>[1];
  nomor: { format: string; klasifikasi: string; kodeInstansi: string; urut: number | null; boleh: boolean; otomatis: boolean; saran: number };
  identitas: IdentitasSurat;
  nilai: Record<string, string>;
  /** Versi terakhir sudah dicetak: simpan berikutnya menjadi versi baru. */
  terkunci: boolean;
  versi: number | null;
}

const LABEL_ISIAN: Record<KunciTerkunci, string> = {
  nama: "Nama",
  nip: "NIP",
  pangkat_golongan: "Pangkat / golongan",
  jabatan: "Jabatan",
  satuan_organisasi: "Satuan organisasi",
  jumlah_hari: "Jumlah hari",
  jumlah_hari_terbilang: "Jumlah hari (terbilang)",
  tanggal_mulai: "Tanggal mulai cuti",
  tanggal_selesai: "Tanggal selesai cuti",
};

export function FormSurat(p: PropsFormSurat) {
  const router = useRouter();
  const [isiHtml, setIsiHtml] = useState(p.awal.isiHtml);
  const [hal, setHal] = useState(p.awal.isian.hal);
  const [tembusan, setTembusan] = useState(p.awal.isian.tembusan.join("\n"));
  const [tanggal, setTanggal] = useState(p.awal.isian.tanggal);
  const [hariKosong, setHariKosong] = useState(p.awal.isian.hariKosong ?? true);
  const [nomorTeks, setNomorTeks] = useState(p.nomor.urut?.toString() ?? "");
  const [muatUlang, setMuatUlang] = useState(0);
  const [galat, setGalat] = useState<string | null>(null);
  const [menunggu, mulai] = useTransition();

  const ekstensi = useMemo(() => [BlokIdentitas.configure({ identitas: p.identitas }), Isian.configure({ nilai: p.nilai })], [p.identitas, p.nilai]);
  const sisipan = useMemo<Sisipan[]>(
    () => KUNCI_TERKUNCI.map((k) => ({ label: LABEL_ISIAN[k], konten: { type: "isian", attrs: { kunci: k } } })),
    [],
  );

  const isiTunda = useDeferredValue(isiHtml);
  const daftarTembusan = tembusan
    .split("\n")
    .map((t) => t.trim())
    .filter(Boolean);
  const urut = nomorTeks.trim() ? Number(nomorTeks) : null;
  const tahun = Number(tanggal.slice(0, 4)) || new Date().getFullYear();
  const tanggalSah = /^\d{4}-\d{2}-\d{2}$/.test(tanggal) ? new Date(`${tanggal}T00:00:00Z`) : null;
  const ttd = tanggalSah ? pilihPejabat(p.kandidat, p.level, p.kode, tanggalSah) : null;
  const lembar: DataLembar = {
    ...p.dasar,
    hal,
    tembusan: daftarTembusan,
    tanggal: formatTanggalSurat(tanggal, hariKosong),
    penandatangan: ttd && { awalan: ttd.awalan, jabatanTeks: ttd.jabatanTeks, nama: ttd.nama, pangkat: ttd.pangkat, nip: ttd.nip },
    nomor: formatNomor(p.nomor.format, { klasifikasi: p.nomor.klasifikasi, kodeInstansi: p.nomor.kodeInstansi, tahun, urut: Number.isInteger(urut) ? urut : null }),
    isiHtml: tampilkanIsi(isiTunda, p.identitas, p.nilai),
  };

  function kirim(niat: NiatSurat) {
    setGalat(null);
    // Jendela cetak dibuka saat klik agar tidak diblokir browser; alamatnya diisi setelah dikunci.
    const jendela = niat === "cetak" ? window.open("about:blank", "_blank") : null;
    mulai(async () => {
      const nomorBerubah = p.nomor.boleh && nomorTeks.trim() !== (p.nomor.urut?.toString() ?? "");
      if (nomorBerubah && urut !== null && (!Number.isInteger(urut) || urut < 1)) {
        jendela?.close();
        setGalat("Nomor urut harus bilangan bulat positif.");
        return;
      }
      const h = await simpanSurat({
        pengajuanId: p.pengajuanId,
        kode: p.kode,
        niat,
        isiHtml,
        hal,
        tembusan: daftarTembusan,
        tanggal,
        hariKosong,
        nomorUrut: nomorBerubah ? urut : undefined,
      });
      if (h.galat) {
        jendela?.close();
        setGalat(h.galat);
        toast.error(h.galat);
        return;
      }
      if (h.arahkan && niat === "cetak") {
        if (jendela) jendela.location.href = h.arahkan;
        else window.location.assign(h.arahkan);
      }
      if (h.arahkan && niat === "pdf") await unduhPdf(h.arahkan);
      if (h.sukses) toast.success(h.sukses);
      router.refresh();
    });
  }

  async function unduhPdf(url: string) {
    const r = await fetch(url);
    if (!r.ok) {
      const pesan = await r.text();
      setGalat(pesan);
      toast.error(pesan);
      return;
    }
    const nama = /filename="([^"]+)"/.exec(r.headers.get("Content-Disposition") ?? "")?.[1] ?? "surat.pdf";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(await r.blob());
    a.download = nama;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  }

  /** Kepegawaian/Admin: ubah data terkunci menjadi teks biasa agar salah tulis (nama, NIP, dll.) bisa diperbaiki. */
  function editBebas() {
    if (!window.confirm("Buka kunci data pemohon? Identitas, NIP, jumlah hari, dan tanggal cuti menjadi teks biasa yang bisa diedit di surat ini (data pegawai tidak berubah).")) return;
    setIsiHtml(tampilkanIsi(isiHtml, p.identitas, p.nilai));
    setMuatUlang((n) => n + 1);
  }
  const adaKunci = /data-blok="identitas"|data-isian=/.test(isiHtml);

  function kembalikan() {
    if (!window.confirm("Ganti isi, hal, dan tembusan dengan template? Perubahan yang belum disimpan akan hilang.")) return;
    setIsiHtml(p.dariTemplate.isiHtml);
    setHal(p.dariTemplate.isian.hal);
    setTembusan(p.dariTemplate.isian.tembusan.join("\n"));
    setMuatUlang((n) => n + 1);
  }

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="grid gap-4">
        {p.terkunci && (
          <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
            <LockIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
            Versi {p.versi} sudah dicetak dan terkunci. Perubahan yang disimpan menjadi versi baru; cetak ulang tanpa perubahan memakai versi {p.versi}.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="hal">Hal</Label>
            <Input id="hal" value={hal} onChange={(e) => setHal(e.target.value)} maxLength={300} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="tanggal">Tanggal surat</Label>
            <Input id="tanggal" type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input type="checkbox" checked={hariKosong} onChange={(e) => setHariKosong(e.target.checked)} className="size-4 accent-primary" />
              Kosongkan tanggal (hari) untuk diisi tangan saat ditandatangani
            </label>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="nomor">Nomor urut</Label>
            <Input
              id="nomor"
              inputMode="numeric"
              value={nomorTeks}
              onChange={(e) => setNomorTeks(e.target.value.replace(/\D/g, "").slice(0, 5))}
              disabled={!p.nomor.boleh}
              placeholder={p.nomor.otomatis ? `otomatis saat dicetak (${p.nomor.saran})` : "kosong — diisi tangan"}
              aria-describedby="nomor-info"
            />
            <p id="nomor-info" className="text-xs text-slate-600">
              {p.nomor.boleh ? "Kosongkan untuk nomor otomatis/diisi tangan." : "Nomor diatur Kepegawaian."}
            </p>
          </div>
        </div>

        <div className="grid gap-1.5">
          <span className="text-sm font-medium" id="label-isi">
            Isi surat
          </span>
          <EditorTeks html={isiHtml} onChange={setIsiHtml} ekstensi={ekstensi} sisipan={sisipan} muatUlang={muatUlang} label="Isi surat" />
          <p className="text-xs text-slate-600">Bagian berlatar biru (identitas, NIP, tanggal cuti) diambil dari data pengajuan dan terkunci. Kepegawaian/Admin dapat memperbaiki salah tulis lewat “Edit bebas”.</p>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="tembusan">Tembusan (satu per baris)</Label>
          <Textarea id="tembusan" rows={4} value={tembusan} onChange={(e) => setTembusan(e.target.value)} />
        </div>

        {galat && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-merah">
            {galat}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => kirim("simpan")} disabled={menunggu}>
            <SaveIcon data-icon="inline-start" /> Simpan draft
          </Button>
          <Button type="button" onClick={() => kirim("cetak")} disabled={menunggu}>
            <PrinterIcon data-icon="inline-start" /> Cetak
          </Button>
          <Button type="button" variant="outline" onClick={() => kirim("pdf")} disabled={menunggu}>
            <DownloadIcon data-icon="inline-start" /> Unduh PDF
          </Button>
          {p.nomor.boleh && adaKunci && (
            <Button type="button" variant="ghost" onClick={editBebas} disabled={menunggu}>
              <PencilIcon data-icon="inline-start" /> Edit bebas (buka kunci data)
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={kembalikan} disabled={menunggu}>
            <RotateCcwIcon data-icon="inline-start" /> Kembalikan ke template
          </Button>
        </div>
        <p className="text-xs text-slate-600">Cetak atau unduh PDF mengunci versi ini beserta nomornya; penanda tangan mengikuti tanggal surat.</p>
      </div>

      <div className="grid gap-2 xl:sticky xl:top-4">
        <h2 className="text-sm font-semibold text-judul">Pratinjau A4</h2>
        <PratinjauA4 label="Pratinjau surat">
          <LembarSurat d={lembar} />
        </PratinjauA4>
      </div>
    </div>
  );
}
