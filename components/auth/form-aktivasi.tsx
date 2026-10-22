"use client";

import { TriangleAlertIcon, UserCheckIcon } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { Bidang } from "@/components/form/bidang";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { HasilForm } from "@/lib/validasi/auth";
import { aktivasiAkun } from "@/server/aksi/auth";

export function FormAktivasi() {
  const [hasil, aksi, proses] = useActionState<HasilForm, FormData>(aktivasiAkun, {});
  const g = hasil.galatField ?? {};

  return (
    <form action={aksi} className="grid gap-4" noValidate>
      {hasil.galat && (
        <Alert variant="destructive" role="alert">
          <TriangleAlertIcon />
          <AlertDescription>{hasil.galat}</AlertDescription>
        </Alert>
      )}
      <Bidang
        label="NIP / ID Pegawai"
        name="loginId"
        autoComplete="username"
        placeholder="19800326 200803 1 002"
        defaultValue={hasil.nilai?.loginId}
        galat={g.loginId}
        petunjuk="NIP harus sudah terdaftar di data kepegawaian."
        required
        autoFocus
      />
      <Bidang
        label="NIK atau kode aktivasi"
        name="verifikasi"
        autoComplete="off"
        defaultValue={hasil.nilai?.verifikasi}
        galat={g.verifikasi}
        petunjuk="NIK 16 digit sesuai KTP. Jika NIK Anda belum tercatat, minta kode aktivasi ke Kepegawaian."
        required
      />
      <Bidang
        label="Password baru"
        name="password"
        type="password"
        autoComplete="new-password"
        galat={g.password}
        petunjuk="Minimal 8 karakter, berisi huruf dan angka."
        required
      />
      <Bidang
        label="Ulangi password"
        name="konfirmasi"
        type="password"
        autoComplete="new-password"
        galat={g.konfirmasi}
        required
      />
      <Button type="submit" size="lg" disabled={proses} className="mt-1 w-full">
        <UserCheckIcon data-icon="inline-start" />
        {proses ? "Memproses…" : "Aktifkan akun"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Sudah punya akun?{" "}
        <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
          Masuk
        </Link>
      </p>
    </form>
  );
}
