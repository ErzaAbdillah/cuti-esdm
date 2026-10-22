"use client";

import { LogInIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { Bidang } from "@/components/form/bidang";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { HasilForm } from "@/lib/validasi/auth";
import { masuk } from "@/server/aksi/auth";

export function FormMasuk({ lanjut }: { lanjut?: string }) {
  const [hasil, aksi, proses] = useActionState<HasilForm, FormData>(masuk, {});

  return (
    <form action={aksi} className="grid gap-4" noValidate>
      {hasil.galat && (
        <Alert variant="destructive" role="alert">
          <TriangleAlertIcon />
          <AlertDescription>{hasil.galat}</AlertDescription>
        </Alert>
      )}
      {lanjut && <input type="hidden" name="lanjut" value={lanjut} />}
      <Bidang
        label="NIP / ID Pegawai"
        name="loginId"
        autoComplete="username"
        placeholder="19800326 200803 1 002"
        defaultValue={hasil.nilai?.loginId}
        galat={hasil.galatField?.loginId}
        petunjuk="NIP 18 digit, boleh dengan spasi. Non-ASN memakai ID dari Kepegawaian."
        required
        autoFocus
      />
      <Bidang
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        galat={hasil.galatField?.password}
        required
      />
      <Button type="submit" size="lg" disabled={proses} className="mt-1 w-full">
        <LogInIcon data-icon="inline-start" />
        {proses ? "Memeriksa…" : "Masuk"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Belum punya akun?{" "}
        <Link href="/daftar" className="font-semibold text-primary underline-offset-4 hover:underline">
          Aktivasi dengan NIP
        </Link>
        <br />
        Lupa password? Hubungi Admin untuk reset.
      </p>
    </form>
  );
}
