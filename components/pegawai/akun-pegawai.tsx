"use client";

import {
  CheckCircle2Icon,
  CopyIcon,
  FolderLockIcon,
  InfoIcon,
  KeyRoundIcon,
  Loader2Icon,
  LockOpenIcon,
  PowerIcon,
  RotateCcwIcon,
  Settings2Icon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  SparklesIcon,
  StampIcon,
  TicketIcon,
  UsersIcon,
  WalletCardsIcon,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { HakAkses, Peran } from "@/lib/generated/prisma/enums";
import { adalahAkunSuperadmin, DAFTAR_HAK_AKSES, HAK_AKSES_BAWAAN_KEPEGAWAIAN, SEMUA_HAK_AKSES } from "@/lib/hak-akses";
import { cn } from "@/lib/utils";
import { aturAktifAkun, aturHakAkses, buatKodeAktivasi, bukaKunci, type HasilAkun, resetPassword } from "@/server/aksi/akun";

interface Props {
  pegawaiId: string;
  akun: {
    id: string;
    loginId: string;
    aktif: boolean;
    terkunci: string | null;
    terakhirLogin: string | null;
    googleEmail: string | null;
    wajibGantiPassword: boolean;
    peran: Peran[];
    hakAkses: HakAkses[];
  } | null;
  kodeAktivasiAktifSampai: string | null;
  bolehKelolaAkun: boolean;
  bolehBuatKode: boolean;
}

const IKON_HAK: Record<HakAkses, React.ComponentType<{ className?: string }>> = {
  KELOLA_SALDO_CUTI: WalletCardsIcon,
  PROSES_CUTI: StampIcon,
  KELOLA_PEGAWAI: UsersIcon,
  KELOLA_DOKUMEN_ORGANISASI: FolderLockIcon,
  PENGATURAN_ADMIN: Settings2Icon,
};

const AKSEN_HAK: Record<
  HakAkses,
  {
    warnaIkon: string;
    bgIkon: string;
  }
> = {
  KELOLA_SALDO_CUTI: {
    warnaIkon: "text-emerald-700 dark:text-emerald-400",
    bgIkon: "bg-emerald-100 dark:bg-emerald-950/50",
  },
  PROSES_CUTI: {
    warnaIkon: "text-sky-700 dark:text-sky-400",
    bgIkon: "bg-sky-100 dark:bg-sky-950/50",
  },
  KELOLA_PEGAWAI: {
    warnaIkon: "text-indigo-700 dark:text-indigo-400",
    bgIkon: "bg-indigo-100 dark:bg-indigo-950/50",
  },
  KELOLA_DOKUMEN_ORGANISASI: {
    warnaIkon: "text-amber-700 dark:text-amber-400",
    bgIkon: "bg-amber-100 dark:bg-amber-950/50",
  },
  PENGATURAN_ADMIN: {
    warnaIkon: "text-rose-700 dark:text-rose-400",
    bgIkon: "bg-rose-100 dark:bg-rose-950/50",
  },
};

export function AkunPegawai({ pegawaiId, akun, kodeAktivasiAktifSampai, bolehKelolaAkun, bolehBuatKode }: Props) {
  const [proses, mulai] = useTransition();
  const [rahasia, setRahasia] = useState<{ judul: string; nilai: string; pesan?: string } | null>(null);
  const [hakAkses, setHakAkses] = useState<HakAkses[]>(akun?.hakAkses ?? []);

  const adalahAdminUtama = Boolean(akun && adalahAkunSuperadmin(akun));
  const adalahAdminBiasa = Boolean(
    akun && !adalahAdminUtama && (akun.peran.includes("ADMIN") || hakAkses.includes("PENGATURAN_ADMIN")),
  );
  const awal = akun?.hakAkses ?? [];
  const adaPerubahan =
    !adalahAdminUtama &&
    (hakAkses.length !== awal.length || hakAkses.some((k) => !awal.includes(k)));

  const jalankan = (judul: string, fn: () => Promise<HasilAkun>) =>
    mulai(async () => {
      const h = await fn();
      if (h.galat) toast.error(h.galat);
      else if (h.rahasia) setRahasia({ judul, nilai: h.rahasia, pesan: h.pesan });
      else if (h.pesan) toast.success(h.pesan);
    });

  return (
    <div className="grid gap-5">
      {rahasia && (
        <div className="rounded-xl border-2 border-emas bg-amber-50/90 p-4 shadow-sm dark:bg-amber-950/40" role="status">
          <p className="text-sm font-semibold text-amber-950 dark:text-amber-200">{rahasia.judul}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="rounded-lg bg-white px-3 py-1.5 font-mono text-lg font-bold tracking-widest text-judul shadow-xs dark:bg-slate-900">
              {rahasia.nilai}
            </code>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="bg-white hover:bg-slate-50 dark:bg-slate-800"
              onClick={() => navigator.clipboard.writeText(rahasia.nilai).then(() => toast.success("Disalin ke papan klip"))}
            >
              <CopyIcon data-icon="inline-start" /> Salin
            </Button>
          </div>
          {rahasia.pesan && <p className="mt-2 text-xs text-amber-900/90 dark:text-amber-300/90">{rahasia.pesan}</p>}
        </div>
      )}

      {!akun ? (
        <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-4 text-sm dark:border-sky-900/30 dark:bg-sky-950/20">
          <div className="flex items-start gap-3">
            <InfoIcon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <div className="grid gap-2">
              <p className="text-slate-700 dark:text-slate-300">
                Pegawai ini belum mengaktifkan akun. Aktivasi dapat dilakukan sendiri di halaman <b>Aktivasi akun</b> menggunakan NIP + NIK.
                Bila NIK belum tercatat di data kepegawaian, Admin dapat menerbitkan kode aktivasi sementara.
              </p>
              {kodeAktivasiAktifSampai && (
                <p className="font-medium text-amber-800 dark:text-amber-300">
                  Kode aktivasi saat ini aktif sampai {new Date(kodeAktivasiAktifSampai).toLocaleString("id-ID", { timeZone: "Asia/Makassar" })} WITA.
                </p>
              )}
              {bolehBuatKode && (
                <div className="pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="bg-white/80 shadow-xs hover:bg-white dark:bg-slate-800"
                    disabled={proses}
                    onClick={() => jalankan("Kode aktivasi", () => buatKodeAktivasi(pegawaiId))}
                  >
                    <TicketIcon data-icon="inline-start" /> {kodeAktivasiAktifSampai ? "Terbitkan ulang kode aktivasi" : "Terbitkan kode aktivasi"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 text-sm">
          {/* Status & Kredensial Akun */}
          <div className="kaca rounded-xl p-4">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1 border-b border-sky-100 pb-2 sm:border-b-0 sm:border-r sm:pr-4 dark:border-slate-800">
                <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">ID Login</dt>
                <dd className="font-mono text-base font-bold text-judul">{akun.loginId}</dd>
              </div>

              <div className="flex flex-col gap-1 pb-2 sm:pl-4">
                <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Status Akun</dt>
                <dd className="flex items-center gap-2">
                  {akun.aktif ? (
                    akun.terkunci ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
                        <span className="size-1.5 rounded-full bg-amber-600" />
                        Terkunci sampai {new Date(akun.terkunci).toLocaleTimeString("id-ID", { timeZone: "Asia/Makassar", hour: "2-digit", minute: "2-digit" })} WITA
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
                        <span className="size-1.5 animate-pulse rounded-full bg-emerald-600" />
                        Aktif
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      Nonaktif
                    </span>
                  )}
                </dd>
              </div>

              <div className="flex flex-col gap-1 border-b border-sky-100 py-2 sm:border-b-0 sm:border-r sm:pr-4 dark:border-slate-800">
                <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Akun Google Terhubung</dt>
                <dd className="font-medium text-slate-900 dark:text-slate-200">{akun.googleEmail ?? "Belum terhubung"}</dd>
              </div>

              <div className="flex flex-col gap-1 py-2 sm:pl-4">
                <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Login Terakhir</dt>
                <dd className="font-medium text-slate-900 dark:text-slate-200">
                  {akun.terakhirLogin ? `${new Date(akun.terakhirLogin).toLocaleString("id-ID", { timeZone: "Asia/Makassar" })} WITA` : "Belum pernah login"}
                </dd>
              </div>

              <div className="flex flex-col gap-1 pt-1 sm:col-span-2">
                <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Wajib Ganti Password</dt>
                <dd>
                  {akun.wajibGantiPassword ? (
                    <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
                      Ya (saat login berikutnya)
                    </span>
                  ) : (
                    <span className="text-slate-700 dark:text-slate-300">Tidak</span>
                  )}
                </dd>
              </div>
            </dl>

            {bolehKelolaAkun && (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-sky-100 pt-3 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="bg-white/80 shadow-xs hover:bg-white dark:bg-slate-800"
                  disabled={proses}
                  onClick={() => jalankan("Password sementara", () => resetPassword(akun.id))}
                >
                  <KeyRoundIcon data-icon="inline-start" /> Reset password
                </Button>
                {akun.terkunci && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="bg-white/80 shadow-xs hover:bg-white dark:bg-slate-800"
                    disabled={proses}
                    onClick={() => jalankan("", () => bukaKunci(akun.id))}
                  >
                    <LockOpenIcon data-icon="inline-start" /> Buka kunci
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant={akun.aktif ? "destructive" : "outline"}
                  className="shadow-xs"
                  disabled={proses || (adalahAdminUtama && akun.aktif)}
                  onClick={() => jalankan("", () => aturAktifAkun(akun.id, !akun.aktif))}
                >
                  <PowerIcon data-icon="inline-start" /> {akun.aktif ? "Nonaktifkan akun" : "Aktifkan akun"}
                </Button>
              </div>
            )}
          </div>

          {/* Pengaturan Hak Akses Modular */}
          {bolehKelolaAkun ? (
            <fieldset className="kaca grid gap-4 rounded-2xl p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-100 pb-3 dark:border-slate-800">
                <legend className="flex items-center gap-2 text-base font-bold text-judul">
                  <ShieldCheckIcon className="size-5 text-primary" aria-hidden />
                  Hak Akses Pegawai
                </legend>
                <div className="flex items-center gap-2">
                  {adalahAdminUtama ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary dark:bg-primary/20">
                      <SparklesIcon className="size-3.5" />
                      Superadmin (Hak Akses Mutlak)
                    </span>
                  ) : (
                    <>
                      {adalahAdminBiasa && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
                          <ShieldCheckIcon className="size-3.5" />
                          Admin
                        </span>
                      )}
                      <span className="inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-judul dark:bg-sky-950/60 dark:text-sky-300">
                        {hakAkses.length} dari {DAFTAR_HAK_AKSES.length} hak aktif
                      </span>
                    </>
                  )}
                </div>
              </div>

              {adalahAdminUtama && (
                <div className="rounded-xl border border-sky-200 bg-sky-50/80 p-3.5 text-xs leading-relaxed text-slate-700 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-slate-300">
                  <p className="flex items-center gap-1.5 font-semibold text-judul">
                    <ShieldAlertIcon className="size-4 text-primary" />
                    Superadmin (Hak Akses Mutlak)
                  </p>
                  <p className="mt-1">
                    Akun ini merupakan <b>Superadmin</b> (peran Admin / akun <code>admin</code>) sehingga memiliki kewenangan mutlak dan permanen pada seluruh modul aplikasi. Kotak centang di bawah terkunci otomatis dan tidak dapat dicabut.
                  </p>
                </div>
              )}

              {!adalahAdminUtama && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Atur kewenangan fitur modular untuk pegawai ini:
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      disabled={proses}
                      onClick={() => setHakAkses([...HAK_AKSES_BAWAAN_KEPEGAWAIAN])}
                      className="text-xs text-slate-600 hover:text-judul"
                    >
                      Bawaan Kepegawaian
                    </Button>
                    <span className="text-slate-300" aria-hidden>·</span>
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      disabled={proses}
                      onClick={() => setHakAkses([...SEMUA_HAK_AKSES])}
                      className="text-xs text-slate-600 hover:text-judul"
                    >
                      Pilih Semua
                    </Button>
                    <span className="text-slate-300" aria-hidden>·</span>
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      disabled={proses}
                      onClick={() => setHakAkses([])}
                      className="text-xs text-slate-600 hover:text-destructive"
                    >
                      Kosongkan
                    </Button>
                  </div>
                </div>
              )}

              {/* Grid 5 Kartu Hak Akses */}
              <div className="grid gap-3 sm:grid-cols-2">
                {DAFTAR_HAK_AKSES.map((item) => {
                  const aktif = adalahAdminUtama || hakAkses.includes(item.kode);
                  const Ikon = IKON_HAK[item.kode];
                  const aksen = AKSEN_HAK[item.kode];

                  return (
                    <label
                      key={item.kode}
                      className={cn(
                        "group relative flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all duration-200",
                        aktif
                          ? "border-primary/50 bg-sky-50/70 shadow-xs ring-1 ring-primary/20 dark:border-primary/40 dark:bg-sky-950/20"
                          : "border-sky-100 bg-white/80 hover:border-sky-200 hover:bg-white hover:shadow-xs dark:border-white/10 dark:bg-white/5",
                        adalahAdminUtama && "cursor-default opacity-90",
                        proses && "pointer-events-none opacity-60",
                      )}
                    >
                      <div className="pt-0.5">
                        <Checkbox
                          checked={aktif}
                          disabled={proses || adalahAdminUtama}
                          onCheckedChange={(c) =>
                            setHakAkses((prev) =>
                              c ? [...prev, item.kode] : prev.filter((k) => k !== item.kode),
                            )
                          }
                          className="transition-transform group-hover:scale-105"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "flex size-6 shrink-0 items-center justify-center rounded-md",
                              aksen.bgIkon,
                              aksen.warnaIkon,
                            )}
                          >
                            <Ikon className="size-3.5" />
                          </span>
                          <span className="text-sm font-semibold text-judul">{item.label}</span>
                          {aktif && !adalahAdminUtama && (
                            <span className="ml-auto inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-[0.65rem] font-bold text-primary dark:bg-primary/20">
                              <CheckCircle2Icon className="size-3" /> Aktif
                            </span>
                          )}
                          {adalahAdminUtama && (
                            <span className="ml-auto inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                              Otomatis
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                          {item.deskripsi}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Catatan Alur Dinamis */}
              <div className="rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600 dark:bg-slate-900/50 dark:text-slate-400">
                <p>
                  💡 <b>Catatan:</b> Hak akses dasar <b>Pegawai</b> (mengajukan cuti mandiri & dokumen kepegawaian pribadi) serta <b>Atasan Langsung</b> (memproses persetujuan bawahan) diberikan secara dinamis oleh sistem berdasarkan struktur jabatan tanpa perlu dicentang manual.
                </p>
              </div>

              {/* Bar Tombol Simpan & Status Perubahan */}
              {!adalahAdminUtama && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sky-100 pt-3 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    {adaPerubahan && (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-100/90 px-2.5 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
                        <span className="size-1.5 animate-pulse rounded-full bg-amber-600" />
                        Perubahan belum disimpan
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {adaPerubahan && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={proses}
                        onClick={() => setHakAkses([...awal])}
                        className="text-xs text-slate-600 hover:text-judul"
                      >
                        <RotateCcwIcon data-icon="inline-start" className="size-3.5" /> Batal
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant={adaPerubahan ? "penting" : "default"}
                      disabled={proses || !adaPerubahan}
                      onClick={() => jalankan("", () => aturHakAkses(akun.id, hakAkses))}
                      className="shadow-sm"
                    >
                      {proses ? (
                        <>
                          <Loader2Icon className="size-4 animate-spin" data-icon="inline-start" /> Menyimpan...
                        </>
                      ) : (
                        "Simpan Hak Akses"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </fieldset>
          ) : (
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Reset password, buka kunci, dan pengaturan hak akses hanya dapat dilakukan oleh Admin.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
