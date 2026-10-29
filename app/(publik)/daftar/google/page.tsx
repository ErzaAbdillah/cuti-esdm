import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FormGoogleBaru, FormGoogleLama, FormGooglePulihkan } from "@/components/auth/form-google";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { bacaIdentitasTertunda } from "@/server/auth/google";
import { penggunaSaatIni } from "@/server/auth/pengguna";

export const metadata: Metadata = { title: "Hubungkan Akun Google" };

/** Setelah memilih akun Google yang belum terhubung: cocokkan dengan data pegawai sekali saja. */
export default async function HubungkanGoogle({ searchParams }: PageProps<"/daftar/google">) {
  if (await penggunaSaatIni()) redirect("/beranda");
  const g = await bacaIdentitasTertunda();
  if (!g) redirect("/login?google=gagal");
  // Datang dari "Atur ulang dengan Google": langsung buka tab lupa password.
  const { lupa } = await searchParams;

  return (
    <>
      <h2 className="text-xl font-bold text-judul">Hubungkan akun Google</h2>
      <p className="mb-5 mt-1 text-sm text-muted-foreground">
        <b className="text-slate-900">{g.email}</b> belum terhubung ke data pegawai. Lakukan sekali ini saja; berikutnya cukup klik “Masuk dengan Google”.
      </p>
      <Tabs defaultValue={lupa ? "lupa" : "baru"}>
        <TabsList className="mb-4 grid w-full grid-cols-3 bg-white/60">
          <TabsTrigger value="baru">Belum punya akun</TabsTrigger>
          <TabsTrigger value="lama">Sudah punya akun</TabsTrigger>
          <TabsTrigger value="lupa">Lupa password</TabsTrigger>
        </TabsList>
        <TabsContent value="baru">
          <FormGoogleBaru />
        </TabsContent>
        <TabsContent value="lama">
          <FormGoogleLama />
        </TabsContent>
        <TabsContent value="lupa">
          <p className="mb-4 text-sm text-muted-foreground">
            Sudah punya akun tapi lupa password? Buktikan dengan NIP dan NIK, lalu buat password baru. Tidak perlu menghubungi Admin.
          </p>
          <FormGooglePulihkan />
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
