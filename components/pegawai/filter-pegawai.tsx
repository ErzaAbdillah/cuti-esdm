"use client";

import { SearchIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { Pilihan } from "@/components/form/pilihan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LABEL_LEVEL_SURAT } from "@/lib/label";
import { LABEL_STATUS_KEPEGAWAIAN } from "@/lib/domain/pegawai";
import type { FilterPegawai, OpsiPegawai } from "@/server/kueri/pegawai";

/** Form GET: filter tersimpan di URL; dropdown langsung menerapkan saat diganti. */
export function FilterPegawaiForm({ f, opsi }: { f: FilterPegawai; opsi: OpsiPegawai }) {
  const kirim = (e: React.ChangeEvent<HTMLSelectElement>) => e.currentTarget.form?.requestSubmit();
  const label = "grid gap-1 text-xs font-medium text-slate-600";

  return (
    <form method="get" className="grid gap-3 md:grid-cols-2 xl:grid-cols-6" role="search">
      <label className={`${label} md:col-span-2`}>
        Cari nama atau NIP
        <span className="relative">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" aria-hidden />
          <Input name="q" defaultValue={f.q} placeholder="mis. Rahman atau 19800326" className="h-10 bg-white pl-8" />
        </span>
      </label>
      <label className={label}>
        Unit kerja
        <Pilihan name="unit" defaultValue={f.unit ?? ""} onChange={kirim}>
          <option value="">Semua unit</option>
          {opsi.unit.map((u) => (
            <option key={u.id} value={u.id}>
              {u.label}
            </option>
          ))}
        </Pilihan>
      </label>
      <label className={label}>
        Jabatan
        <Pilihan name="jabatan" defaultValue={f.jabatan ?? ""} onChange={kirim}>
          <option value="">Semua jabatan</option>
          {opsi.jabatan.map((j) => (
            <option key={j.id} value={j.id}>
              {j.label}
            </option>
          ))}
        </Pilihan>
      </label>
      <label className={label}>
        Eselon
        <Pilihan name="level" defaultValue={f.level ?? ""} onChange={kirim}>
          <option value="">Semua</option>
          {Object.entries(LABEL_LEVEL_SURAT).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Pilihan>
      </label>
      <label className={label}>
        Pangkat/golongan
        <Pilihan name="pangkat" defaultValue={f.pangkat ?? ""} onChange={kirim}>
          <option value="">Semua</option>
          {opsi.pangkat.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </Pilihan>
      </label>
      <label className={label}>
        Status kepegawaian
        <Pilihan name="status" defaultValue={f.status ?? ""} onChange={kirim}>
          <option value="">Semua</option>
          {Object.entries(LABEL_STATUS_KEPEGAWAIAN).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Pilihan>
      </label>
      <label className={label}>
        Keaktifan
        <Pilihan name="aktif" defaultValue={f.aktif} onChange={kirim}>
          <option value="ya">Aktif</option>
          <option value="tidak">Nonaktif</option>
          <option value="semua">Semua</option>
        </Pilihan>
      </label>
      <input type="hidden" name="urut" value={f.urut} />
      <input type="hidden" name="arah" value={f.arah} />
      <div className="flex items-end gap-2 md:col-span-2 xl:col-span-4 xl:justify-end">
        <Button type="submit" className="h-10">
          <SearchIcon data-icon="inline-start" /> Terapkan
        </Button>
        <Button asChild variant="ghost" className="h-10">
          <Link href="/pegawai">
            <XIcon data-icon="inline-start" /> Reset
          </Link>
        </Button>
      </div>
    </form>
  );
}
