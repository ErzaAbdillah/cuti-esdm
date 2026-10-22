import type { Metadata } from "next";
import { FormPenandatangan } from "@/components/admin/form-penandatangan";
import { NavSurat } from "@/components/admin/nav-surat";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNip } from "@/lib/domain/nip";
import { namaLengkap } from "@/lib/domain/pegawai";
import { LABEL_LEVEL_SURAT } from "@/lib/label";
import { formatTanggal, hariIniWita } from "@/lib/tanggal";
import { cn } from "@/lib/utils";
import { ubahAktifPenandatangan } from "@/server/aksi/surat-admin";
import { wajibPeran } from "@/server/auth/pengguna";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Penandatangan Surat" };

export default async function Penandatangan() {
  await wajibPeran("ADMIN");
  const hariIni = hariIniWita();
  const [daftar, pejabat] = await Promise.all([
    db.pejabatPenandatangan.findMany({ orderBy: [{ aktif: "desc" }, { berlakuMulai: "desc" }] }),
    // Calon penandatangan: pejabat struktural (Kepala Dinas, Sekretaris, Kepala Bidang).
    db.pegawai.findMany({
      where: { aktif: true, jabatan: { jenis: "STRUKTURAL", kelasJabatan: { gte: 11 } } },
      include: { jabatan: true },
      orderBy: [{ jabatan: { kelasJabatan: "desc" } }, { nama: "asc" }],
    }),
  ]);
  const berlaku = (p: (typeof daftar)[number]) => p.aktif && p.berlakuMulai <= hariIni && (!p.berlakuSampai || p.berlakuSampai >= hariIni);

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-judul">Surat cuti</h1>
        <p className="text-sm text-slate-700">
          Penandatangan dipilih menurut tanggal surat: entri yang paling khusus (level + dokumen) menang, lalu yang mulai berlaku paling akhir. Tambahkan Plt./Plh. dengan periode berlaku saat pejabat definitif berhalangan.
        </p>
      </div>
      <NavSurat aktif="/admin/surat/penandatangan" />
      <Card>
        <CardHeader>
          <CardTitle className="text-judul">Tambah penandatangan</CardTitle>
        </CardHeader>
        <CardContent>
          <FormPenandatangan
            pegawai={pejabat.map((p) => ({ id: p.id, label: `${namaLengkap(p)} — ${p.jabatan?.nama ?? ""}` }))}
            hariIni={hariIni.toISOString().slice(0, 10)}
          />
        </CardContent>
      </Card>
      <Card className="py-0">
        <ul className="divide-y divide-sky-100">
          {daftar.map((p) => (
            <li key={p.id} className={cn("flex flex-wrap items-center gap-3 px-4 py-3", !p.aktif && "opacity-60")}>
              <div className="grid min-w-0 flex-1 gap-0.5">
                <p className="font-medium text-slate-900">
                  {p.awalan && <span className="mr-1 rounded bg-amber-100 px-1.5 text-xs font-semibold text-amber-900">{p.awalan}</span>}
                  {p.nama}
                  {p.nip && <span className="text-sm font-normal text-slate-600"> · NIP {formatNip(p.nip)}</span>}
                </p>
                <p className="text-sm text-slate-700">{p.jabatanTeks}</p>
                <p className="text-xs text-slate-600">
                  {p.level ? LABEL_LEVEL_SURAT[p.level] : "Semua level"} · {p.kodeDokumen ?? "semua dokumen"} · {formatTanggal(p.berlakuMulai)} – {p.berlakuSampai ? formatTanggal(p.berlakuSampai) : "sekarang"}
                </p>
              </div>
              {berlaku(p) && <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-900">Berlaku hari ini</span>}
              <form action={ubahAktifPenandatangan.bind(null, p.id, !p.aktif)}>
                <Button type="submit" variant="outline" size="sm" className="bg-white/70">
                  {p.aktif ? "Nonaktifkan" : "Aktifkan"}
                </Button>
              </form>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
