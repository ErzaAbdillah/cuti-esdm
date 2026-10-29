import { TriangleAlertIcon } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FormMasuk } from "@/components/auth/form-masuk";
import { Pemisah, TombolGoogle } from "@/components/auth/tombol-google";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { googleAktif } from "@/server/auth/google";
import { penggunaSaatIni } from "@/server/auth/pengguna";

export const metadata: Metadata = { title: "Masuk" };

const PESAN_GOOGLE: Record<string, string> = {
  gagal: "Masuk dengan Google gagal atau dibatalkan. Silakan coba lagi.",
  nonaktif: "Masuk dengan Google belum diaktifkan. Gunakan NIP dan password.",
  "nonaktif-akun": "Akun Anda tidak aktif. Hubungi Admin.",
};

export default async function HalamanMasuk({ searchParams }: PageProps<"/login">) {
  if (await penggunaSaatIni()) redirect("/beranda");
  const { lanjut, google } = await searchParams;
  const pesan = typeof google === "string" ? PESAN_GOOGLE[google] : undefined;
  const adaGoogle = googleAktif();

  return (
    <>
      <h2 className="text-xl font-bold text-judul">Masuk</h2>
      <p className="mb-5 mt-1 text-sm text-muted-foreground">{adaGoogle ? "Masuk dengan akun Google, atau dengan NIP dan password." : "Gunakan NIP dan password akun Anda."}</p>
      {pesan && (
        <Alert variant="destructive" role="alert" className="mb-4">
          <TriangleAlertIcon />
          <AlertDescription>{pesan}</AlertDescription>
        </Alert>
      )}
      {adaGoogle && (
        <div className="mb-4 grid gap-4">
          <TombolGoogle>Masuk dengan Google</TombolGoogle>
          <Pemisah teks="atau dengan NIP" />
        </div>
      )}
      <FormMasuk lanjut={typeof lanjut === "string" ? lanjut : undefined} google={adaGoogle} />
    </>
  );
}
