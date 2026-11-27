"use client";

import { CalendarIcon, CheckIcon, ChevronDownIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function FilterTahunBeranda({
  tahun,
  daftarTahun,
}: {
  tahun: number;
  daftarTahun: readonly number[];
}) {
  const router = useRouter();
  const [memuat, mulaiTransisi] = useTransition();

  function pilihTahun(t: number) {
    if (t === tahun) return;
    mulaiTransisi(() => {
      router.push(`/beranda?tahun=${t}`);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={memuat}
          aria-label={`Pilih tahun data beranda, saat ini tahun ${tahun}`}
          className="bg-white/80 font-semibold text-judul"
        >
          <CalendarIcon data-icon="inline-start" className="size-4" aria-hidden />
          <span>Tahun {tahun}</span>
          <ChevronDownIcon data-icon="inline-end" className="size-3.5 opacity-75" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 min-w-44 rounded-2xl p-1.5">
        <DropdownMenuLabel>Tahun Laporan</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {daftarTahun.map((t) => {
          const aktif = t === tahun;
          return (
            <DropdownMenuItem
              key={t}
              onSelect={() => pilihTahun(t)}
              className={cn(
                "cursor-pointer justify-between rounded-xl px-3 py-2 text-sm font-medium",
                aktif && "bg-accent font-semibold text-judul",
              )}
            >
              <span>Tahun {t}</span>
              {aktif && <CheckIcon className="size-4 text-primary" aria-hidden />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
