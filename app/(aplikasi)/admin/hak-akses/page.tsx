import {
  ArrowLeftIcon,
  FolderLockIcon,
  Settings2Icon,
  ShieldCheckIcon,
  StampIcon,
  UsersIcon,
  WalletCardsIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { type BarisHakAksesPegawai, MatriksHakAkses } from "@/components/admin/matriks-hak-akses";
import { formatNip } from "@/lib/domain/nip";
import { namaLengkap } from "@/lib/domain/pegawai";
import { DAFTAR_HAK_AKSES, HAK_AKSES_BAWAAN_KEPEGAWAIAN, type HakAkses, SEMUA_HAK_AKSES } from "@/lib/hak-akses";
import { cn } from "@/lib/utils";
import { wajibHakAkses } from "@/server/auth/pengguna";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Hak Akses Pegawai" };

const IKON_KARTU: Record<HakAkses, React.ComponentType<{ className?: string }>> = {
  KELOLA_SALDO_CUTI: WalletCardsIcon,
  PROSES_CUTI: StampIcon,
  KELOLA_PEGAWAI: UsersIcon,
  KELOLA_DOKUMEN_ORGANISASI: FolderLockIcon,
  PENGATURAN_ADMIN: Settings2Icon,
};

const WARNA_KARTU: Record<HakAkses, { bgIkon: string; warnaIkon: string; ring: string }> = {
  KELOLA_SALDO_CUTI: {
    bgIkon: "bg-emerald-100 dark:bg-emerald-950/60",
    warnaIkon: "text-emerald-700 dark:text-emerald-400",
    ring: "hover:border-emerald-300",
  },
  PROSES_CUTI: {
    bgIkon: "bg-sky-100 dark:bg-sky-950/60",
    warnaIkon: "text-sky-700 dark:text-sky-400",
    ring: "hover:border-sky-300",
  },
  KELOLA_PEGAWAI: {
    bgIkon: "bg-indigo-100 dark:bg-indigo-950/60",
    warnaIkon: "text-indigo-700 dark:text-indigo-400",
    ring: "hover:border-indigo-300",
  },
  KELOLA_DOKUMEN_ORGANISASI: {
    bgIkon: "bg-amber-100 dark:bg-amber-950/60",
    warnaIkon: "text-amber-700 dark:text-amber-400",
    ring: "hover:border-amber-300",
  },
  PENGATURAN_ADMIN: {
    bgIkon: "bg-rose-100 dark:bg-rose-950/60",
    warnaIkon: "text-rose-700 dark:text-rose-400",
    ring: "hover:border-rose-300",
  },
};

export default async function HalamanHakAksesPegawai() {
  await wajibHakAkses("PENGATURAN_ADMIN");

  const daftarUser = await db.user.findMany({
    where: { pegawaiId: { not: null } },
    include: {
      pegawai: { include: { jabatan: true, unitKerja: true } },
      peran: true,
      hakAkses: true,
    },
    orderBy: { pegawai: { nama: "asc" } },
  });

  const baris: BarisHakAksesPegawai[] = daftarUser
    .filter((u) => u.pegawai !== null)
    .map((u) => {
      const p = u.pegawai!;
      const adminUtama = u.peran.some((r) => r.peran === "ADMIN");
      const set = new Set<HakAkses>(u.hakAkses.map((h) => h.hakAkses));
      if (adminUtama) {
        for (const h of SEMUA_HAK_AKSES) set.add(h);
      } else if (set.size === 0 && u.peran.some((r) => r.peran === "KEPEGAWAIAN")) {
        for (const h of HAK_AKSES_BAWAAN_KEPEGAWAIAN) set.add(h);
      }

      return {
        userId: u.id,
        pegawaiId: p.id,
        nama: namaLengkap(p),
        nip: p.nip ? formatNip(p.nip) : (p.idNonAsn ?? u.loginId),
        jabatan: p.jabatan?.nama ?? null,
        unit: p.unitKerja.nama,
        aktif: u.aktif,
        adminUtama,
        hakAkses: [...set],
      };
    });

  return (
    <div className="grid gap-6">
      {/* Header Halaman */}
      <div>
        <Link
          href="/admin"
          className="group mb-1.5 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80 hover:underline"
        >
          <ArrowLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" /> Kembali ke Admin
        </Link>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight text-judul sm:text-3xl">Hak Akses Pegawai</h1>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary dark:bg-primary/20">
            <ShieldCheckIcon className="size-3.5" /> Kontrol Modular
          </span>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300 sm:max-w-3xl">
          Atur kewenangan fitur setiap pegawai secara granular. Centang pada tabel di bawah langsung tersimpan otomatis dan tercatat pada audit log sistem.
        </p>
      </div>

      {/* Kartu Ringkasan 5 Hak Akses */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {DAFTAR_HAK_AKSES.map((h) => {
          const Ikon = IKON_KARTU[h.kode];
          const warna = WARNA_KARTU[h.kode];
          return (
            <div
              key={h.kode}
              className={cn(
                "kaca group relative flex flex-col rounded-2xl p-3.5 transition-all duration-200 hover:shadow-md",
                warna.ring,
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105",
                    warna.bgIkon,
                    warna.warnaIkon,
                  )}
                >
                  <Ikon className="size-4" />
                </span>
                <p className="text-xs font-bold leading-tight text-judul">{h.label}</p>
              </div>
              <p className="mt-2 text-[0.75rem] leading-relaxed text-slate-600 dark:text-slate-400">
                {h.deskripsi}
              </p>
            </div>
          );
        })}
      </div>

      {/* Matriks Tabel Interaktif */}
      <MatriksHakAkses awal={baris} />
    </div>
  );
}
