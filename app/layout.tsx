import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { PenyediaTema } from "@/components/tata-letak/tombol-tema";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { KUKI_TEMA, normalisasiTema } from "@/lib/tema";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Layanan Cuti ESDM Kalsel", template: "%s · Layanan Cuti ESDM Kalsel" },
  description: "Aplikasi internal cuti dan dokumen pegawai Dinas ESDM Provinsi Kalimantan Selatan.",
  icons: { icon: "/lambang-kalsel.png" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0ea5e9",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Semua halaman dirender dinamis agar skrip Next.js mendapat nonce CSP dari proxy.ts.
  await connection();
  const kuki = await cookies();
  const tema = normalisasiTema(kuki.get(KUKI_TEMA)?.value);
  return (
    <html lang="id" data-tema={tema} className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full">
        <div className="latar-langit" aria-hidden />
        <PenyediaTema awal={tema}>
          <TooltipProvider>{children}</TooltipProvider>
        </PenyediaTema>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
