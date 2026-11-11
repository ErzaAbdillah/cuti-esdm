import type { Metadata } from "next";
import Link from "next/link";
import { FormPenomoran } from "@/components/admin/form-penomoran";
import { NavSurat } from "@/components/admin/nav-surat";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatTanggalJam, hariIniWita } from "@/lib/tanggal";
import { wajibHakAkses } from "@/server/auth/pengguna";
import { db } from "@/server/db";
import { semuaPengaturan, teksPengaturan } from "@/server/pengaturan";
import type { SnapshotIdentitas } from "@/server/layanan/cuti";

export const metadata: Metadata = { title: "Penomoran Surat" };

export default async function Penomoran({ searchParams }: PageProps<"/admin/surat/penomoran">) {
  await wajibHakAkses("PENGATURAN_ADMIN");
  const sp = await searchParams;
  const tahunIni = hariIniWita().getUTCFullYear();
  const t = Number(sp.tahun);
  const tahun = t >= 2020 && t <= 2100 ? t : tahunIni;
  const [peng, klasifikasi, kode, surat] = await Promise.all([
    semuaPengaturan(),
    teksPengaturan("surat.klasifikasi"),
    teksPengaturan("surat.kode_instansi"),
    db.suratCuti.findMany({
      where: { tahun },
      include: { template: { select: { nama: true } }, pengajuan: { select: { id: true, snapshotIdentitas: true } } },
      orderBy: [{ nomorUrut: { sort: "desc", nulls: "last" } }, { dibuatPada: "desc" }],
    }),
  ]);
  const terpakai = surat.filter((s) => s.nomorUrut != null);
  const terakhir = terpakai[0]?.nomorUrut ?? 0;

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-judul">Surat cuti</h1>
        <p className="text-sm text-slate-700">
          Nomor surat: {klasifikasi || "[klasifikasi]"}/[urut]/{kode || "[kode]"}/[tahun]. Kode klasifikasi & instansi diubah di <Link href="/admin/pengaturan" className="text-primary underline">Pengaturan</Link>; format per dokumen di Template.
        </p>
      </div>
      <NavSurat aktif="/admin/surat/penomoran" />
      <Card>
        <CardHeader>
          <CardTitle className="text-judul">Cara pemberian nomor urut</CardTitle>
        </CardHeader>
        <CardContent>
          <FormPenomoran otomatis={peng.get("surat.nomor_otomatis") !== false} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-judul">
            Nomor terpakai {tahun} · terakhir {terakhir || "—"} · berikutnya {terakhir + 1}
          </CardTitle>
          <div className="flex gap-2">
            {[tahun - 1, tahun + 1].map((x) => (
              <Button key={x} asChild variant="outline" size="sm" className="bg-white/70">
                <Link href={`/admin/surat/penomoran?tahun=${x}`}>{x}</Link>
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {surat.length === 0 ? (
            <p className="text-sm text-slate-600">Belum ada surat cuti di {tahun}.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nomor</TableHead>
                    <TableHead>Dokumen</TableHead>
                    <TableHead>Pemohon</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dibuat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {surat.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.nomorLengkap ?? (s.nomorUrut ? `urut ${s.nomorUrut}` : "—")}</TableCell>
                      <TableCell>
                        <Link href={`/cuti/${s.pengajuan.id}/surat/${s.kodeDokumen}`} className="text-primary hover:underline">
                          {s.template.nama}
                        </Link>
                      </TableCell>
                      <TableCell>{(s.pengajuan.snapshotIdentitas as unknown as SnapshotIdentitas).nama}</TableCell>
                      <TableCell>{s.status === "TERKUNCI" ? `Terkunci v${s.versiTerakhir}` : `Draft v${s.versiTerakhir}`}</TableCell>
                      <TableCell>{formatTanggalJam(s.dibuatPada)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
