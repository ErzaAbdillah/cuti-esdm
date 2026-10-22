import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FormAktivasi } from "@/components/auth/form-aktivasi";
import { penggunaSaatIni } from "@/server/auth/pengguna";

export const metadata: Metadata = { title: "Aktivasi Akun" };

export default async function HalamanAktivasi() {
  if (await penggunaSaatIni()) redirect("/beranda");

  return (
    <>
      <h2 className="text-xl font-bold text-judul">Aktivasi akun</h2>
      <p className="mb-5 mt-1 text-sm text-muted-foreground">
        Buat password untuk akun Anda. NIP dan NIK dicocokkan dengan data kepegawaian.
      </p>
      <FormAktivasi />
    </>
  );
}
