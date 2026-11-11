import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Pilihan } from "@/components/form/pilihan";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LABEL_STATUS_KEPEGAWAIAN } from "@/lib/domain/pegawai";
import { LABEL_LEVEL_SURAT } from "@/lib/label";
import { cn } from "@/lib/utils";
import { simpanAturanCuti, simpanJabatan, simpanJenisCuti, simpanMapping, simpanUnit } from "@/server/aksi/master";
import { wajibHakAkses } from "@/server/auth/pengguna";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Master Data" };

const TAB = [
  ["cuti", "Jenis & aturan cuti"],
  ["eselon", "Mapping eselon"],
  ["unit", "Unit kerja"],
  ["jabatan", "Jabatan"],
  ["pangkat", "Pangkat/golongan"],
] as const;
type Tab = (typeof TAB)[number][0];

const JENIS_UNIT = ["DINAS", "SEKRETARIAT", "BIDANG", "UPTD", "SUBBAG", "SEKSI"] as const;
const JENIS_JABATAN = ["STRUKTURAL", "FUNGSIONAL", "PELAKSANA", "NON_ASN"] as const;

const kecil = "h-9 bg-white text-sm";
function Centang({ name, label, cek }: { name: string; label: string; cek: boolean }) {
  return (
    <label className="flex items-center gap-1.5 text-sm">
      <input type="checkbox" name={name} defaultChecked={cek} className="size-4 accent-primary" /> {label}
    </label>
  );
}
function Baris({ action, children }: { action: (fd: FormData) => Promise<void>; children: ReactNode }) {
  return (
    <form action={action} className="flex flex-wrap items-center gap-2 border-b border-sky-50 py-2 last:border-0">
      {children}
      <Button type="submit" size="sm" variant="outline" className="ml-auto bg-white">
        Simpan
      </Button>
    </form>
  );
}

export default async function MasterData({ searchParams }: PageProps<"/admin/master">) {
  await wajibHakAkses("PENGATURAN_ADMIN");
  const sp = await searchParams;
  const tab: Tab = TAB.some(([k]) => k === sp.tab) ? (sp.tab as Tab) : "cuti";
  const pesan = typeof sp.pesan === "string" ? sp.pesan : null;
  const galat = typeof sp.galat === "string" ? sp.galat : null;

  let isi: ReactNode = null;
  if (tab === "cuti") {
    const jenis = await db.jenisCuti.findMany({ include: { aturan: { orderBy: { statusKepegawaian: "asc" } } }, orderBy: { kode: "asc" } });
    isi = jenis.map((j) => (
      <Card key={j.id}>
        <CardContent className="grid gap-1">
          <h2 className="font-semibold text-judul">
            {j.nama} <span className="text-xs font-normal text-slate-600">· {j.satuanHitung === "HARI_KERJA" ? "hari kerja" : "hari kalender"}{j.potongSaldoTahunan ? " · memotong saldo tahunan" : ""}</span>
          </h2>
          <Baris action={simpanJenisCuti.bind(null, j.id)}>
            <label className="flex items-center gap-1.5 text-sm">
              Maks. hari <Input name="maksHari" type="number" min={0} defaultValue={j.maksHari ?? ""} className={cn(kecil, "w-20")} />
            </label>
            <Centang name="wajibLampiran" label="Wajib lampiran" cek={j.wajibLampiran} />
            <Centang name="bolehTanggalLampau" label="Boleh tanggal lampau" cek={j.bolehTanggalLampau} />
            <Centang name="aktif" label="Aktif" cek={j.aktif} />
          </Baris>
          {j.aturan.map((a) => (
            <Baris key={a.id} action={simpanAturanCuti.bind(null, a.id)}>
              <span className="w-36 text-sm font-medium">{LABEL_STATUS_KEPEGAWAIAN[a.statusKepegawaian]}</span>
              <Centang name="berlaku" label="Berlaku" cek={a.berlaku} />
              <label className="flex items-center gap-1.5 text-sm">
                Hak/tahun <Input name="hakPerTahun" type="number" min={0} defaultValue={a.hakPerTahun ?? ""} className={cn(kecil, "w-20")} />
              </label>
              <label className="flex items-center gap-1.5 text-sm">
                Maks. hari <Input name="maksHari" type="number" min={0} defaultValue={a.maksHari ?? ""} className={cn(kecil, "w-20")} />
              </label>
              {a.catatan && <span className="text-xs text-slate-600">{a.catatan}</span>}
            </Baris>
          ))}
        </CardContent>
      </Card>
    ));
  } else if (tab === "eselon") {
    const mapping = await db.mappingEselon.findMany({ orderBy: { kelasMin: "desc" } });
    isi = (
      <Card>
        <CardContent>
          <p className="mb-2 text-sm text-slate-700">Hanya jabatan struktural; fungsional & pelaksana selalu Staf. Kelas di luar rentang mana pun = Staf.</p>
          {mapping.map((m) => (
            <Baris key={m.id} action={simpanMapping.bind(null, m.id)}>
              <label className="flex items-center gap-1.5 text-sm">
                Kelas <Input name="kelasMin" type="number" min={1} max={17} defaultValue={m.kelasMin} className={cn(kecil, "w-16")} aria-label="Kelas minimum" />–
                <Input name="kelasMax" type="number" min={1} max={17} defaultValue={m.kelasMax} className={cn(kecil, "w-16")} aria-label="Kelas maksimum" />
              </label>
              <Pilihan name="level" defaultValue={m.level} className="h-9 w-36" aria-label="Level surat">
                {(["ESELON_II", "ESELON_III", "ESELON_IV", "STAF"] as const).map((l) => (
                  <option key={l} value={l}>
                    {LABEL_LEVEL_SURAT[l]}
                  </option>
                ))}
              </Pilihan>
              {m.catatan && <span className="text-xs text-slate-600">{m.catatan}</span>}
            </Baris>
          ))}
        </CardContent>
      </Card>
    );
  } else if (tab === "unit") {
    const unit = await db.unitKerja.findMany({ orderBy: [{ urutan: "asc" }, { nama: "asc" }] });
    const opsiInduk = (id: string | null, nilai: string | null) => (
      <Pilihan name="parentId" defaultValue={nilai ?? ""} className="h-9 w-48" aria-label="Unit induk">
        <option value="">— tanpa induk —</option>
        {unit
          .filter((x) => x.id !== id)
          .map((x) => (
            <option key={x.id} value={x.id}>
              {x.singkatan || x.nama}
            </option>
          ))}
      </Pilihan>
    );
    const kolom = (x?: (typeof unit)[number]) => (
      <>
        <Input name="kode" defaultValue={x?.kode} placeholder="KODE" required className={cn(kecil, "w-40 font-mono")} aria-label="Kode" />
        <Input name="nama" defaultValue={x?.nama} placeholder="Nama unit" required className={cn(kecil, "min-w-56 flex-1")} aria-label="Nama" />
        <Input name="singkatan" defaultValue={x?.singkatan ?? ""} placeholder="Singkatan" className={cn(kecil, "w-28")} aria-label="Singkatan" />
        <Pilihan name="jenis" defaultValue={x?.jenis ?? "SEKSI"} className="h-9 w-36" aria-label="Jenis unit">
          {JENIS_UNIT.map((j) => (
            <option key={j}>{j}</option>
          ))}
        </Pilihan>
        {opsiInduk(x?.id ?? null, x?.parentId ?? null)}
      </>
    );
    isi = (
      <Card>
        <CardContent>
          <h2 className="font-semibold text-judul">Tambah unit</h2>
          <Baris action={simpanUnit.bind(null, null)}>{kolom()}</Baris>
          <h2 className="mt-4 font-semibold text-judul">{unit.length} unit</h2>
          {unit.map((x) => (
            <Baris key={x.id} action={simpanUnit.bind(null, x.id)}>
              {kolom(x)}
              <Centang name="aktif" label="Aktif" cek={x.aktif} />
            </Baris>
          ))}
        </CardContent>
      </Card>
    );
  } else if (tab === "jabatan") {
    const [jabatan, unit] = await Promise.all([db.jabatan.findMany({ orderBy: [{ kelasJabatan: { sort: "desc", nulls: "last" } }, { nama: "asc" }] }), db.unitKerja.findMany({ orderBy: { nama: "asc" } })]);
    const kolom = (x?: (typeof jabatan)[number]) => (
      <>
        <Input name="nama" defaultValue={x?.nama} placeholder="Nama jabatan" required className={cn(kecil, "min-w-56 flex-1")} aria-label="Nama jabatan" />
        <Input name="namaSingkat" defaultValue={x?.namaSingkat ?? ""} placeholder="Nama singkat" className={cn(kecil, "w-40")} aria-label="Nama singkat" />
        <Pilihan name="jenis" defaultValue={x?.jenis ?? "PELAKSANA"} className="h-9 w-36" aria-label="Jenis jabatan">
          {JENIS_JABATAN.map((j) => (
            <option key={j}>{j}</option>
          ))}
        </Pilihan>
        <Input name="kelasJabatan" type="number" min={1} max={17} defaultValue={x?.kelasJabatan ?? ""} placeholder="Kelas" className={cn(kecil, "w-20")} aria-label="Kelas jabatan" />
        <Pilihan name="memimpinUnitId" defaultValue={x?.memimpinUnitId ?? ""} className="h-9 w-48" aria-label="Memimpin unit">
          <option value="">— bukan kepala unit —</option>
          {unit.map((u) => (
            <option key={u.id} value={u.id}>
              Kepala {u.singkatan || u.nama}
            </option>
          ))}
        </Pilihan>
      </>
    );
    isi = (
      <Card>
        <CardContent>
          <h2 className="font-semibold text-judul">Tambah jabatan</h2>
          <Baris action={simpanJabatan.bind(null, null)}>{kolom()}</Baris>
          <h2 className="mt-4 font-semibold text-judul">{jabatan.length} jabatan</h2>
          {jabatan.map((x) => (
            <Baris key={x.id} action={simpanJabatan.bind(null, x.id)}>
              {kolom(x)}
              <Centang name="aktif" label="Aktif" cek={x.aktif} />
            </Baris>
          ))}
        </CardContent>
      </Card>
    );
  } else {
    const pangkat = await db.pangkatGolongan.findMany({ orderBy: [{ untuk: "asc" }, { urutan: "asc" }] });
    isi = (
      <Card>
        <CardContent>
          <p className="mb-2 text-sm text-slate-700">Sesuai peraturan kepegawaian; hanya-baca.</p>
          <ul className="grid gap-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {pangkat.map((p) => (
              <li key={p.id}>
                <span className="font-medium">{p.golongan}</span> {p.namaPangkat && `· ${p.namaPangkat}`} <span className="text-xs text-slate-600">({LABEL_STATUS_KEPEGAWAIAN[p.untuk]})</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-judul">Master data</h1>
        <p className="text-sm text-slate-700">Setiap perubahan tercatat di audit log.</p>
      </div>
      <nav aria-label="Master data" className="flex flex-wrap gap-1 rounded-xl border border-sky-100 bg-white/70 p-1">
        {TAB.map(([k, label]) => (
          <Link key={k} href={`/admin/master?tab=${k}`} aria-current={k === tab ? "page" : undefined} className={cn("rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-sky-50", k === tab && "bg-primary text-white hover:bg-primary")}>
            {label}
          </Link>
        ))}
      </nav>
      {pesan && (
        <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          {pesan}
        </p>
      )}
      {galat && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-merah">
          {galat}
        </p>
      )}
      {isi}
    </div>
  );
}
