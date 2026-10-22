"use client";

import { ChevronDownIcon, LogOutIcon, UserIcon } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { keluar } from "@/server/aksi/auth";

function inisial(nama: string): string {
  const kata = nama.replace(/^(H\.|Hj\.|Ir\.|Dr\.)\s*/i, "").split(/[\s,]+/).filter(Boolean);
  return ((kata[0]?.[0] ?? "") + (kata[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function MenuPengguna({ nama, keterangan }: { nama: string; keterangan: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={`Menu akun ${nama}`} className="flex items-center gap-2 rounded-xl px-1.5 py-1 text-left hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-ring">
        <Avatar className="size-9">
          <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">{inisial(nama)}</AvatarFallback>
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
