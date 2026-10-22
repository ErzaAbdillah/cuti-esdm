import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FormMasuk } from "@/components/auth/form-masuk";
import { penggunaSaatIni } from "@/server/auth/pengguna";

export const metadata: Metadata = { title: "Masuk" };

export default async function HalamanMasuk({ searchParams }: PageProps<"/login">) {
  if (await penggunaSaatIni()) redirect("/beranda");
  const { lanjut } = await searchParams;

  return (
    <>
      <h2 className="text-xl font-bold text-judul">Masuk</h2>
      <p className="mb-5 mt-1 text-sm text-muted-foreground">Gunakan NIP dan password akun Anda.</p>
      <FormMasuk lanjut={typeof lanjut === "string" ? lanjut : undefined} />
    </>
  );
}
