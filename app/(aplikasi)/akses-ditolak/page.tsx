import { ShieldXIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { wajibLogin } from "@/server/auth/pengguna";

export const metadata: Metadata = { title: "Akses ditolak" };

export default async function AksesDitolak() {
  await wajibLogin();
  return (
    <Card className="mx-auto mt-6 max-w-lg">
      <CardHeader className="items-center text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-100 text-merah">
          <ShieldXIcon className="size-6" />
        </span>
        <CardTitle className="text-judul">Akses ditolak</CardTitle>
        <CardDescription>Halaman ini hanya untuk peran tertentu. Hubungi Admin bila Anda seharusnya punya akses.</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Button asChild>
          <Link href="/beranda">Kembali ke Beranda</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
