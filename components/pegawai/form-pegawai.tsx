"use client";

import { SaveIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Bidang } from "@/components/form/bidang";
import { Pilihan } from "@/components/form/pilihan";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LABEL_STATUS_KEPEGAWAIAN } from "@/lib/domain/pegawai";
import { LABEL_LEVEL_SURAT } from "@/lib/label";
import type { HasilForm } from "@/lib/validasi/auth";
import { simpanPegawai } from "@/server/aksi/pegawai";
import type { OpsiPegawai } from "@/server/kueri/pegawai";

export interface NilaiFormPegawai {
  statusKepegawaian: string;
  nip: string;
  idNonAsn: string;
  gelarDepan: string;
  nama: string;
  gelarBelakang: string;
  nik: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: string;
  pendidikanTerakhir: string;
  alamatDomisili: string;
  noHp: string;
  email: string;
  pangkatGolonganId: string;
  tmtPangkat: string;
  jabatanId: string;
  tmtJabatan: string;
  unitKerjaId: string;
  atasanLangsungId: string;
  levelSuratOverride: string;
  tanggalMasuk: string;
  aktif: boolean;
}

interface Props {
  pegawaiId: string | null;
  awal: NilaiFormPegawai;
  opsi: OpsiPegawai;
  calonAtasan: { id: string; label: string }[];
}

function PilihanBerlabel({ label, name, galat, petunjuk, children, ...props }: React.ComponentProps<typeof Pilihan> & { label: string; name: string; galat?: string; petunjuk?: string }) {
  const id = `f-${name}`;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-judul">
        {label}
      </Label>
      <Pilihan id={id} name={name} aria-invalid={galat ? true : undefined} aria-describedby={galat || petunjuk ? `${id}-ket` : undefined} className="h-11" {...props}>
        {children}
      </Pilihan>
      {(galat || petunjuk) && (
        <p id={`${id}-ket`} className={galat ? "text-xs font-medium text-destructive" : "text-xs text-muted-foreground"}>
          {galat ?? petunjuk}
        </p>
      )}
    </div>
  );
}

export function FormPegawai({ pegawaiId, awal: awalProp, opsi, calonAtasan }: Props) {
  const [hasil, aksi, proses] = useActionState<HasilForm, FormData>(simpanPegawai.bind(null, pegawaiId), {});
  // Setelah galat, isi ulang form dengan isian terakhir pengguna.
  const awal: NilaiFormPegawai = hasil.nilai ? { ...awalProp, ...hasil.nilai, aktif: hasil.nilai.aktif === "1" } : awalProp;
  const [status, setStatus] = useState(awal.statusKepegawaian);
  const g = hasil.galatField ?? {};
  const nonAsn = status === "NON_ASN";
  const pangkatSesuai = opsi.pangkat.filter((p) => (status === "PNS" ? p.untuk === "PNS" : p.untuk === "PPPK"));

  return (
    <form action={aksi} className="grid gap-6" noValidate key={hasil.stempel ?? 0}>
      {hasil.galat && (
        <Alert variant="destructive" role="alert">
          <TriangleAlertIcon />
          <AlertDescription>{hasil.galat}</AlertDescription>
        </Alert>
      )}

      <fieldset className="grid gap-4 md:grid-cols-2">
        <legend className="mb-2 text-lg font-semibold text-judul">Identitas</legend>
        <PilihanBerlabel label="Status kepegawaian" name="statusKepegawaian" defaultValue={awal.statusKepegawaian} onChange={(e) => setStatus(e.target.value)} galat={g.statusKepegawaian}>
          {Object.entries(LABEL_STATUS_KEPEGAWAIAN).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </PilihanBerlabel>
        {nonAsn ? (
          <Bidang label="ID Non-ASN" name="idNonAsn" defaultValue={awal.idNonAsn} galat={g.idNonAsn} petunjuk="Identitas yang disepakati, mis. PJLP-005. Dipakai untuk login." />
        ) : (
          <Bidang label="NIP" name="nip" defaultValue={awal.nip} galat={g.nip} inputMode="numeric" petunjuk="18 digit; PNS: …YYYYMM…, PPPK: …YYYY21…" />
        )}
        <Bidang label="Gelar depan" name="gelarDepan" defaultValue={awal.gelarDepan} galat={g.gelarDepan} placeholder="mis. H., Ir." />
        <Bidang label="Nama (tanpa gelar)" name="nama" defaultValue={awal.nama} galat={g.nama} required />
        <Bidang label="Gelar belakang" name="gelarBelakang" defaultValue={awal.gelarBelakang} galat={g.gelarBelakang} placeholder="mis. S.T., M.M." />
        <Bidang label="NIK" name="nik" defaultValue={awal.nik} galat={g.nik} inputMode="numeric" autoComplete="off" />
        <Bidang label="Tempat lahir" name="tempatLahir" defaultValue={awal.tempatLahir} galat={g.tempatLahir} />
        <Bidang label="Tanggal lahir" name="tanggalLahir" type="date" defaultValue={awal.tanggalLahir} galat={g.tanggalLahir} />
        <PilihanBerlabel label="Jenis kelamin" name="jenisKelamin" defaultValue={awal.jenisKelamin} galat={g.jenisKelamin}>
          <option value="">-</option>
          <option value="L">Laki-laki</option>
          <option value="P">Perempuan</option>
        </PilihanBerlabel>
        <Bidang label="Pendidikan terakhir" name="pendidikanTerakhir" defaultValue={awal.pendidikanTerakhir} galat={g.pendidikanTerakhir} placeholder="mis. S1 Teknik Pertambangan" />
        <Bidang label="Alamat domisili" name="alamatDomisili" defaultValue={awal.alamatDomisili} galat={g.alamatDomisili} className="md:col-span-2" autoComplete="off" />
        <Bidang label="Nomor HP" name="noHp" defaultValue={awal.noHp} galat={g.noHp} inputMode="tel" autoComplete="off" />
        <Bidang label="Email" name="email" type="email" defaultValue={awal.email} galat={g.email} />
      </fieldset>

      <fieldset className="grid gap-4 md:grid-cols-2">
        <legend className="mb-2 text-lg font-semibold text-judul">Kepegawaian</legend>
        <PilihanBerlabel label="Unit kerja" name="unitKerjaId" defaultValue={awal.unitKerjaId} galat={g.unitKerjaId}>
          <option value="">Pilih unit kerja</option>
          {opsi.unit.map((u) => (
            <option key={u.id} value={u.id}>
              {u.label}
            </option>
          ))}
        </PilihanBerlabel>
        <PilihanBerlabel label="Jabatan" name="jabatanId" defaultValue={awal.jabatanId} galat={g.jabatanId}>
          <option value="">-</option>
          {opsi.jabatan.map((j) => (
            <option key={j.id} value={j.id}>
              {j.label}
              {j.kelas != null ? ` (kelas ${j.kelas})` : ""}
            </option>
          ))}
        </PilihanBerlabel>
        <Bidang label="TMT jabatan" name="tmtJabatan" type="date" defaultValue={awal.tmtJabatan} galat={g.tmtJabatan} />
        <PilihanBerlabel label="Pangkat / golongan" name="pangkatGolonganId" defaultValue={awal.pangkatGolonganId} galat={g.pangkatGolonganId} disabled={nonAsn}
          petunjuk={status === "PPPK_PARUH_WAKTU" ? "Boleh dikosongkan (ditulis “-” di daftar hadir)." : undefined}>
          <option value="">-</option>
          {pangkatSesuai.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </PilihanBerlabel>
        <Bidang label="TMT pangkat" name="tmtPangkat" type="date" defaultValue={awal.tmtPangkat} galat={g.tmtPangkat} disabled={nonAsn} />
        <PilihanBerlabel label="Atasan langsung" name="atasanLangsungId" defaultValue={awal.atasanLangsungId} galat={g.atasanLangsungId}
          petunjuk="Kosongkan agar diisi otomatis dari struktur organisasi.">
          <option value="">Otomatis dari struktur</option>
          {calonAtasan.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </PilihanBerlabel>
        <PilihanBerlabel label="Eselon (level surat)" name="levelSuratOverride" defaultValue={awal.levelSuratOverride} galat={g.levelSuratOverride}
          petunjuk="Biarkan otomatis kecuali ada ketentuan khusus.">
          <option value="">Otomatis dari jabatan & kelas</option>
          {Object.entries(LABEL_LEVEL_SURAT).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </PilihanBerlabel>
        <Bidang label="Tanggal masuk" name="tanggalMasuk" type="date" defaultValue={awal.tanggalMasuk} galat={g.tanggalMasuk} />
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-judul">
          <input type="checkbox" name="aktif" defaultChecked={awal.aktif} className="size-4 accent-primary" />
          Pegawai aktif
        </label>
      </fieldset>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg" disabled={proses}>
          <SaveIcon data-icon="inline-start" /> {proses ? "Menyimpan…" : "Simpan"}
        </Button>
        <Button asChild variant="ghost" size="lg">
          <Link href={pegawaiId ? `/pegawai/${pegawaiId}` : "/pegawai"}>Batal</Link>
        </Button>
      </div>
    </form>
  );
}
