import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { KUKI_TEMA, normalisasiTema, warnaBilahBrowser } from "@/lib/tema";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "Layanan Cuti ESDM Kalsel",
  title: { default: "Layanan Cuti ESDM Kalsel", template: "%s · Layanan Cuti ESDM Kalsel" },
  description: "Aplikasi internal cuti dan dokumen pegawai Dinas ESDM Provinsi Kalimantan Selatan.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/lambang-kalsel.png", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Cuti ESDM",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  robots: { index: false, follow: false },
};

export async function generateViewport(): Promise<Viewport> {
  const kuki = await cookies();
  const tema = normalisasiTema(kuki.get(KUKI_TEMA)?.value);
  return {
    themeColor: warnaBilahBrowser(tema),
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Semua halaman dirender dinamis agar skrip Next.js mendapat nonce CSP dari proxy.ts.
  await connection();
  const kuki = await cookies();
  const tema = normalisasiTema(kuki.get(KUKI_TEMA)?.value);
  return (
    <html lang="id" data-tema={tema} className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full">
        <div className="latar-langit" aria-hidden />
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
