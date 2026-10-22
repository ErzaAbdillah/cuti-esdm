"use client";

import { EyeIcon, ShieldIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { bukaDataSensitif } from "@/server/aksi/pegawai";

interface Props {
  pegawaiId: string;
  samaran: { nik: string | null; alamatDomisili: string | null; noHp: string | null };
  /** Dilihat oleh pegawai ybs (tidak dicatat sebagai akses orang lain). */
  milikSendiri: boolean;
}

/** NIK, alamat, HP disamarkan; tombol "Tampilkan" mengambil nilai asli lewat aksi yang diaudit. */
export function DataSensitif({ pegawaiId, samaran, milikSendiri }: Props) {
  const [asli, setAsli] = useState<{ nik: string | null; alamatDomisili: string | null; noHp: string | null } | null>(null);
  const [proses, mulai] = useTransition();
  const nilai = asli ?? samaran;

  const baris: [string, string | null][] = [
    ["NIK", nilai.nik],
    ["Alamat domisili", nilai.alamatDomisili],
    ["Nomor HP", nilai.noHp],
  ];

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-amber-950">
          <ShieldIcon className="size-4" aria-hidden /> Data pribadi (UU PDP)
        </p>
        {!asli && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="bg-white"
            disabled={proses}
            onClick={() => mulai(async () => setAsli(await bukaDataSensitif(pegawaiId)))}
          >
            <EyeIcon data-icon="inline-start" /> {proses ? "Memuat…" : "Tampilkan"}
          </Button>
        )}
      </div>
      <dl className="grid gap-2 text-sm">
        {baris.map(([k, v]) => (
          <div key={k} className="grid gap-1 sm:grid-cols-[10rem_1fr]">
            <dt className="text-slate-600">{k}</dt>
            <dd className="font-medium text-slate-900">{v ?? "-"}</dd>
          </div>
        ))}
      </dl>
      {!milikSendiri && <p className="mt-3 text-xs text-amber-900">Membuka data asli tercatat di audit log.</p>}
    </div>
  );
}
