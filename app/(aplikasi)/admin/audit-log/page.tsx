import type { Metadata } from "next";
import Link from "next/link";
import { Pilihan } from "@/components/form/pilihan";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { namaLengkap } from "@/lib/domain/pegawai";
import type { Prisma } from "@/lib/generated/prisma/client";
import { formatTanggalJam } from "@/lib/tanggal";
import { wajibHakAkses } from "@/server/auth/pengguna";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Audit Log" };

const PER_HALAMAN = 50;
const teks = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, 100) : "");

/** Jejak perubahan data, akses data sensitif, cetak, dan unduh (UU PDP). Halaman berikutnya memakai kursor id. */
export default async function AuditLog({ searchParams }: PageProps<"/admin/audit-log">) {
  await wajibHakAkses("PENGATURAN_ADMIN");
  const sp = await searchParams;
  const f = { aksi: teks(sp.aksi), entitas: teks(sp.entitas), pengguna: teks(sp.pengguna), dari: teks(sp.dari), sampai: teks(sp.sampai), sebelum: teks(sp.sebelum) };

  const penggunaId = f.pengguna
    ? (await db.user.findMany({ where: { OR: [{ loginId: { contains: f.pengguna, mode: "insensitive" } }, { pegawai: { nama: { contains: f.pengguna, mode: "insensitive" } } }] }, select: { id: true }, take: 50 })).map((u) => u.id)
    : null;
  const tgl = (s: string, akhir = false) => (/^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T${akhir ? "23:59:59.999" : "00:00:00"}+08:00`) : undefined);
  const where: Prisma.AuditLogWhereInput = {
    ...(f.aksi ? { aksi: { contains: f.aksi.toUpperCase().replace(/\s+/g, "_") } } : {}),
    ...(f.entitas ? { entitas: f.entitas } : {}),
    ...(penggunaId ? { userId: { in: penggunaId } } : {}),
    ...(f.dari || f.sampai ? { waktu: { gte: tgl(f.dari), lte: tgl(f.sampai, true) } } : {}),
    ...(/^\d+$/.test(f.sebelum) ? { id: { lt: BigInt(f.sebelum) } } : {}),
  };
  const [baris, daftarEntitas] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { id: "desc" }, take: PER_HALAMAN + 1 }),
    db.auditLog.findMany({ distinct: ["entitas"], select: { entitas: true }, orderBy: { entitas: "asc" } }),
  ]);
  const ada = baris.length > PER_HALAMAN;
  const tampil = baris.slice(0, PER_HALAMAN);
  const users = await db.user.findMany({ where: { id: { in: [...new Set(tampil.map((b) => b.userId).filter((x): x is string => !!x))] } }, include: { pegawai: true } });
  const namaUser = new Map(users.map((u) => [u.id, u.pegawai ? namaLengkap(u.pegawai) : u.loginId]));
  const lanjut = new URLSearchParams(Object.entries({ ...f, sebelum: String(tampil.at(-1)?.id ?? "") }).filter(([, v]) => v));

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-judul">Audit log</h1>
          <p className="text-sm text-slate-700">Nilai NIK, alamat, dan nomor HP disamarkan di log.</p>
        </div>
        <Link href="/admin/log-login" className="text-sm font-medium text-primary hover:underline">
          Log login →
        </Link>
      </div>
      <form className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto_auto_auto]" role="search">
        <Input name="aksi" defaultValue={f.aksi} placeholder="Aksi, mis. cetak" aria-label="Aksi" className="h-10 bg-white" />
        <Pilihan name="entitas" defaultValue={f.entitas} aria-label="Entitas">
          <option value="">Semua entitas</option>
          {daftarEntitas.map((e) => (
            <option key={e.entitas} value={e.entitas}>
              {e.entitas}
            </option>
          ))}
        </Pilihan>
        <Input name="pengguna" defaultValue={f.pengguna} placeholder="Nama / ID login" aria-label="Pengguna" className="h-10 bg-white" />
        <Input name="dari" type="date" defaultValue={f.dari} aria-label="Dari tanggal" className="h-10 bg-white" />
        <Input name="sampai" type="date" defaultValue={f.sampai} aria-label="Sampai tanggal" className="h-10 bg-white" />
        <Button type="submit" variant="outline" className="h-10 bg-white/70">
          Saring
        </Button>
      </form>
      <Card className="py-0">
        <ul className="divide-y divide-sky-100">
          {tampil.length === 0 && <li className="px-4 py-8 text-center text-sm text-slate-600">Tidak ada entri.</li>}
          {tampil.map((b) => (
            <li key={String(b.id)} className="px-4 py-2.5 text-sm">
              <details>
                <summary className="flex cursor-pointer flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <span className="w-36 shrink-0 text-xs text-slate-600">{formatTanggalJam(b.waktu)}</span>
                  <span className="font-semibold text-judul">{b.aksi}</span>
                  <span className="text-slate-700">
                    {b.entitas}
                    {b.entitasId && <span className="text-xs text-slate-500"> · {b.entitasId.slice(0, 36)}</span>}
                  </span>
                  <span className="ml-auto text-xs text-slate-600">
                    {b.userId ? (namaUser.get(b.userId) ?? "?") : "Sistem"}
                    {b.ip && ` · ${b.ip}`}
                  </span>
                </summary>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {(["sebelum", "sesudah"] as const).map((k) => (
                    <div key={k} className="min-w-0">
                      <p className="text-xs font-semibold text-slate-600">{k === "sebelum" ? "Sebelum" : "Sesudah"}</p>
                      <pre className="max-h-64 overflow-auto rounded-md bg-slate-50 p-2 text-xs whitespace-pre-wrap break-all text-slate-800">{b[k] == null ? "—" : JSON.stringify(b[k], null, 2)}</pre>
                    </div>
                  ))}
                  {b.userAgent && <p className="text-xs break-all text-slate-500 md:col-span-2">{b.userAgent}</p>}
                </div>
              </details>
            </li>
          ))}
        </ul>
      </Card>
      {ada && (
        <Button asChild variant="outline" className="justify-self-center bg-white/70">
          <Link href={`/admin/audit-log?${lanjut}`}>Lebih lama →</Link>
        </Button>
      )}
    </div>
  );
}
