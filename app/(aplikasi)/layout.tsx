import { BellIcon } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { MenuPengguna } from "@/components/tata-letak/menu-pengguna";
import { MenuSeluler, MerekAtas, NavigasiAtas } from "@/components/tata-letak/navigasi";
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
  const menu = menuUntuk(u.peran, u.hakAkses);
  const belumDibaca = await db.notifikasi.count({ where: { userId: u.userId, dibacaPada: null } });

  const nama = u.pegawai?.namaLengkap ?? u.loginId;
  const keterangan =
    u.pegawai?.unit ??
    [...u.peran]
      .map((p) => LABEL_PERAN[p])
      .join(", ");

  return (
    <PenyediaTema awal={tema}>
      <div className="min-h-dvh">
        <header className="sticky top-0 z-20 px-4 pt-3 sm:px-6">
          <div className="kaca mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-1.5 rounded-2xl px-1.5 sm:gap-2 sm:px-3 lg:h-15 lg:rounded-full lg:px-4">
            <div className="flex min-w-0 items-center gap-1 lg:shrink-0">
              <MenuSeluler menu={menu} />
              <Link href="/beranda" className="min-w-0 truncate text-sm font-bold text-judul focus-visible:outline-2 focus-visible:outline-ring lg:hidden">
                <span className="sm:hidden">Cuti ESDM</span>
                <span className="hidden sm:inline">Layanan Cuti ESDM</span>
              </Link>
              <MerekAtas />
            </div>

            <NavigasiAtas menu={menu} />

            <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
              <TombolTema />
              <Link
                href="/notifikasi"
                className="ikon-abu relative flex size-9 items-center justify-center rounded-full text-judul transition-colors hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-ring sm:size-10"
                aria-label={belumDibaca > 0 ? `Notifikasi, ${belumDibaca} belum dibaca` : "Notifikasi"}
              >
                <BellIcon className="size-5" />
                {belumDibaca > 0 && (
                  <span className="absolute right-1 top-1 min-w-4.5 rounded-full bg-red-600 px-1 text-center text-[0.65rem] font-bold leading-4.5 text-white">
                    {belumDibaca > 99 ? "99+" : belumDibaca}
                  </span>
                )}
              </Link>
              <MenuPengguna nama={nama} keterangan={keterangan} fotoUrl={u.fotoUrl} />
            </div>
          </div>
        </header>
        <main id="konten" className="mx-auto w-full max-w-7xl px-4 pb-10 pt-5 sm:px-6">
          {children}
        </main>
      </div>
    </PenyediaTema>
  );
}
