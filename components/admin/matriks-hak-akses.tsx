"use client";

import {
  FolderLockIcon,
  Loader2Icon,
  RotateCcwIcon,
  SearchIcon,
  SearchXIcon,
  Settings2Icon,
  SparklesIcon,
  StampIcon,
  UsersIcon,
  WalletCardsIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { DAFTAR_HAK_AKSES, type HakAkses } from "@/lib/hak-akses";
import { cn } from "@/lib/utils";
import { aturHakAkses } from "@/server/aksi/akun";

export interface BarisHakAksesPegawai {
  userId: string;
  pegawaiId: string | null;
  nama: string;
  nip: string;
  jabatan: string | null;
  unit: string;
  aktif: boolean;
  adminUtama: boolean;
  adalahAdmin?: boolean;
  hakAkses: HakAkses[];
}

const IKON_KOLOM: Record<HakAkses, React.ComponentType<{ className?: string }>> = {
  KELOLA_SALDO_CUTI: WalletCardsIcon,
  PROSES_CUTI: StampIcon,
  KELOLA_PEGAWAI: UsersIcon,
  KELOLA_DOKUMEN_ORGANISASI: FolderLockIcon,
  PENGATURAN_ADMIN: Settings2Icon,
};

type TipeFilter = "semua" | "admin" | "khusus" | "biasa";

function dapatkanInisial(nama: string): string {
  const kata = nama.trim().split(/\s+/).filter(Boolean);
  if (kata.length === 0) return "P";
  if (kata.length === 1) return kata[0].slice(0, 2).toUpperCase();
  return (kata[0][0] + kata[1][0]).toUpperCase();
}

export function MatriksHakAkses({ awal, bolehKelola = true }: { awal: BarisHakAksesPegawai[]; bolehKelola?: boolean }) {
  const [baris, setBaris] = useState<BarisHakAksesPegawai[]>(awal);
  const [cari, setCari] = useState("");
  const [filterAktif, setFilterAktif] = useState<TipeFilter>("semua");
  const [prosesSimpan, setProsesSimpan] = useState<{ userId: string; kode: HakAkses } | null>(null);

  const jumlahAdmin = useMemo(
    () => baris.filter((b) => b.adminUtama || b.adalahAdmin || b.hakAkses.includes("PENGATURAN_ADMIN")).length,
    [baris],
  );
  const jumlahKhusus = useMemo(() => baris.filter((b) => !b.adminUtama && b.hakAkses.length > 0).length, [baris]);
  const jumlahBiasa = useMemo(() => baris.filter((b) => !b.adminUtama && b.hakAkses.length === 0).length, [baris]);

  const terfilter = useMemo(() => {
    let hasil = baris;

    if (filterAktif === "admin") {
      hasil = hasil.filter((b) => b.adminUtama || b.adalahAdmin || b.hakAkses.includes("PENGATURAN_ADMIN"));
    } else if (filterAktif === "khusus") {
      hasil = hasil.filter((b) => !b.adminUtama && b.hakAkses.length > 0);
    } else if (filterAktif === "biasa") {
      hasil = hasil.filter((b) => !b.adminUtama && b.hakAkses.length === 0);
    }

    const k = cari.trim().toLowerCase();
    const kBersih = k.replace(/[\s.-]/g, "");
    if (!k) return hasil;

    return hasil.filter(
      (b) =>
        b.nama.toLowerCase().includes(k) ||
        b.nip.toLowerCase().includes(k) ||
        (kBersih && b.nip.replace(/[\s.-]/g, "").toLowerCase().includes(kBersih)) ||
        b.unit.toLowerCase().includes(k) ||
        (b.jabatan?.toLowerCase().includes(k) ?? false),
    );
  }, [baris, cari, filterAktif]);

  async function ubahCentang(target: BarisHakAksesPegawai, kode: HakAkses, centang: boolean) {
    if (!bolehKelola || target.adminUtama || prosesSimpan?.userId === target.userId) return;
    const sebelumnya = target.hakAkses;
    const baru = centang
      ? [...new Set([...sebelumnya, kode])]
      : sebelumnya.filter((h) => h !== kode);

    setBaris((daftar) =>
      daftar.map((item) => (item.userId === target.userId ? { ...item, hakAkses: baru } : item)),
    );
    setProsesSimpan({ userId: target.userId, kode });

    try {
      const hasil = await aturHakAkses(target.userId, baru);
      if (hasil.galat) {
        setBaris((daftar) =>
          daftar.map((item) => (item.userId === target.userId ? { ...item, hakAkses: sebelumnya } : item)),
        );
        toast.error(hasil.galat);
      } else {
        toast.success(`Hak akses ${target.nama} diperbarui.`);
      }
    } catch {
      setBaris((daftar) =>
        daftar.map((item) => (item.userId === target.userId ? { ...item, hakAkses: sebelumnya } : item)),
      );
      toast.error("Gagal menyimpan perubahan hak akses.");
    } finally {
      setProsesSimpan(null);
    }
  }

  return (
    <div className="grid gap-4">
      {/* Kontrol Pencarian & Filter Cepat */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" aria-hidden />
          <Input
            type="search"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari nama, NIP, jabatan, atau unit kerja…"
            aria-label="Cari pegawai"
            className="h-10 rounded-xl bg-white/90 pl-9 pr-8 shadow-xs dark:bg-slate-900/80"
          />
          {cari && (
            <button
              type="button"
              onClick={() => setCari("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              aria-label="Hapus pencarian"
            >
              <XIcon className="size-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setFilterAktif("semua")}
            className={cn(
              "rounded-lg px-2.5 py-1.5 font-medium transition-colors",
              filterAktif === "semua"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-white/80 text-slate-600 hover:bg-sky-100 hover:text-judul dark:bg-white/5 dark:text-slate-300",
            )}
          >
            Semua ({baris.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterAktif("admin")}
            className={cn(
              "rounded-lg px-2.5 py-1.5 font-medium transition-colors",
              filterAktif === "admin"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-white/80 text-slate-600 hover:bg-sky-100 hover:text-judul dark:bg-white/5 dark:text-slate-300",
            )}
          >
            Admin Utama ({jumlahAdmin})
          </button>
          <button
            type="button"
            onClick={() => setFilterAktif("khusus")}
            className={cn(
              "rounded-lg px-2.5 py-1.5 font-medium transition-colors",
              filterAktif === "khusus"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-white/80 text-slate-600 hover:bg-sky-100 hover:text-judul dark:bg-white/5 dark:text-slate-300",
            )}
          >
            Hak Khusus ({jumlahKhusus})
          </button>
          <button
            type="button"
            onClick={() => setFilterAktif("biasa")}
            className={cn(
              "rounded-lg px-2.5 py-1.5 font-medium transition-colors",
              filterAktif === "biasa"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-white/80 text-slate-600 hover:bg-sky-100 hover:text-judul dark:bg-white/5 dark:text-slate-300",
            )}
          >
            Pegawai Biasa ({jumlahBiasa})
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between px-1 text-xs text-slate-600 dark:text-slate-400">
        <p>
          Menampilkan <b>{terfilter.length}</b> dari {baris.length} pegawai berakun
        </p>
        <p className="hidden sm:block">
          💡 Centang langsung tersimpan secara instan tanpa perlu reload halaman.
        </p>
      </div>

      {/* Tabel Matriks */}
      <div className="kaca overflow-hidden rounded-2xl shadow-sm">
        <div className="max-h-[640px] overflow-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="sticky top-0 z-10 border-b border-sky-100 bg-sky-50/95 backdrop-blur-xs text-judul dark:border-slate-800 dark:bg-slate-900/95">
              <tr>
                <th scope="col" className="px-4 py-3.5 text-left font-semibold">
                  <div className="flex items-center gap-2">
                    <UsersIcon className="size-4 text-primary" />
                    <span>Pegawai &amp; Unit Kerja</span>
                  </div>
                </th>
                {DAFTAR_HAK_AKSES.map((h) => {
                  const Ikon = IKON_KOLOM[h.kode];
                  return (
                    <th
                      key={h.kode}
                      scope="col"
                      title={h.deskripsi}
                      className="w-36 px-2 py-3 text-center text-xs font-semibold leading-tight"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Ikon className="size-3.5 text-primary" />
                        <span>{h.label}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-100 dark:divide-slate-800">
              {terfilter.length === 0 ? (
                <tr>
                  <td colSpan={1 + DAFTAR_HAK_AKSES.length} className="px-4 py-16 text-center text-slate-600 dark:text-slate-400">
                    <div className="mx-auto flex max-w-sm flex-col items-center justify-center gap-2">
                      <SearchXIcon className="size-8 text-slate-400" />
                      <p className="font-semibold text-judul">Tidak ada pegawai yang cocok</p>
                      <p className="text-xs text-slate-500">
                        {cari ? `Tidak ditemukan hasil untuk "${cari}".` : "Tidak ada pegawai pada kategori filter ini."}
                      </p>
                      {(cari || filterAktif !== "semua") && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setCari("");
                            setFilterAktif("semua");
                          }}
                          className="mt-2 bg-white dark:bg-slate-800"
                        >
                          <RotateCcwIcon data-icon="inline-start" className="size-3.5" /> Bersihkan Filter
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                terfilter.map((b) => (
                  <tr
                    key={b.userId}
                    className={cn(
                      "transition-colors hover:bg-sky-50/70 dark:hover:bg-slate-800/50",
                      !b.aktif && "opacity-60 bg-slate-50/40 dark:bg-slate-900/40",
                    )}
                  >
                    {/* Info Pegawai */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-bold shadow-2xs",
                            b.adminUtama
                              ? "bg-primary text-white"
                              : "bg-sky-100 text-judul dark:bg-sky-950 dark:text-sky-200",
                          )}
                          aria-hidden
                        >
                          {dapatkanInisial(b.nama)}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {b.pegawaiId ? (
                              <Link
                                href={`/pegawai/${b.pegawaiId}`}
                                className="font-semibold text-judul hover:text-primary hover:underline"
                              >
                                {b.nama}
                              </Link>
                            ) : (
                              <span className="font-semibold text-judul">{b.nama}</span>
                            )}

            {b.adminUtama && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[0.65rem] font-bold text-primary dark:bg-primary/20">
                                <SparklesIcon className="size-2.5" /> Superadmin (Hak Akses Mutlak)
                              </span>
                            )}

                            {!b.adminUtama && (b.adalahAdmin || b.hakAkses.includes("PENGATURAN_ADMIN")) && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[0.65rem] font-bold text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
                                Admin
                              </span>
                            )}

                            {!b.aktif && (
                              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[0.65rem] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                Nonaktif
                              </span>
                            )}

                            {!b.adminUtama && b.hakAkses.length > 0 && (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                                {b.hakAkses.length} hak aktif
                              </span>
                            )}
                          </div>

                          <p className="mt-0.5 truncate text-xs text-slate-600 dark:text-slate-400">
                            <span className="font-mono text-slate-700 dark:text-slate-300">{b.nip}</span>
                            {b.jabatan && ` · ${b.jabatan}`} · {b.unit}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Kolom 5 Hak Akses */}
                    {DAFTAR_HAK_AKSES.map((h) => {
                      const dicentang = b.adminUtama || b.hakAkses.includes(h.kode);
                      const sedangSimpanUser = prosesSimpan?.userId === b.userId;
                      const sedangSimpanSel = sedangSimpanUser && prosesSimpan.kode === h.kode;

                      return (
                        <td
                          key={h.kode}
                          className={cn(
                            "px-2 py-3 text-center transition-colors",
                            dicentang && "bg-sky-50/40 dark:bg-sky-950/10",
                          )}
                        >
                          <div className="inline-flex items-center justify-center">
                            {sedangSimpanSel ? (
                              <Loader2Icon className="size-4 animate-spin text-primary" />
                            ) : (
                              <Checkbox
                                aria-label={`${h.label} untuk ${b.nama}`}
                                checked={dicentang}
                                disabled={!bolehKelola || b.adminUtama || sedangSimpanUser}
                                onCheckedChange={(v) => ubahCentang(b, h.kode, Boolean(v))}
                                className={cn(
                                  "transition-transform hover:scale-110",
                                  (!bolehKelola || b.adminUtama || sedangSimpanUser) && "cursor-not-allowed opacity-80",
                                )}
                              />
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
