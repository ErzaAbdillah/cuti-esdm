import { ArchiveRestoreIcon, CalendarXIcon, FileClockIcon, FolderLockIcon, FileSignatureIcon, type LucideIcon, ScrollTextIcon, SettingsIcon, UsersIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { wajibPeran } from "@/server/auth/pengguna";

export const metadata: Metadata = { title: "Admin" };

const MENU: { href: string; judul: string; isi: string; ikon: LucideIcon; tahap?: number }[] = [
  { href: "/admin/pengaturan", judul: "Pengaturan", isi: "Jam masuk, toleransi terlambat, batas alpa, hari kerja, jaringan kantor, kop instansi, aturan cuti.", ikon: SettingsIcon },
  { href: "/admin/hari-libur", judul: "Hari libur & cuti bersama", isi: "Daftar libur nasional, cuti bersama, dan libur daerah per tahun.", ikon: CalendarXIcon },
  { href: "/pegawai", judul: "Pengguna & akun", isi: "Reset password, buka kunci, nonaktifkan akun, dan peran — lewat tab Akun di detail pegawai.", ikon: UsersIcon },
  { href: "/admin/surat/template", judul: "Template surat & penandatangan", isi: "Template per eselon, pejabat penandatangan (termasuk Plt.), dan penomoran surat.", ikon: FileSignatureIcon },
  { href: "/admin/folder-dokumen", judul: "Folder dokumen", isi: "Folder dokumen organisasi dan hak lihat/kelola per peran.", ikon: FolderLockIcon },
  { href: "/admin/dokumen-terhapus", judul: "Dokumen terhapus", isi: "Pulihkan dokumen pribadi atau organisasi yang terhapus.", ikon: ArchiveRestoreIcon },
  { href: "/admin/master", judul: "Master data", isi: "Unit kerja, jabatan & kelas, mapping eselon, pangkat/golongan, jenis & aturan cuti.", ikon: ScrollTextIcon },
  { href: "/admin/audit-log", judul: "Audit log & log login", isi: "Jejak perubahan data, akses data sensitif, cetak, dan unduh dokumen.", ikon: FileClockIcon },
];

export default async function Admin() {
  await wajibPeran("ADMIN");
  return (
    <div className="grid gap-5">
      <h1 className="text-2xl font-bold tracking-tight text-judul">Admin</h1>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {MENU.map((m) => {
          const isi = (
            <Card className="h-full transition-shadow hover:shadow-lg">
              <CardHeader className="flex flex-row items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-primary">
                  <m.ikon className="size-5" />
                </span>
                <div className="grid gap-1">
                  <CardTitle className="text-judul">{m.judul}</CardTitle>
                  <CardDescription>
                    {m.tahap ? `Menyusul di tahap ${m.tahap}. ` : ""}
                    {m.isi}
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          );
          return m.tahap ? (
            <div key={m.judul} className="opacity-70">
              {isi}
            </div>
          ) : (
            <Link key={m.judul} href={m.href} className="rounded-xl focus-visible:outline-2 focus-visible:outline-ring">
              {isi}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
