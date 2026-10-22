import type { Metadata } from "next";
import { FormFolder, FormFolderBaru } from "@/components/admin/form-folder";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { wajibPeran } from "@/server/auth/pengguna";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Folder Dokumen" };

export default async function FolderDokumen() {
  await wajibPeran("ADMIN");
  const folder = await db.folderDokumen.findMany({
    include: { akses: true, _count: { select: { dokumen: true, anak: true } } },
    orderBy: [{ urutan: "asc" }, { nama: "asc" }],
  });
  const utama = folder.filter((f) => !f.parentId);
  const urut = utama.flatMap((u) => [u, ...folder.filter((f) => f.parentId === u.id)]);

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-judul">Folder dokumen organisasi</h1>
        <p className="text-sm text-slate-700">
          <b>Lihat</b>: membuka & mencetak dokumen. <b>Kelola</b>: mengunggah, mengganti nama, dan menghapus. Admin selalu dapat mengelola semua folder.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-judul">Folder baru</CardTitle>
        </CardHeader>
        <CardContent>
          <FormFolderBaru induk={utama.map((f) => ({ id: f.id, nama: f.nama }))} />
        </CardContent>
      </Card>
      {urut.map((f) => (
        <Card key={f.id} className={f.parentId ? "md:ml-8" : undefined}>
          <CardHeader>
            <CardTitle className="text-judul">
              {f.parentId ? "↳ " : ""}
              {f.nama} <span className="text-sm font-normal text-slate-600">· {f._count.dokumen} dokumen</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormFolder f={{ id: f.id, nama: f.nama, jumlah: f._count.dokumen + f._count.anak, akses: Object.fromEntries(f.akses.map((a) => [a.peran, { lihat: a.bolehLihat, kelola: a.bolehKelola }])) }} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
