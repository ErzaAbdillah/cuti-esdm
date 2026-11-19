"use client";

import { TriangleAlertIcon, UnlinkIcon } from "lucide-react";
import { useActionState } from "react";
import { Bidang } from "@/components/form/bidang";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { HasilForm } from "@/lib/validasi/auth";
import { putuskanGoogle } from "@/server/aksi/auth";

export function FormPutuskanGoogle({ perluBuatPassword }: { perluBuatPassword: boolean }) {
  const [hasil, aksi, proses] = useActionState<HasilForm, FormData>(putuskanGoogle, {});

  if (perluBuatPassword) {
    return (
      <div className="grid gap-3">
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          Buat password terlebih dahulu di kolom sebelah kiri agar Anda tetap bisa masuk memakai NIP setelah memutuskan akun Google.
        </p>
        <Button type="button" variant="outline" className="w-fit bg-white" disabled>
          <UnlinkIcon data-icon="inline-start" /> Putuskan Google
        </Button>
      </div>
    );
  }

  return (
    <form action={aksi} className="grid gap-3" noValidate>
      {hasil.galat && (
        <Alert variant="destructive" role="alert">
          <TriangleAlertIcon />
          <AlertDescription>{hasil.galat}</AlertDescription>
        </Alert>
      )}
      <Bidang
        label="Konfirmasi password untuk memutus Google"
        name="password"
        type="password"
        autoComplete="current-password"
        galat={hasil.galatField?.password}
        petunjuk="Setelah diputus, perangkat lain akan otomatis keluar dan Anda tetap bisa masuk dengan NIP + password."
        required
      />
      <Button type="submit" variant="outline" disabled={proses} className="w-fit bg-white">
        <UnlinkIcon data-icon="inline-start" /> {proses ? "Memproses…" : "Putuskan Google"}
      </Button>
    </form>
  );
}
