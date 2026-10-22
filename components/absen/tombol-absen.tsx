"use client";

import { CircleCheckIcon, FingerprintIcon, TriangleAlertIcon } from "lucide-react";
import { useActionState, useSyncExternalStore } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ZONA_WAKTU } from "@/lib/tanggal";
import type { HasilForm } from "@/lib/validasi/auth";
import { absenMasuk } from "@/server/aksi/absen";

function langgananDetik(beritahu: () => void) {
  const t = setInterval(beritahu, 1000);
  return () => clearInterval(t);
}

/** Jam WITA yang berjalan; kosong saat render server agar tidak terjadi hydration mismatch. */
export function JamWita() {
  const detik = useSyncExternalStore(langgananDetik, () => Math.floor(Date.now() / 1000), () => null);
  const jam =
    detik != null
      ? new Intl.DateTimeFormat("id-ID", { timeZone: ZONA_WAKTU, hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(detik * 1000))
      : "--.--.--";
  return (
    <p className="text-5xl font-bold tabular-nums tracking-tight text-judul sm:text-6xl" aria-live="off">
      {jam} <span className="text-lg font-semibold text-slate-600">WITA</span>
    </p>
  );
}

export function TombolAbsen() {
  const [hasil, aksi, proses] = useActionState<HasilForm>(absenMasuk, {});
  return (
    <form action={aksi} className="grid gap-3">
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
      <Button type="submit" variant="penting" disabled={proses} className="h-16 w-full rounded-2xl text-lg shadow-md">
        <FingerprintIcon className="size-6" data-icon="inline-start" />
        {proses ? "Mencatat…" : "Absen Masuk"}
      </Button>
    </form>
  );
}
