"use client";

import { PrinterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Bilah alat di atas lembar cetak; tidak ikut tercetak. */
export function BilahCetak({ judul }: { judul: string }) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-sky-100 bg-white/95 px-4 py-2 print:hidden">
      <p className="truncate text-sm font-semibold text-judul">{judul}</p>
      <Button type="button" onClick={() => window.print()}>
        <PrinterIcon data-icon="inline-start" /> Cetak / Simpan PDF
      </Button>
    </div>
  );
}
