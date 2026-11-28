"use client";

import { ArrowLeftIcon, PrinterIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/** Bilah alat di atas lembar cetak; tidak ikut tercetak. */
export function BilahCetak({ judul }: { judul: string }) {
  const router = useRouter();

  function kembali() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.close();
    // Cadangan bila browser memblokir window.close() di tab baru atau mode aplikasi penuh (standalone).
    window.setTimeout(() => {
      router.push("/beranda");
    }, 150);
  }

  return (
    <div className="bilah-cetak safe-bilah-cetak sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-sky-100 bg-white/95 pb-2 print:hidden">
      <div className="flex min-w-0 items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={kembali}>
          <ArrowLeftIcon data-icon="inline-start" aria-hidden /> Kembali
        </Button>
        <p className="truncate text-sm font-semibold text-judul">{judul}</p>
      </div>
      <Button
        type="button"
        size="sm"
        className="shrink-0 sm:h-9 sm:px-4 sm:text-sm"
        onClick={() => window.print()}
      >
        <PrinterIcon data-icon="inline-start" aria-hidden />
        <span className="sm:hidden">Cetak / PDF</span>
        <span className="hidden sm:inline">Cetak / Simpan PDF</span>
      </Button>
    </div>
  );
}
