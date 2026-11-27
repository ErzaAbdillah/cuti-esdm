"use client";

import { MoonIcon, PaletteIcon, SunIcon } from "lucide-react";
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
import {
  balikModeTema,
  DAFTAR_TEMA,
  gantiGayaTema,
  type GayaTema,
  gayaTema,
  type IdTema,
  KUKI_TEMA,
  modeTema,
  normalisasiTema,
  TEMA_BAWAAN,
  temaDari,
  warnaBilahBrowser,
} from "@/lib/tema";
import { cn } from "@/lib/utils";

interface KonteksTema {
  tema: IdTema;
  aturTema: (tema: IdTema) => void;
}

const TemaContext = createContext<KonteksTema>({
  tema: TEMA_BAWAAN,
  aturTema: () => {},
});

const URUTAN_GAYA: readonly GayaTema[] = ["notion", "langit"];

function terapkanKeDom(id: IdTema) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.tema = id;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", warnaBilahBrowser(id));
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
  const [tema, setTema] = useState<IdTema>(() => normalisasiTema(awal));

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
  const gayaAktif = gayaTema(tema);
  const modeAktif = modeTema(tema);
  const sedangSiang = modeAktif === "siang";
  const labelBalikMode = sedangSiang ? "Ganti ke mode Malam" : "Ganti ke mode Siang";

  const opsiGaya = URUTAN_GAYA.map((g) => {
    const idTarget = temaDari(g, modeAktif);
    return DAFTAR_TEMA.find((t) => t.id === idTarget) ?? DAFTAR_TEMA[0];
  });

  return (
    <div className={cn("flex shrink-0 items-center gap-0.5", className)}>
      <button
        type="button"
        onClick={() => aturTema(balikModeTema(tema))}
        aria-label={labelBalikMode}
        title={labelBalikMode}
        className="ikon-abu relative flex size-9 items-center justify-center rounded-full text-judul transition-colors hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-ring sm:size-10"
      >
        {sedangSiang ? (
          <MoonIcon className="size-5" aria-hidden />
        ) : (
          <SunIcon className="size-5" aria-hidden />
        )}
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Tampilan aplikasi (${aktif.nama})`}
          title={`Tampilan aplikasi: ${aktif.nama}`}
          className="ikon-abu relative flex size-9 items-center justify-center rounded-full text-judul transition-colors hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-ring sm:size-10"
        >
          <PaletteIcon className="size-5" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 min-w-64 rounded-2xl">
          <DropdownMenuLabel>Tampilan Aplikasi</DropdownMenuLabel>
          <div className="px-1.5 pb-1.5 pt-0.5">
            <div
              role="group"
              aria-label="Mode pencahayaan"
              className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1"
            >
              <button
                type="button"
                aria-pressed={sedangSiang}
                onClick={() => aturTema(temaDari(gayaAktif, "siang"))}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                  sedangSiang
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <SunIcon className="size-3.5" aria-hidden />
                Siang
              </button>
              <button
                type="button"
                aria-pressed={!sedangSiang}
                onClick={() => aturTema(temaDari(gayaAktif, "malam"))}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                  !sedangSiang
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <MoonIcon className="size-3.5" aria-hidden />
                Malam
              </button>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-[0.7rem] uppercase tracking-wide">Gaya Tema</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={gayaAktif}
            onValueChange={(v) => aturTema(gantiGayaTema(tema, v === "langit" ? "langit" : "notion"))}
          >
            {opsiGaya.map((t) => (
              <DropdownMenuRadioItem key={t.gaya} value={t.gaya} className="cursor-pointer py-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex shrink-0 items-center -space-x-1" aria-hidden>
                    <span
                      className="size-4 rounded-full ring-1 ring-foreground/30"
                      style={{ backgroundColor: t.warna.background }}
                      title={`Latar ${t.warna.background}`}
                    />
                    <span
                      className="size-4 rounded-full ring-1 ring-foreground/30"
                      style={{ backgroundColor: t.warna.foreground }}
                      title={`Teks ${t.warna.foreground}`}
                    />
                    <span
                      className="size-4 rounded-full ring-1 ring-foreground/30"
                      style={{ backgroundColor: t.warna.accent }}
                      title={`Aksen ${t.warna.accent}`}
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
    </div>
  );
}
