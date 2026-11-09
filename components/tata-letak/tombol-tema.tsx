"use client";

import { ChevronDownIcon, PaletteIcon } from "lucide-react";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DAFTAR_TEMA, type IdTema, KUKI_TEMA, normalisasiTema, TEMA_BAWAAN } from "@/lib/tema";
import { cn } from "@/lib/utils";

interface KonteksTema {
  tema: IdTema;
  aturTema: (tema: IdTema) => void;
}

const TemaContext = createContext<KonteksTema>({
  tema: TEMA_BAWAAN,
  aturTema: () => {},
});

function terapkanKeDom(id: IdTema) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.tema = id;
  const info = DAFTAR_TEMA.find((t) => t.id === id);
  if (info) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", info.warna.accent);
  }
}

function simpanPreferensi(id: IdTema) {
  if (typeof document !== "undefined") {
    document.cookie = `${KUKI_TEMA}=${id}; path=/; max-age=31536000; SameSite=Lax`;
  }
  try {
    localStorage.setItem(KUKI_TEMA, id);
  } catch {
    // Abaikan jika penyimpanan lokal dibatasi browser.
  }
}

export function PenyediaTema({ awal = TEMA_BAWAAN, children }: { awal?: IdTema; children: ReactNode }) {
  const [tema, setTema] = useState<IdTema>(awal);

  useEffect(() => {
    terapkanKeDom(tema);
  }, [tema]);

  function aturTema(baru: IdTema) {
    const valid = normalisasiTema(baru);
    setTema(valid);
    terapkanKeDom(valid);
    simpanPreferensi(valid);
  }

  return <TemaContext.Provider value={{ tema, aturTema }}>{children}</TemaContext.Provider>;
}

export function TombolTema({ className }: { className?: string }) {
  const { tema, aturTema } = useContext(TemaContext);
  const aktif = DAFTAR_TEMA.find((t) => t.id === tema) ?? DAFTAR_TEMA[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Tema tampilan: ${aktif.nama}`}
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-white/70 px-3 text-xs font-semibold text-judul shadow-xs transition-colors hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-ring",
          className,
        )}
      >
        <PaletteIcon className="size-4 text-primary" aria-hidden />
        <span>
          Tema<span className="hidden sm:inline">: {aktif.nama}</span>
        </span>
        <span
          className="size-2.5 rounded-full ring-1 ring-foreground/25"
          style={{ backgroundColor: aktif.warna.accent }}
          aria-hidden
        />
        <ChevronDownIcon className="size-3.5 text-slate-500" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 min-w-64">
        <DropdownMenuLabel>Pilih Tema Tampilan</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={tema} onValueChange={(v) => aturTema(normalisasiTema(v))}>
          {DAFTAR_TEMA.map((t) => (
            <DropdownMenuRadioItem key={t.id} value={t.id} className="cursor-pointer py-2">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center -space-x-1" aria-hidden>
                  <span
                    className="size-4 rounded-full ring-1 ring-black/20"
                    style={{ backgroundColor: t.warna.background }}
                    title={`Background ${t.warna.background}`}
                  />
                  <span
                    className="size-4 rounded-full ring-1 ring-black/20"
                    style={{ backgroundColor: t.warna.foreground }}
                    title={`Foreground ${t.warna.foreground}`}
                  />
                  <span
                    className="size-4 rounded-full ring-1 ring-black/20"
                    style={{ backgroundColor: t.warna.accent }}
                    title={`Accent ${t.warna.accent}`}
                  />
                </span>
                <span className="leading-tight">
                  <span className="block text-sm font-semibold">{t.nama}</span>
                  <span className="block text-xs text-muted-foreground">{t.keterangan}</span>
                </span>
              </div>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
