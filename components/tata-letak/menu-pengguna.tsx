"use client";

import { ChevronDownIcon, LogOutIcon, UserIcon } from "lucide-react";
import Link from "next/link";
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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={`Menu akun ${nama}`} className="flex items-center gap-2 rounded-xl px-1.5 py-1 text-left hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-ring">
        <Avatar className="size-9">
          {fotoUrl && <AvatarImage key={fotoUrl} src={fotoUrl} alt={nama} />}
          <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">{inisialNama(nama)}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-56 leading-tight md:block">
          <span className="block truncate text-sm font-semibold text-judul">{nama}</span>
          <span className="block truncate text-xs text-slate-600">{keterangan}</span>
        </span>
        <ChevronDownIcon className="hidden size-4 text-slate-500 md:block" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="md:hidden">
          <span className="block truncate">{nama}</span>
          <span className="block truncate text-xs font-normal text-muted-foreground">{keterangan}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="md:hidden" />
        <DropdownMenuItem asChild>
          <Link href="/profil">
            <UserIcon /> Profil &amp; password
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={keluar}>
          <DropdownMenuItem asChild variant="destructive">
            <button type="submit" className="w-full">
              <LogOutIcon /> Keluar
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
