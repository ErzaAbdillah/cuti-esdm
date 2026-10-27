"use client";

import { type ReactNode, useLayoutEffect, useRef, useState } from "react";

/**
 * Menampilkan lembar A4 utuh (atau selebar `lebarMm`, mis. Legal 215,9 mm)
 * yang diperkecil agar muat di kolom/layar HP tanpa menggulir ke samping.
 * Isi tetap dirender pada ukuran asli.
 */
export function PratinjauA4({ children, label, lebarMm = 210 }: { children: ReactNode; label: string; lebarMm?: number }) {
  const luar = useRef<HTMLDivElement>(null);
  const dalam = useRef<HTMLDivElement>(null);
  const [ukuran, setUkuran] = useState({ skala: 1, tinggi: 0 });

  useLayoutEffect(() => {
    const hitung = () => {
      if (!luar.current || !dalam.current) return;
      const skala = Math.min(1, luar.current.clientWidth / ((lebarMm * 96) / 25.4));
      setUkuran({ skala, tinggi: dalam.current.offsetHeight * skala });
    };
    hitung();
    const ro = new ResizeObserver(hitung);
    if (luar.current) ro.observe(luar.current);
    if (dalam.current) ro.observe(dalam.current);
    return () => ro.disconnect();
  }, [lebarMm]);

  return (
    <figure aria-label={label} ref={luar} className="w-full overflow-hidden print:h-auto! print:overflow-visible" style={{ height: ukuran.tinggi || undefined }}>
      <div
        ref={dalam}
        className="origin-top-left shadow-lg ring-1 ring-slate-200 print:w-auto! print:transform-none! print:shadow-none print:ring-0"
        style={{ width: `${lebarMm}mm`, transform: `scale(${ukuran.skala})` }}
      >
        {children}
      </div>
    </figure>
  );
}
