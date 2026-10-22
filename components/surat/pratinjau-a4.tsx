"use client";

import { type ReactNode, useLayoutEffect, useRef, useState } from "react";

/** 210 mm pada 96 dpi. */
const LEBAR_A4_PX = 793.7;

/**
 * Menampilkan lembar A4 utuh yang diperkecil agar muat di kolom/layar HP
 * tanpa menggulir ke samping. Isi tetap dirender pada ukuran asli.
 */
export function PratinjauA4({ children, label }: { children: ReactNode; label: string }) {
  const luar = useRef<HTMLDivElement>(null);
  const dalam = useRef<HTMLDivElement>(null);
  const [ukuran, setUkuran] = useState({ skala: 1, tinggi: 0 });

  useLayoutEffect(() => {
    const hitung = () => {
      if (!luar.current || !dalam.current) return;
      const skala = Math.min(1, luar.current.clientWidth / LEBAR_A4_PX);
      setUkuran({ skala, tinggi: dalam.current.offsetHeight * skala });
    };
    hitung();
    const ro = new ResizeObserver(hitung);
    if (luar.current) ro.observe(luar.current);
    if (dalam.current) ro.observe(dalam.current);
    return () => ro.disconnect();
  }, []);

  return (
    <figure aria-label={label} ref={luar} className="w-full overflow-hidden print:h-auto! print:overflow-visible" style={{ height: ukuran.tinggi || undefined }}>
      <div
        ref={dalam}
        className="w-[210mm] origin-top-left shadow-lg ring-1 ring-slate-200 print:w-auto! print:transform-none! print:shadow-none print:ring-0"
        style={{ transform: `scale(${ukuran.skala})` }}
      >
        {children}
      </div>
    </figure>
  );
}
