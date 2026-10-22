"use client";

import { useEffect } from "react";

/** Membuka dialog cetak browser sekali setelah lembar dimuat (gambar kop sudah siap). */
export function CetakOtomatis() {
  useEffect(() => {
    const cetak = () => window.print();
    if (document.readyState === "complete") {
      const t = setTimeout(cetak, 300);
      return () => clearTimeout(t);
    }
    window.addEventListener("load", cetak, { once: true });
    return () => window.removeEventListener("load", cetak);
  }, []);
  return null;
}
