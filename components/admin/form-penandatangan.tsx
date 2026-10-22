"use client";

import { PlusIcon } from "lucide-react";
import { useActionState } from "react";
import { toast } from "sonner";
import { Bidang } from "@/components/form/bidang";
import { Pilihan } from "@/components/form/pilihan";
import { Button } from "@/components/ui/button";
import type { HasilForm } from "@/lib/validasi/auth";
import { tambahPenandatangan } from "@/server/aksi/surat-admin";

function Pilih({ label, name, children, petunjuk }: { label: string; name: string; children: React.ReactNode; petunjuk?: string }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-judul">
      {label}
      <Pilihan name={name} className="h-11">
        {children}
      </Pilihan>
      {petunjuk && <span className="text-xs font-normal text-slate-600">{petunjuk}</span>}
    </label>
  );
}

/** Tambah pejabat penandatangan, termasuk Plt./Plh. untuk periode tertentu. */
export function FormPenandatangan({ pegawai, hariIni }: { pegawai: { id: string; label: string }[]; hariIni: string }) {
  const [, aksi, proses] = useActionState<HasilForm, FormData>(async (s, fd) => {
    const h = await tambahPenandatangan(s, fd);
    if (h.galat) toast.error(h.galat);
    else if (h.sukses) toast.success(h.sukses);
    return h;
  }, {});

  return (
    <form action={aksi} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <Pilih label="Awalan" name="awalan" petunjuk="Plt./Plh. saat pejabat definitif berhalangan.">
        <option value="">— definitif —</option>
        <option value="Plt.">Plt.</option>
        <option value="Plh.">Plh.</option>
        <option value="a.n.">a.n.</option>
      </Pilih>
      <Bidang label="Jabatan (sebagaimana tercetak)" name="jabatanTeks" defaultValue="Kepala Dinas Energi dan Sumber Daya Mineral Provinsi Kalimantan Selatan" required className="md:col-span-1 xl:col-span-2" />
      <Pilih label="Pegawai" name="pegawaiId" petunjuk="Nama, pangkat, dan NIP diambil dari data pegawai.">
        <option value="">— isi manual di bawah —</option>
        {pegawai.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </Pilih>
      <Bidang label="Nama (jika manual)" name="nama" />
      <Bidang label="Pangkat (jika manual)" name="pangkat" placeholder="mis. Pembina Utama Muda" />
      <Bidang label="NIP (jika manual)" name="nip" inputMode="numeric" />
      <Bidang label="Berlaku mulai" name="berlakuMulai" type="date" defaultValue={hariIni} required />
      <Bidang label="Berlaku sampai" name="berlakuSampai" type="date" petunjuk="Kosong = sampai diganti." />
      <Pilih label="Khusus level" name="level">
        <option value="">Semua level</option>
        <option value="ESELON_II">Eselon II</option>
        <option value="ESELON_III">Eselon III</option>
        <option value="ESELON_IV">Eselon IV</option>
        <option value="STAF">Staf</option>
      </Pilih>
      <Pilih label="Khusus dokumen" name="kodeDokumen">
        <option value="">Semua dokumen</option>
        <option value="NOTA_DINAS_GUBERNUR">Nota Dinas Gubernur</option>
        <option value="NOTA_DINAS_SEKDA">Nota Dinas Sekda</option>
        <option value="PERMOHONAN_BKD">Permohonan BKD</option>
        <option value="SURAT_IZIN">Surat Izin Cuti</option>
      </Pilih>
      <div className="flex items-end">
        <Button type="submit" disabled={proses} className="h-11">
          <PlusIcon data-icon="inline-start" /> Tambah penandatangan
        </Button>
      </div>
    </form>
  );
}
