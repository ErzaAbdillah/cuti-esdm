import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FormAktivasi } from "@/components/auth/form-aktivasi";
import { Pemisah, TombolGoogle } from "@/components/auth/tombol-google";
import { googleAktif } from "@/server/auth/google";
import { penggunaSaatIni } from "@/server/auth/pengguna";

export const metadata: Metadata = { title: "Aktivasi Akun" };

export default async function HalamanAktivasi() {
  if (await penggunaSaatIni()) redirect("/beranda");
  const adaGoogle = googleAktif();

  return (
    <>
      <h2 className="text-xl font-bold text-judul">Aktivasi akun</h2>
      <p className="mb-5 mt-1 text-sm text-muted-foreground">
        {adaGoogle ? "Cara termudah: daftar dengan akun Google, lalu cocokkan NIP sekali saja." : "Buat password untuk akun Anda. NIP dan NIK dicocokkan dengan data kepegawaian."}
      </p>
      {adaGoogle && (
        <div className="mb-4 grid gap-4">
          <TombolGoogle>Daftar dengan Google</TombolGoogle>
          <Pemisah teks="atau buat password" />
        </div>
      )}
      <FormAktivasi />
    </>
  );
}
