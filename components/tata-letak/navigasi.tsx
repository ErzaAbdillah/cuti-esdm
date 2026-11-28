"use client";

import {
  CheckIcon,
  ChevronDownIcon,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { GrupMenu, NamaIkon } from "@/lib/menu";
import { cn } from "@/lib/utils";

const IKON: Record<NamaIkon, LucideIcon> = {
  beranda: HomeIcon,
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

function MerekLaci() {
  return (
    <Link href="/beranda" className="flex items-center gap-3 rounded-xl px-2 py-1 focus-visible:outline-2 focus-visible:outline-ring">
      <Image src="/lambang-kalsel.png" alt="" width={36} height={50} className="h-11 w-auto" />
      <span className="leading-tight">
        <span className="block text-sm font-bold text-judul">Cuti ESDM</span>
        <span className="block text-xs font-medium text-slate-600">Dinas ESDM Kalsel</span>
      </span>
    </Link>
  );
}

/** Lambang & nama aplikasi di kiri bilah atas desktop (≥ lg). */
export function MerekAtas() {
  return (
    <Link
      href="/beranda"
      className="nav-abu hidden shrink-0 items-center gap-2 rounded-full px-2 py-1 focus-visible:outline-2 focus-visible:outline-ring lg:flex"
    >
      <Image src="/lambang-kalsel.png" alt="" width={26} height={36} className="h-8 w-auto" />
      <span className="leading-tight">
        <span className="block text-sm font-bold text-judul whitespace-nowrap">Cuti ESDM</span>
        <span className="hidden text-[0.68rem] font-medium text-muted-foreground whitespace-nowrap xl:block">
          Dinas ESDM Kalsel
        </span>
      </span>
    </Link>
  );
}

/** Menu kapsul di tengah bilah atas desktop (≥ lg), maks. 5 kapsul dengan dropdown untuk grup ≥ 2 item. */
export function NavigasiAtas({ menu }: { menu: GrupMenu[] }) {
  const pathname = usePathname();
  const aktif = hrefAktif(pathname, menu);

  return (
    <nav aria-label="Menu utama" className="hidden min-w-0 items-center justify-center gap-0.5 lg:flex xl:gap-1">
      {menu.map((g, i) => {
        if (g.item.length === 1) {
          const item = g.item[0];
          const Ikon = IKON[item.ikon];
          const sedangAktif = item.href === aktif;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={sedangAktif ? "page" : undefined}
              title={item.labelRingkas ? item.label : undefined}
              className={cn(
                "nav-abu inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-medium whitespace-nowrap text-slate-700 transition-colors hover:bg-sky-100 hover:text-judul focus-visible:outline-2 focus-visible:outline-ring xl:px-3.5 xl:text-sm",
                sedangAktif && "bg-primary text-primary-foreground shadow-xs hover:bg-primary hover:text-primary-foreground",
              )}
            >
              <Ikon className="size-4 shrink-0" aria-hidden />
              <span>{item.labelRingkas ?? item.label}</span>
            </Link>
          );
        }

        const grupAktif = g.item.some((item) => item.href === aktif);
        const IkonGrup = IKON[g.item[0].ikon];
        const labelGrup = g.judul ?? g.item[0].label;

        return (
          <DropdownMenu key={g.judul ?? i}>
            <DropdownMenuTrigger
              aria-label={`Menu ${labelGrup}`}
              className={cn(
                "nav-abu inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-medium whitespace-nowrap text-slate-700 transition-colors hover:bg-sky-100 hover:text-judul focus-visible:outline-2 focus-visible:outline-ring data-open:bg-sky-100 data-open:text-judul xl:px-3.5 xl:text-sm",
                grupAktif &&
                  "bg-primary text-primary-foreground shadow-xs hover:bg-primary hover:text-primary-foreground data-open:bg-primary data-open:text-primary-foreground",
              )}
            >
              <IkonGrup className="size-4 shrink-0" aria-hidden />
              <span>{labelGrup}</span>
              <ChevronDownIcon className="size-3.5 opacity-80" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" sideOffset={8} className="w-56 min-w-56 rounded-2xl p-1.5">
              {g.item.map((item) => {
                const IkonItem = IKON[item.ikon];
                const itemAktif = item.href === aktif;
                return (
                  <DropdownMenuItem
                    key={item.href}
                    asChild
                    className={cn(
                      "cursor-pointer rounded-xl px-3 py-2 text-sm font-medium",
                      itemAktif && "bg-accent font-semibold text-judul",
                    )}
                  >
                    <Link href={item.href} aria-current={itemAktif ? "page" : undefined}>
                      <IkonItem className="size-4 shrink-0" aria-hidden />
                      <span className="flex-1">{item.label}</span>
                      {itemAktif && <CheckIcon className="size-4 shrink-0 text-primary" aria-hidden />}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}
    </nav>
  );
}

function DaftarMenu({ menu, onPilih }: { menu: GrupMenu[]; onPilih?: () => void }) {
  const pathname = usePathname();
  const aktif = hrefAktif(pathname, menu);

  return (
    <nav aria-label="Menu seluler" className="grid gap-5">
      {menu.map((g, i) => (
        <div key={g.judul ?? i} className="grid gap-1">
          {g.judul && <p className="px-3.5 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-500">{g.judul}</p>}
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
                  "nav-abu flex items-center gap-3 rounded-full px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-sky-100 hover:text-judul focus-visible:outline-2 focus-visible:outline-ring",
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

/** Tombol menu + laci samping di layar kecil (< lg). */
export function MenuSeluler({ menu }: { menu: GrupMenu[] }) {
  const [buka, setBuka] = useState(false);
  return (
    <Sheet open={buka} onOpenChange={setBuka}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-lg" className="lg:hidden" aria-label="Buka menu">
          <MenuIcon className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="safe-laci w-72 overflow-y-auto bg-white/95 px-4">
        <SheetHeader className="p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <MerekLaci />
        </SheetHeader>
        <div className="mt-4">
          <DaftarMenu menu={menu} onPilih={() => setBuka(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
