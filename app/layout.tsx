import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { connection } from "next/server";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Absensi & Cuti ESDM Kalsel", template: "%s · Absensi & Cuti ESDM Kalsel" },
  description: "Aplikasi internal daftar hadir dan cuti pegawai Dinas ESDM Provinsi Kalimantan Selatan.",
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
  return (
    <html lang="id" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full">
        <div className="latar-langit" aria-hidden />
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
