"use client";

import {
  CalendarCheckIcon,
  ClipboardListIcon,
  FileTextIcon,
  FolderOpenIcon,
  HomeIcon,
  type LucideIcon,
  MenuIcon,
  PlaneIcon,
  SettingsIcon,
  StampIcon,
  TableIcon,
  UsersIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { GrupMenu, NamaIkon } from "@/lib/menu";
import { cn } from "@/lib/utils";

const IKON: Record<NamaIkon, LucideIcon> = {
  beranda: HomeIcon,
  absen: CalendarCheckIcon,
  daftarHadir: ClipboardListIcon,
  rekap: TableIcon,
  cuti: PlaneIcon,
  proses: StampIcon,
  pegawai: UsersIcon,
  dokumen: FileTextIcon,
  folder: FolderOpenIcon,
  admin: SettingsIcon,
};

/** href paling spesifik yang cocok dengan path saat ini. */
function hrefAktif(pathname: string, menu: GrupMenu[]): string | undefined {
  return menu
    .flatMap((g) => g.item.map((i) => i.href))
    .filter((h) => pathname === h || pathname.startsWith(`${h}/`))
    .sort((a, b) => b.length - a.length)[0];
}

function Merek() {
  return (
    <Link href="/beranda" className="flex items-center gap-3 rounded-lg px-2 py-1 focus-visible:outline-2 focus-visible:outline-ring">
      <Image src="/lambang-kalsel.png" alt="" width={36} height={50} className="h-11 w-auto" />
      <span className="leading-tight">
        <span className="block text-sm font-bold text-judul">Absensi &amp; Cuti</span>
        <span className="block text-xs font-medium text-slate-600">Dinas ESDM Kalsel</span>
      </span>
    </Link>
  );
}

function DaftarMenu({ menu, onPilih }: { menu: GrupMenu[]; onPilih?: () => void }) {
  const pathname = usePathname();
  const aktif = hrefAktif(pathname, menu);

  return (
    <nav aria-label="Menu utama" className="grid gap-5">
      {menu.map((g, i) => (
        <div key={g.judul ?? i} className="grid gap-1">
          {g.judul && <p className="px-3 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-500">{g.judul}</p>}
          {g.item.map((item) => {
            const Ikon = IKON[item.ikon];
            const sedangAktif = item.href === aktif;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onPilih}
                aria-current={sedangAktif ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-sky-100 hover:text-judul focus-visible:outline-2 focus-visible:outline-ring",
                  sedangAktif && "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground",
                )}
              >
                <Ikon className="size-4 shrink-0" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

/** Sidebar tetap di desktop (≥ lg). */
export function SidebarDesktop({ menu }: { menu: GrupMenu[] }) {
  return (
    <aside className="kaca fixed inset-y-3 left-3 z-30 hidden w-60 flex-col gap-6 overflow-y-auto rounded-2xl p-4 lg:flex">
      <Merek />
      <DaftarMenu menu={menu} />
    </aside>
  );
}

/** Tombol menu + laci samping di layar kecil. */
export function MenuSeluler({ menu }: { menu: GrupMenu[] }) {
  const [buka, setBuka] = useState(false);
  return (
    <Sheet open={buka} onOpenChange={setBuka}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-lg" className="lg:hidden" aria-label="Buka menu">
          <MenuIcon className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 overflow-y-auto bg-white/95 p-4">
        <SheetHeader className="p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <Merek />
        </SheetHeader>
        <div className="mt-4">
          <DaftarMenu menu={menu} onPilih={() => setBuka(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
