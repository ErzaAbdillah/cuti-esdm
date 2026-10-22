"use client";

import { CalculatorIcon, SendIcon, TriangleAlertIcon } from "lucide-react";
import { useActionState, useEffect, useState, useTransition } from "react";
import { Bidang } from "@/components/form/bidang";
import { Pilihan } from "@/components/form/pilihan";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { HasilForm } from "@/lib/validasi/auth";
import { ajukanCuti, pratinjauCuti } from "@/server/aksi/cuti";

interface Props {
  jenis: { id: string; nama: string; wajibLampiran: boolean; bolehTanggalLampau: boolean; kode: string }[];
  rekan: { id: string; nama: string }[];
  atasan: string | null;
  awal: { noHp: string; alamat: string; hariIni: string };
}

type Pratinjau = Awaited<ReturnType<typeof pratinjauCuti>>;

function Area({ label, name, galat, defaultValue, petunjuk, rows = 3 }: { label: string; name: string; galat?: string; defaultValue?: string; petunjuk?: string; rows?: number }) {
  const id = `f-${name}`;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-judul">
        {label}
      </Label>
      <Textarea id={id} name={name} rows={rows} defaultValue={defaultValue} aria-invalid={galat ? true : undefined} aria-describedby={`${id}-ket`} className="bg-white text-base md:text-sm" />
      {(galat || petunjuk) && (
        <p id={`${id}-ket`} className={galat ? "text-xs font-medium text-destructive" : "text-xs text-muted-foreground"}>
          {galat ?? petunjuk}
        </p>
      )}
    </div>
  );
}

export function FormAjukanCuti({ jenis, rekan, atasan, awal }: Props) {
  const [hasil, aksi, proses] = useActionState<HasilForm, FormData>(ajukanCuti, {});
  const v = hasil.nilai ?? {};
  const g = hasil.galatField ?? {};
  const [pilihan, setPilihan] = useState({ jenisCutiId: v.jenisCutiId ?? jenis[0]?.id ?? "", tanggalMulai: v.tanggalMulai ?? "", tanggalSelesai: v.tanggalSelesai ?? "" });
  const [pratinjau, setPratinjau] = useState<Pratinjau | null>(null);
  const [menghitung, mulaiHitung] = useTransition();
  const j = jenis.find((x) => x.id === pilihan.jenisCutiId);

  // Hitung hari kerja & cek saldo setiap kali jenis/tanggal berubah.
  useEffect(() => {
    if (!pilihan.jenisCutiId || !pilihan.tanggalMulai || !pilihan.tanggalSelesai) return;
    const t = setTimeout(() => mulaiHitung(async () => setPratinjau(await pratinjauCuti(pilihan))), 250);
    return () => clearTimeout(t);
  }, [pilihan]);

  const ubah = (k: keyof typeof pilihan) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const nilai = e.target.value;
    setPilihan((p) => ({ ...p, [k]: nilai, ...(k === "tanggalMulai" && (!p.tanggalSelesai || p.tanggalSelesai < nilai) ? { tanggalSelesai: nilai } : {}) }));
  };

  return (
    <form action={aksi} className="grid gap-5" noValidate key={hasil.stempel ?? 0}>
      {hasil.galat && (
        <Alert variant="destructive" role="alert">
          <TriangleAlertIcon />
          <AlertDescription>{hasil.galat}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor="f-jenis" className="text-judul">
          Jenis cuti
        </Label>
        <Pilihan id="f-jenis" name="jenisCutiId" value={pilihan.jenisCutiId} onChange={ubah("jenisCutiId")} className="h-11 text-base md:text-sm" aria-invalid={g.jenisCutiId ? true : undefined}>
          {jenis.map((x) => (
            <option key={x.id} value={x.id}>
              {x.nama}
            </option>
          ))}
        </Pilihan>
        {g.jenisCutiId && <p className="text-xs font-medium text-destructive">{g.jenisCutiId}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Bidang
          label="Tanggal mulai"
          name="tanggalMulai"
          type="date"
          value={pilihan.tanggalMulai}
          onChange={ubah("tanggalMulai")}
          min={j?.bolehTanggalLampau ? undefined : awal.hariIni}
          galat={g.tanggalMulai}
          required
        />
        <Bidang label="Tanggal selesai" name="tanggalSelesai" type="date" value={pilihan.tanggalSelesai} onChange={ubah("tanggalSelesai")} min={pilihan.tanggalMulai || undefined} galat={g.tanggalSelesai} required />
      </div>

      <div className="flex items-start gap-3 rounded-xl bg-sky-50 p-3 text-sm" aria-live="polite">
        <CalculatorIcon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        {!pilihan.tanggalMulai || !pilihan.tanggalSelesai ? (
          <p className="text-slate-700">Pilih tanggal untuk menghitung jumlah hari kerja. Sabtu, Minggu, libur nasional, dan cuti bersama tidak dihitung.</p>
        ) : menghitung && !pratinjau ? (
          <p className="text-slate-700">Menghitung…</p>
        ) : pratinjau && "jumlahHari" in pratinjau && pratinjau.jumlahHari != null && !pratinjau.galat ? (
          <p className="text-slate-800">
            <b className="text-lg text-judul">{pratinjau.jumlahHari}</b> {"satuan" in pratinjau ? pratinjau.satuan : "hari"}
            {"sisaSetelah" in pratinjau && pratinjau.sisaSetelah != null && <> · sisa saldo setelah cuti: <b>{pratinjau.sisaSetelah}</b> hari</>}
          </p>
        ) : pratinjau?.galat ? (
          <p className="font-medium text-destructive">{pratinjau.galat}</p>
        ) : null}
      </div>

      <Area label="Alasan cuti" name="alasan" galat={g.alasan} defaultValue={v.alasan} petunjuk="Akan tertulis di surat, mis. “adanya urusan keluarga”." />
      <Area label="Alamat selama cuti" name="alamatSelamaCuti" galat={g.alamatSelamaCuti} defaultValue={v.alamatSelamaCuti ?? awal.alamat} rows={2} />
      <Bidang label="Nomor HP selama cuti" name="noHpSelamaCuti" inputMode="tel" defaultValue={v.noHpSelamaCuti ?? awal.noHp} galat={g.noHpSelamaCuti} required />

      <div className="grid gap-1.5">
        <Label htmlFor="f-pj" className="text-judul">
          Penanggung jawab tugas (opsional)
        </Label>
        <Pilihan id="f-pj" name="penanggungJawabId" defaultValue={v.penanggungJawabId ?? ""} className="h-11 text-base md:text-sm">
          <option value="">— tidak ada —</option>
          {rekan.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nama}
            </option>
          ))}
        </Pilihan>
        {g.penanggungJawabId && <p className="text-xs font-medium text-destructive">{g.penanggungJawabId}</p>}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="f-lampiran" className="text-judul">
          Lampiran {j?.wajibLampiran ? "(wajib)" : "(opsional)"}
        </Label>
        <input
          id="f-lampiran"
          type="file"
          name="lampiran"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-sky-100 file:px-3 file:py-2 file:font-semibold file:text-judul hover:file:bg-sky-200"
          aria-invalid={g.lampiran ? true : undefined}
        />
        <p className={g.lampiran ? "text-xs font-medium text-destructive" : "text-xs text-muted-foreground"}>
          {g.lampiran ?? (j?.kode === "SAKIT" ? "Surat keterangan dokter. " : "") + "PDF/JPG/PNG, maks. 10 MB. Disimpan terenkripsi."}
        </p>
      </div>

      <p className="rounded-xl border border-sky-100 bg-white/70 p-3 text-sm text-slate-700">
        Atasan langsung: <b className="text-judul">{atasan ?? "— (langsung ke Kepegawaian)"}</b>
      </p>

      <Button type="submit" size="lg" disabled={proses} className="w-full sm:w-auto sm:justify-self-start">
        <SendIcon data-icon="inline-start" /> {proses ? "Mengirim…" : "Ajukan cuti"}
      </Button>
    </form>
  );
}
