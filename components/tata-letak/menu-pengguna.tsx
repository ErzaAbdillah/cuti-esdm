"use client";

import { ChevronDownIcon, DownloadIcon, LogOutIcon, UserIcon } from "lucide-react";
import Link from "next/link";
import { DialogPanduanPasang, usePasangAplikasi } from "@/components/tata-letak/pasang-aplikasi";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { inisialNama } from "@/lib/foto-profil";
import { keluar } from "@/server/aksi/auth";

export function MenuPengguna({ nama, keterangan, fotoUrl }: { nama: string; keterangan: string; fotoUrl?: string | null }) {
  const { tampil: tampilPasang, perangkat, bukaPanduan, setBukaPanduan, picuPasang } = usePasangAplikasi();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger aria-label={`Menu akun ${nama}`} className="nav-abu flex items-center gap-2 rounded-full py-1 pl-1 pr-1 text-left transition-colors hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-ring md:pr-2.5">
          <Avatar className="size-9">
            {fotoUrl && <AvatarImage key={fotoUrl} src={fotoUrl} alt={nama} />}
            <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">{inisialNama(nama)}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-36 leading-tight md:block xl:max-w-48">
            <span className="block truncate text-sm font-semibold text-judul">{nama}</span>
            <span className="block truncate text-xs text-slate-600">{keterangan}</span>
          </span>
          <ChevronDownIcon className="hidden size-4 text-slate-500 md:block" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60 rounded-2xl p-1.5">
          <DropdownMenuLabel className="md:hidden">
            <span className="block truncate">{nama}</span>
            <span className="block truncate text-xs font-normal text-muted-foreground">{keterangan}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="md:hidden" />
          <DropdownMenuItem asChild className="rounded-xl px-2.5 py-2">
            <Link href="/profil">
              <UserIcon /> Profil &amp; password
            </Link>
          </DropdownMenuItem>
          {tampilPasang && (
            <DropdownMenuItem
              onSelect={() => {
                void picuPasang();
              }}
              className="cursor-pointer rounded-xl px-2.5 py-2"
            >
              <DownloadIcon /> Pasang Aplikasi
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <form action={keluar}>
            <DropdownMenuItem asChild variant="destructive" className="rounded-xl px-2.5 py-2">
              <button type="submit" className="w-full">
                <LogOutIcon /> Keluar
              </button>
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
      <DialogPanduanPasang buka={bukaPanduan} onOpenChange={setBukaPanduan} perangkat={perangkat} />
    </>
  );
}
