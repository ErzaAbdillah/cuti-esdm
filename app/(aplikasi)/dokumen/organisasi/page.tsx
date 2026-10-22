import { ArrowLeftIcon, FolderIcon, SearchIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DaftarDokumen } from "@/components/dokumen/daftar-dokumen";
import { FormUnggah } from "@/components/dokumen/form-unggah";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { unggahDokumenOrganisasi } from "@/server/aksi/dokumen";
import { wajibLogin } from "@/server/auth/pengguna";
import { db } from "@/server/db";
import { folderTerlihat } from "@/server/layanan/akses-dokumen";
import { semuaPengaturan } from "@/server/pengaturan";

export const metadata: Metadata = { title: "Dokumen Organisasi" };

export default async function DokumenOrganisasi({ searchParams }: PageProps<"/dokumen/organisasi">) {
  const u = await wajibLogin();
  const sp = await searchParams;
  const folderId = typeof sp.folder === "string" ? sp.folder : null;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const terlihat = await folderTerlihat(u);
  const aktif = folderId ? terlihat.find((f) => f.id === folderId) : null;
  if (folderId && !aktif) notFound();

  // Tanpa folder: daftar folder utama (atau hasil pencarian di semua folder yang boleh dilihat).
  const anak = terlihat.filter((f) => f.parentId === (aktif?.id ?? null));
  const idCari = aktif ? [aktif.id, ...anak.map((f) => f.id)] : terlihat.map((f) => f.id);
  const tampilDokumen = !!aktif || !!q;
  const [dokumen, peng] = await Promise.all([
    tampilDokumen
      ? db.dokumen.findMany({
          where: { ruang: "ORGANISASI", dihapusPada: null, folderId: q ? { in: idCari } : aktif!.id, ...(q ? { namaTampilan: { contains: q, mode: "insensitive" } } : {}) },
          orderBy: { diunggahPada: "desc" },
          take: 300,
        })
      : [],
    semuaPengaturan(),
  ]);
  const kelola = new Map(terlihat.map((f) => [f.id, f.kelola]));
  const induk = aktif?.parentId ? terlihat.find((f) => f.id === aktif.parentId) : null;

  return (
    <div className="grid gap-5">
      <div>
        {aktif && (
          <Link href={induk ? `/dokumen/organisasi?folder=${induk.id}` : "/dokumen/organisasi"} className="mb-1 inline-flex items-center gap-1 text-sm text-primary hover:underline">
            <ArrowLeftIcon className="size-4" /> {induk?.nama ?? "Semua folder"}
          </Link>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-judul">{aktif?.nama ?? "Dokumen Organisasi"}</h1>
        <p className="text-sm text-slate-700">SK, peta jabatan, notulen, dan dokumen dinas lainnya sesuai hak akses peran Anda.</p>
      </div>

      <form className="flex flex-wrap gap-2" role="search">
        {aktif && <input type="hidden" name="folder" value={aktif.id} />}
        <Input name="q" defaultValue={q} placeholder={aktif ? `Cari di ${aktif.nama}` : "Cari di semua folder"} aria-label="Cari dokumen" className="h-10 min-w-0 flex-1 bg-white sm:max-w-xs" />
        <Button type="submit" variant="outline" className="h-10 bg-white/70">
          <SearchIcon data-icon="inline-start" /> Cari
        </Button>
      </form>

      {anak.length > 0 && !q && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {anak.map((f) => (
            <Link key={f.id} href={`/dokumen/organisasi?folder=${f.id}`} className="rounded-xl focus-visible:outline-2 focus-visible:outline-ring">
              <Card className="h-full transition-shadow hover:shadow-lg">
                <CardContent className="flex items-center gap-3">
                  <FolderIcon className="size-8 text-brand" aria-hidden />
                  <div className="grid">
                    <span className="font-semibold text-judul">{f.nama}</span>
                    <span className="text-xs text-slate-600">
                      {f._count.dokumen} dokumen{f.kelola ? " · Anda dapat mengelola" : ""}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
      {!aktif && !q && anak.length === 0 && <p className="text-sm text-slate-600">Belum ada folder yang dapat Anda lihat.</p>}

      {aktif?.kelola && !q && (
        <Card>
          <CardContent>
            <FormUnggah aksi={unggahDokumenOrganisasi.bind(null, aktif.id)} maksMb={Math.min(Number(peng.get("dokumen.maks_ukuran_mb")) || 10, 10)} />
          </CardContent>
        </Card>
      )}

      {tampilDokumen && (
        <Card className="py-0">
          <DaftarDokumen
            dokumen={dokumen.map((d) => ({ id: d.id, namaTampilan: d.namaTampilan, ekstensi: d.ekstensi, ukuran: d.ukuran, diunggahPada: d.diunggahPada, kategori: null, kelola: kelola.get(d.folderId ?? "") ?? false }))}
            kosong={q ? "Tidak ada dokumen yang cocok." : "Folder ini belum berisi dokumen."}
          />
        </Card>
      )}
    </div>
  );
}
