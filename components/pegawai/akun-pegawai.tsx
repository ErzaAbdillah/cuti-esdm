"use client";

import { CopyIcon, KeyRoundIcon, LockOpenIcon, PowerIcon, TicketIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { Peran } from "@/lib/generated/prisma/enums";
import { aturAktifAkun, aturPeran, buatKodeAktivasi, bukaKunci, type HasilAkun, resetPassword } from "@/server/aksi/akun";

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
  } | null;
  kodeAktivasiAktifSampai: string | null;
  bolehKelolaAkun: boolean;
  bolehBuatKode: boolean;
}

export function AkunPegawai({ pegawaiId, akun, kodeAktivasiAktifSampai, bolehKelolaAkun, bolehBuatKode }: Props) {
  const [proses, mulai] = useTransition();
  const [rahasia, setRahasia] = useState<{ judul: string; nilai: string; pesan?: string } | null>(null);
  const [peran, setPeran] = useState<Peran[]>(akun?.peran ?? []);

  const jalankan = (judul: string, fn: () => Promise<HasilAkun>) =>
    mulai(async () => {
      const h = await fn();
      if (h.galat) toast.error(h.galat);
      else if (h.rahasia) setRahasia({ judul, nilai: h.rahasia, pesan: h.pesan });
      else if (h.pesan) toast.success(h.pesan);
    });

  return (
    <div className="grid gap-4">
      {rahasia && (
        <div className="rounded-xl border-2 border-emas bg-amber-50 p-4" role="status">
          <p className="text-sm font-semibold text-amber-950">{rahasia.judul}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="rounded-lg bg-white px-3 py-1.5 font-mono text-lg font-bold tracking-widest text-judul">{rahasia.nilai}</code>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="bg-white"
              onClick={() => navigator.clipboard.writeText(rahasia.nilai).then(() => toast.success("Disalin"))}
            >
              <CopyIcon data-icon="inline-start" /> Salin
            </Button>
          </div>
          {rahasia.pesan && <p className="mt-2 text-xs text-amber-950">{rahasia.pesan}</p>}
        </div>
      )}

      {!akun ? (
        <div className="grid gap-3 text-sm">
          <p className="text-slate-700">
            Pegawai ini belum mengaktifkan akun. Aktivasi dilakukan sendiri di halaman <b>Aktivasi akun</b> dengan NIP + NIK.
            Bila NIK belum tercatat, terbitkan kode aktivasi.
          </p>
          {kodeAktivasiAktifSampai && (
            <p className="text-slate-700">Ada kode aktivasi aktif sampai {new Date(kodeAktivasiAktifSampai).toLocaleString("id-ID", { timeZone: "Asia/Makassar" })} WITA.</p>
          )}
          {bolehBuatKode && (
            <Button type="button" variant="outline" className="justify-self-start bg-white/70" disabled={proses}
              onClick={() => jalankan("Kode aktivasi", () => buatKodeAktivasi(pegawaiId))}>
              <TicketIcon data-icon="inline-start" /> {kodeAktivasiAktifSampai ? "Terbitkan ulang kode aktivasi" : "Terbitkan kode aktivasi"}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 text-sm">
          <dl className="grid gap-2">
            {[
              ["Login", akun.loginId],
              ["Status", akun.aktif ? (akun.terkunci ? `Terkunci sampai ${new Date(akun.terkunci).toLocaleTimeString("id-ID", { timeZone: "Asia/Makassar", hour: "2-digit", minute: "2-digit" })} WITA` : "Aktif") : "Nonaktif"],
              ["Akun Google", akun.googleEmail ?? "Belum terhubung"],
              ["Login terakhir", akun.terakhirLogin ? new Date(akun.terakhirLogin).toLocaleString("id-ID", { timeZone: "Asia/Makassar" }) : "Belum pernah"],
              ["Wajib ganti password", akun.wajibGantiPassword ? "Ya" : "Tidak"],
            ].map(([k, v]) => (
              <div key={k} className="grid gap-1 sm:grid-cols-[10rem_1fr]">
                <dt className="text-slate-600">{k}</dt>
                <dd className="font-medium text-slate-900">{v}</dd>
              </div>
            ))}
          </dl>

          {bolehKelolaAkun ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="bg-white/70" disabled={proses}
                  onClick={() => jalankan("Password sementara", () => resetPassword(akun.id))}>
                  <KeyRoundIcon data-icon="inline-start" /> Reset password
                </Button>
                {akun.terkunci && (
                  <Button type="button" variant="outline" className="bg-white/70" disabled={proses} onClick={() => jalankan("", () => bukaKunci(akun.id))}>
                    <LockOpenIcon data-icon="inline-start" /> Buka kunci
                  </Button>
                )}
                <Button type="button" variant={akun.aktif ? "destructive" : "outline"} disabled={proses}
                  onClick={() => jalankan("", () => aturAktifAkun(akun.id, !akun.aktif))}>
                  <PowerIcon data-icon="inline-start" /> {akun.aktif ? "Nonaktifkan akun" : "Aktifkan akun"}
                </Button>
              </div>
              <fieldset className="grid gap-2 rounded-xl border border-sky-100 bg-white/60 p-3">
                <legend className="px-1 text-sm font-semibold text-judul">Peran tambahan</legend>
                {(["KEPEGAWAIAN", "ADMIN"] as const).map((p) => (
                  <label key={p} className="flex items-center gap-2">
                    <Checkbox checked={peran.includes(p)} onCheckedChange={(c) => setPeran((x) => (c ? [...x, p] : x.filter((y) => y !== p)))} />
                    {p === "ADMIN" ? "Admin sistem" : "Kepegawaian"}
                  </label>
                ))}
                <p className="text-xs text-slate-600">Peran Pegawai dan Atasan otomatis dari data jabatan.</p>
                <Button type="button" size="sm" className="justify-self-start" disabled={proses} onClick={() => jalankan("", () => aturPeran(akun.id, peran))}>
                  Simpan peran
                </Button>
              </fieldset>
            </>
          ) : (
            <p className="text-xs text-slate-600">Reset password, buka kunci, dan pengaturan peran dilakukan oleh Admin.</p>
          )}
        </div>
      )}
    </div>
  );
}
