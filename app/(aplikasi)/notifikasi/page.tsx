import { BellIcon, CheckCheckIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatTanggalJam } from "@/lib/tanggal";
import { cn } from "@/lib/utils";
import { tandaiSemuaDibaca } from "@/server/aksi/notifikasi";
import { wajibLogin } from "@/server/auth/pengguna";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Notifikasi" };

export default async function Notifikasi() {
  const u = await wajibLogin();
  const daftar = await db.notifikasi.findMany({ where: { userId: u.userId }, orderBy: { dibuatPada: "desc" }, take: 100 });
  const adaBelumDibaca = daftar.some((n) => !n.dibacaPada);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-judul">Notifikasi</h1>
        {adaBelumDibaca && (
          <form action={tandaiSemuaDibaca}>
            <Button type="submit" variant="outline" className="bg-white/70">
              <CheckCheckIcon data-icon="inline-start" /> Tandai semua dibaca
            </Button>
          </form>
        )}
      </div>
      <Card className="py-0">
        <CardContent className="p-0">
          {daftar.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-slate-600">
              <BellIcon className="size-8 text-sky-400" aria-hidden />
              <p>Belum ada notifikasi.</p>
            </div>
          ) : (
            <ul className="divide-y divide-sky-100">
              {daftar.map((n) => (
                <li key={n.id} className={cn("flex gap-3 px-4 py-3", !n.dibacaPada && "bg-sky-50/80")}>
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.dibacaPada ? "bg-transparent" : "bg-brand")} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-judul">
                      {n.tautan ? <Link href={n.tautan} className="hover:underline">{n.judul}</Link> : n.judul}
                    </p>
                    <p className="text-sm text-slate-700">{n.isi}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{formatTanggalJam(n.dibuatPada)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
