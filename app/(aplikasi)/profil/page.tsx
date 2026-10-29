import { CircleCheckIcon, TriangleAlertIcon, UnlinkIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FormGantiPassword } from "@/components/auth/form-ganti-password";
import { TombolGoogle } from "@/components/auth/tombol-google";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LABEL_PERAN } from "@/lib/peran";
import { putuskanGoogle } from "@/server/aksi/auth";
import { bolehAturPassword, googleAktif } from "@/server/auth/google";
import { wajibLogin } from "@/server/auth/pengguna";
import { db } from "@/server/db";

const PESAN_GOOGLE: Record<string, [string, boolean]> = {
  terhubung: ["Akun Google berhasil dihubungkan. Berikutnya Anda bisa masuk dengan Google.", true],
  diputus: ["Akun Google sudah diputus dari akun ini.", true],
  dipakai: ["Akun Google itu sudah terhubung ke akun pegawai lain.", false],
};

export const metadata: Metadata = { title: "Profil" };

export default async function Profil({ searchParams }: PageProps<"/profil">) {
  const u = await wajibLogin({ lewatiWajibGanti: true });
  const { wajib, atur, google } = await searchParams;
  const [akun, bolehAtur] = await Promise.all([db.user.findUniqueOrThrow({ where: { id: u.userId }, select: { googleEmail: true } }), bolehAturPassword(u.userId)]);
  const aturUlang = atur === "1" && bolehAtur;
  const pesanGoogle = typeof google === "string" ? PESAN_GOOGLE[google] : undefined;

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

      {pesanGoogle && (
        <Alert className={pesanGoogle[1] ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"} role="status">
          {pesanGoogle[1] ? <CircleCheckIcon className="text-emerald-700" /> : <TriangleAlertIcon className="text-merah" />}
          <AlertDescription className={pesanGoogle[1] ? "text-emerald-900" : "text-red-900"}>{pesanGoogle[0]}</AlertDescription>
        </Alert>
      )}

      {(wajib === "1" || u.wajibGantiPassword) && !aturUlang && (
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
            <CardDescription>
              Perubahan data diri dilakukan oleh Kepegawaian.
              {u.pegawai && (
                <>
                  {" "}
                  <Link href={`/pegawai/${u.pegawai.id}`} className="font-semibold text-primary hover:underline">
                    Lihat data kepegawaian lengkap
                  </Link>
                </>
              )}
            </CardDescription>
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
            <CardTitle className="text-judul">{aturUlang ? "Buat password baru" : "Ganti password"}</CardTitle>
            <CardDescription>
              {aturUlang ? "Anda masuk lewat Google, jadi password lama tidak diperlukan. " : ""}Setelah diganti, sesi di perangkat lain otomatis keluar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormGantiPassword tanpaPasswordLama={aturUlang} />
          </CardContent>
        </Card>
        {googleAktif() && (
          <Card>
            <CardHeader>
              <CardTitle className="text-judul">Akun Google</CardTitle>
              <CardDescription>Hubungkan Google agar bisa masuk tanpa password dan mengatur ulang password bila lupa.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {akun.googleEmail ? (
                <>
                  <p className="text-sm text-slate-800">
                    Terhubung dengan <b>{akun.googleEmail}</b>
                  </p>
                  <form action={putuskanGoogle}>
                    <Button type="submit" variant="outline" className="bg-white">
                      <UnlinkIcon data-icon="inline-start" /> Putuskan Google
                    </Button>
                  </form>
                </>
              ) : (
                <TombolGoogle mode="hubungkan">Hubungkan akun Google</TombolGoogle>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
