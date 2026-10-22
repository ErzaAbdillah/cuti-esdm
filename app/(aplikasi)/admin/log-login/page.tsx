import type { Metadata } from "next";
import Link from "next/link";
import { Pilihan } from "@/components/form/pilihan";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Prisma } from "@/lib/generated/prisma/client";
import { formatTanggalJam } from "@/lib/tanggal";
import { cn } from "@/lib/utils";
import { wajibPeran } from "@/server/auth/pengguna";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Log Login" };

const PER_HALAMAN = 50;
const teks = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, 60) : "");

export default async function LogLogin({ searchParams }: PageProps<"/admin/log-login">) {
  await wajibPeran("ADMIN");
  const sp = await searchParams;
  const f = { login: teks(sp.login), ip: teks(sp.ip), hasil: teks(sp.hasil), sebelum: teks(sp.sebelum) };
  const where: Prisma.LogLoginWhereInput = {
    ...(f.login ? { loginIdDicoba: { contains: f.login.replace(/\s/g, "") } } : {}),
    ...(f.ip ? { ip: { startsWith: f.ip } } : {}),
    ...(f.hasil === "gagal" ? { berhasil: false } : f.hasil === "berhasil" ? { berhasil: true } : {}),
    ...(/^\d+$/.test(f.sebelum) ? { id: { lt: BigInt(f.sebelum) } } : {}),
  };
  const baris = await db.logLogin.findMany({ where, orderBy: { id: "desc" }, take: PER_HALAMAN + 1 });
  const tampil = baris.slice(0, PER_HALAMAN);
  const lanjut = new URLSearchParams(Object.entries({ ...f, sebelum: String(tampil.at(-1)?.id ?? "") }).filter(([, v]) => v));

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-judul">Log login</h1>
          <p className="text-sm text-slate-700">Percobaan masuk berhasil & gagal. 5 kali gagal mengunci akun 15 menit; 20 percobaan per IP per 15 menit.</p>
        </div>
        <Link href="/admin/audit-log" className="text-sm font-medium text-primary hover:underline">
          Audit log →
        </Link>
      </div>
      <form className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]" role="search">
        <Input name="login" defaultValue={f.login} placeholder="NIP / ID login" aria-label="NIP atau ID login" className="h-10 bg-white" />
        <Input name="ip" defaultValue={f.ip} placeholder="Alamat IP" aria-label="Alamat IP" className="h-10 bg-white" />
        <Pilihan name="hasil" defaultValue={f.hasil} aria-label="Hasil">
          <option value="">Semua</option>
          <option value="gagal">Gagal</option>
          <option value="berhasil">Berhasil</option>
        </Pilihan>
        <Button type="submit" variant="outline" className="h-10 bg-white/70">
          Saring
        </Button>
      </form>
      <Card className="py-0">
        <ul className="divide-y divide-sky-100">
          {tampil.length === 0 && <li className="px-4 py-8 text-center text-sm text-slate-600">Tidak ada entri.</li>}
          {tampil.map((b) => (
            <li key={String(b.id)} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-2.5 text-sm">
              <span className="w-36 shrink-0 text-xs text-slate-600">{formatTanggalJam(b.waktu)}</span>
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", b.berhasil ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900")}>{b.berhasil ? "Berhasil" : "Gagal"}</span>
              <span className="font-medium text-slate-900">{b.loginIdDicoba}</span>
              {b.alasan && <span className="text-slate-700">{b.alasan}</span>}
              <span className="ml-auto text-xs text-slate-600">{b.ip ?? "-"}</span>
            </li>
          ))}
        </ul>
      </Card>
      {baris.length > PER_HALAMAN && (
        <Button asChild variant="outline" className="justify-self-center bg-white/70">
          <Link href={`/admin/log-login?${lanjut}`}>Lebih lama →</Link>
        </Button>
      )}
    </div>
  );
}
