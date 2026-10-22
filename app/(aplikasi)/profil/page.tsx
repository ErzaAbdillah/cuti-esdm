import { TriangleAlertIcon } from "lucide-react";
import type { Metadata } from "next";
import { FormGantiPassword } from "@/components/auth/form-ganti-password";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LABEL_PERAN } from "@/lib/peran";
import { wajibLogin } from "@/server/auth/pengguna";

export const metadata: Metadata = { title: "Profil" };

export default async function Profil({ searchParams }: PageProps<"/profil">) {
  const u = await wajibLogin({ lewatiWajibGanti: true });
  const { wajib } = await searchParams;

  const baris: [string, string | null | undefined][] = [
    ["Nama", u.pegawai?.namaLengkap ?? u.loginId],
    ["NIP / ID", u.pegawai?.nip ?? u.loginId],
    ["Jabatan", u.pegawai?.jabatan],
    ["Unit kerja", u.pegawai?.unit],
    ["Peran", [...u.peran].map((p) => LABEL_PERAN[p]).join(", ")],
  ];

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold tracking-tight text-judul">Profil &amp; password</h1>

      {(wajib === "1" || u.wajibGantiPassword) && (
        <Alert className="border-emas bg-amber-50">
          <TriangleAlertIcon className="text-amber-700" />
          <AlertTitle className="text-amber-950">Ganti password terlebih dahulu</AlertTitle>
          <AlertDescription className="text-amber-950">
            Password Anda baru direset Admin. Buat password baru sebelum memakai menu lain.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-judul">Data akun</CardTitle>
            <CardDescription>Perubahan data diri dilakukan oleh Kepegawaian.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm">
              {baris.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[7rem_1fr] gap-2">
                  <dt className="text-slate-600">{k}</dt>
                  <dd className="font-medium text-slate-900">{v || "-"}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-judul">Ganti password</CardTitle>
            <CardDescription>Setelah diganti, sesi di perangkat lain otomatis keluar.</CardDescription>
          </CardHeader>
          <CardContent>
            <FormGantiPassword />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
