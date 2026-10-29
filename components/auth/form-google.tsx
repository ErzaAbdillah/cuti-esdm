"use client";

import { KeyRoundIcon, LinkIcon, TriangleAlertIcon, UserCheckIcon } from "lucide-react";
import { useActionState } from "react";
import { Bidang } from "@/components/form/bidang";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { HasilForm } from "@/lib/validasi/auth";
import { aktivasiDenganGoogle, hubungkanGoogleAkunLama, pulihkanDenganGoogle } from "@/server/aksi/auth";

function Galat({ teks }: { teks?: string }) {
  if (!teks) return null;
  return (
    <Alert variant="destructive" role="alert">
      <TriangleAlertIcon />
      <AlertDescription>{teks}</AlertDescription>
    </Alert>
  );
}

/** Belum punya akun: NIP + NIK/kode aktivasi, lalu akun dibuat dan terhubung ke Google. */
export function FormGoogleBaru() {
  const [hasil, aksi, proses] = useActionState<HasilForm, FormData>(aktivasiDenganGoogle, {});
  const g = hasil.galatField ?? {};
  return (
    <form action={aksi} className="grid gap-4" noValidate>
      <Galat teks={hasil.galat} />
      <Bidang label="NIP / ID Pegawai" name="loginId" autoComplete="username" placeholder="19800326 200803 1 002" defaultValue={hasil.nilai?.loginId} galat={g.loginId} required />
      <Bidang
        label="NIK atau kode aktivasi"
        name="verifikasi"
        autoComplete="off"
        defaultValue={hasil.nilai?.verifikasi}
        galat={g.verifikasi}
        petunjuk="NIK 16 digit sesuai KTP, atau kode aktivasi dari Kepegawaian."
        required
      />
      <Button type="submit" size="lg" disabled={proses} className="w-full">
        <UserCheckIcon data-icon="inline-start" />
        {proses ? "Memproses…" : "Aktifkan akun"}
      </Button>
    </form>
  );
}

/** Sudah punya akun: buktikan dengan NIP + password sekali, berikutnya cukup Google. */
export function FormGoogleLama() {
  const [hasil, aksi, proses] = useActionState<HasilForm, FormData>(hubungkanGoogleAkunLama, {});
  const g = hasil.galatField ?? {};
  return (
    <form action={aksi} className="grid gap-4" noValidate>
      <Galat teks={hasil.galat} />
      <Bidang label="NIP / ID Pegawai" name="loginId" autoComplete="username" defaultValue={hasil.nilai?.loginId} galat={g.loginId} required />
      <Bidang label="Password" name="password" type="password" autoComplete="current-password" galat={g.password} required />
      <Button type="submit" size="lg" variant="outline" disabled={proses} className="w-full bg-white">
        <LinkIcon data-icon="inline-start" />
        {proses ? "Memproses…" : "Hubungkan & masuk"}
      </Button>
    </form>
  );
}

/** Sudah punya akun tapi lupa password: NIP + NIK/kode, Google terhubung, lalu buat password baru. */
export function FormGooglePulihkan() {
  const [hasil, aksi, proses] = useActionState<HasilForm, FormData>(pulihkanDenganGoogle, {});
  const g = hasil.galatField ?? {};
  return (
    <form action={aksi} className="grid gap-4" noValidate>
      <Galat teks={hasil.galat} />
      <Bidang label="NIP / ID Pegawai" name="loginId" autoComplete="username" defaultValue={hasil.nilai?.loginId} galat={g.loginId} required />
      <Bidang
        label="NIK"
        name="verifikasi"
        autoComplete="off"
        inputMode="numeric"
        defaultValue={hasil.nilai?.verifikasi}
        galat={g.verifikasi}
        petunjuk="NIK 16 digit sesuai KTP. Maksimal 3 kali salah per hari."
        required
      />
      <Button type="submit" size="lg" disabled={proses} className="w-full">
        <KeyRoundIcon data-icon="inline-start" />
        {proses ? "Memproses…" : "Verifikasi & buat password baru"}
      </Button>
    </form>
  );
}
