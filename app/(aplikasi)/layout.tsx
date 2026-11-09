import { BellIcon } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { MenuPengguna } from "@/components/tata-letak/menu-pengguna";
import { MenuSeluler, SidebarDesktop } from "@/components/tata-letak/navigasi";
import { PenyediaTema, TombolTema } from "@/components/tata-letak/tombol-tema";
import { menuUntuk } from "@/lib/menu";
import { LABEL_PERAN } from "@/lib/peran";
import { KUKI_TEMA, normalisasiTema } from "@/lib/tema";
import { wajibLogin } from "@/server/auth/pengguna";
import { db } from "@/server/db";

export default async function LayoutAplikasi({ children }: LayoutProps<"/">) {
  // Halaman di dalamnya tetap memanggil wajibLogin/wajibPeran sendiri.
  const u = await wajibLogin({ lewatiWajibGanti: true });
  const kuki = await cookies();
  const tema = normalisasiTema(kuki.get(KUKI_TEMA)?.value);
  const menu = menuUntuk(u.peran);
  const belumDibaca = await db.notifikasi.count({ where: { userId: u.userId, dibacaPada: null } });

  const nama = u.pegawai?.namaLengkap ?? u.loginId;
  const keterangan =
    u.pegawai?.unit ??
    [...u.peran]
      .map((p) => LABEL_PERAN[p])
      .join(", ");

  return (
    <PenyediaTema awal={tema}>
      <div className="min-h-dvh lg:pl-66">
        <SidebarDesktop menu={menu} />
        <header className="sticky top-0 z-20 px-4 pt-3 sm:px-6">
          <div className="kaca flex h-14 items-center gap-2 rounded-2xl px-2 sm:px-3">
            <MenuSeluler menu={menu} />
            <div className="min-w-0 flex-1 lg:hidden">
              <p className="truncate text-sm font-bold text-judul">Layanan Cuti ESDM</p>
            </div>
            <div className="hidden flex-1 lg:block" />
            <TombolTema />
            <Link
              href="/notifikasi"
              className="relative flex size-10 items-center justify-center rounded-xl text-judul hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-ring"
              aria-label={belumDibaca > 0 ? `Notifikasi, ${belumDibaca} belum dibaca` : "Notifikasi"}
            >
              <BellIcon className="size-5" />
              {belumDibaca > 0 && (
                <span className="absolute right-1 top-1 min-w-4.5 rounded-full bg-merah px-1 text-center text-[0.65rem] font-bold leading-4.5 text-white">
                  {belumDibaca > 99 ? "99+" : belumDibaca}
                </span>
              )}
            </Link>
            <MenuPengguna nama={nama} keterangan={keterangan} />
          </div>
        </header>
        <main id="konten" className="mx-auto w-full max-w-7xl px-4 pb-10 pt-5 sm:px-6">
          {children}
        </main>
      </div>
    </PenyediaTema>
  );
}
