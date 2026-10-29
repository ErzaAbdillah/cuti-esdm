import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FormGoogleBaru, FormGoogleLama } from "@/components/auth/form-google";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { bacaIdentitasTertunda } from "@/server/auth/google";
import { penggunaSaatIni } from "@/server/auth/pengguna";

export const metadata: Metadata = { title: "Hubungkan Akun Google" };

/** Setelah memilih akun Google yang belum terhubung: cocokkan dengan data pegawai sekali saja. */
export default async function HubungkanGoogle() {
  if (await penggunaSaatIni()) redirect("/beranda");
  const g = await bacaIdentitasTertunda();
  if (!g) redirect("/login?google=gagal");

  return (
    <>
      <h2 className="text-xl font-bold text-judul">Hubungkan akun Google</h2>
      <p className="mb-5 mt-1 text-sm text-muted-foreground">
        <b className="text-slate-900">{g.email}</b> belum terhubung ke data pegawai. Lakukan sekali ini saja; berikutnya cukup klik “Masuk dengan Google”.
      </p>
      <Tabs defaultValue="baru">
        <TabsList className="mb-4 grid w-full grid-cols-2 bg-white/60">
          <TabsTrigger value="baru">Belum punya akun</TabsTrigger>
          <TabsTrigger value="lama">Sudah punya akun</TabsTrigger>
        </TabsList>
        <TabsContent value="baru">
          <FormGoogleBaru />
        </TabsContent>
        <TabsContent value="lama">
          <FormGoogleLama />
          <p className="mt-3 text-xs text-muted-foreground">Lupa password akun lama? Minta Admin mereset password, lalu hubungkan Google dengan password sementara.</p>
        </TabsContent>
      </Tabs>
      <p className="mt-5 text-center text-sm text-muted-foreground">
        Bukan akun yang benar?{" "}
        <a href="/api/auth/google?mode=masuk" className="font-semibold text-primary underline-offset-4 hover:underline">
          Pilih akun Google lain
        </a>{" "}
        ·{" "}
        <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
          Kembali
        </Link>
      </p>
    </>
  );
}
