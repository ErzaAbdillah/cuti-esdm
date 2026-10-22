"use client";

import { CircleCheckIcon, KeyRoundIcon, TriangleAlertIcon } from "lucide-react";
import { useActionState } from "react";
import { Bidang } from "@/components/form/bidang";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { HasilForm } from "@/lib/validasi/auth";
import { gantiPassword } from "@/server/aksi/auth";

export function FormGantiPassword() {
  const [hasil, aksi, proses] = useActionState<HasilForm, FormData>(gantiPassword, {});
  const g = hasil.galatField ?? {};

  return (
    <form action={aksi} className="grid gap-4" noValidate key={hasil.sukses}>
      {hasil.galat && (
        <Alert variant="destructive" role="alert">
          <TriangleAlertIcon />
          <AlertDescription>{hasil.galat}</AlertDescription>
        </Alert>
      )}
      {hasil.sukses && (
        <Alert className="border-emerald-300 bg-emerald-50" role="status">
          <CircleCheckIcon className="text-emerald-700" />
          <AlertDescription className="text-emerald-900">{hasil.sukses}</AlertDescription>
        </Alert>
      )}
      <Bidang label="Password lama" name="passwordLama" type="password" autoComplete="current-password" galat={g.passwordLama} required />
      <Bidang
        label="Password baru"
        name="password"
        type="password"
        autoComplete="new-password"
        galat={g.password}
        petunjuk="Minimal 8 karakter, berisi huruf dan angka."
        required
      />
      <Bidang label="Ulangi password baru" name="konfirmasi" type="password" autoComplete="new-password" galat={g.konfirmasi} required />
      <Button type="submit" disabled={proses} className="w-full sm:w-auto sm:justify-self-start">
        <KeyRoundIcon data-icon="inline-start" />
        {proses ? "Menyimpan…" : "Simpan password"}
      </Button>
    </form>
  );
}
