import { SearchIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { DaftarDokumen } from "@/components/dokumen/daftar-dokumen";
import { FormUnggah } from "@/components/dokumen/form-unggah";
import { Pilihan } from "@/components/form/pilihan";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { KATEGORI_PRIBADI, LABEL_KATEGORI } from "@/lib/dokumen";
import { namaLengkap } from "@/lib/domain/pegawai";
import type { KategoriDokumenPribadi } from "@/lib/generated/prisma/enums";
import { unggahDokumenPribadi } from "@/server/aksi/dokumen";
import { catatAudit } from "@/server/audit";
import { punyaHakAkses, punyaPeran, wajibLogin } from "@/server/auth/pengguna";
import { db } from "@/server/db";
import { semuaPengaturan } from "@/server/pengaturan";

export const metadata: Metadata = { title: "Dokumen Saya" };

/** Dokumen pribadi; Kepegawaian/Admin membuka milik pegawai lain lewat `?pegawai=`. */
export default async function DokumenSaya({ searchParams }: PageProps<"/dokumen">) {
  const u = await wajibLogin();
  const sp = await searchParams;
  const diminta = typeof sp.pegawai === "string" ? sp.pegawai : null;
  if (diminta && !/^[0-9a-f-]{36}$/i.test(diminta)) notFound();
  const lain = !!diminta && diminta !== u.pegawai?.id;
  if (lain && !punyaHakAkses(u, "KELOLA_PEGAWAI") && !punyaPeran(u, "KEPEGAWAIAN", "ADMIN")) redirect("/akses-ditolak");
  const pemilikId = diminta ?? u.pegawai?.id;
  if (!pemilikId) redirect("/akses-ditolak");
  const pemilik = lain ? await db.pegawai.findUnique({ where: { id: pemilikId } }) : null;
  if (lain && !pemilik) notFound();

  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const kat = KATEGORI_PRIBADI.includes(sp.kategori as KategoriDokumenPribadi) ? (sp.kategori as KategoriDokumenPribadi) : null;
  const [dokumen, peng] = await Promise.all([
    db.dokumen.findMany({
      where: { ruang: "PRIBADI", pemilikPegawaiId: pemilikId, dihapusPada: null, ...(kat ? { kategoriPribadi: kat } : {}), ...(q ? { namaTampilan: { contains: q, mode: "insensitive" } } : {}) },
      orderBy: [{ kategoriPribadi: "asc" }, { diunggahPada: "desc" }],
    }),
    semuaPengaturan(),
  ]);
  if (lain) await catatAudit({ userId: u.userId, aksi: "LIHAT_DOKUMEN_PEGAWAI", entitas: "pegawai", entitasId: pemilikId });
  const maksMb = Math.min(Number(peng.get("dokumen.maks_ukuran_mb")) || 10, 10);

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-judul">{lain ? `Dokumen ${namaLengkap(pemilik!)}` : "Dokumen Saya"}</h1>
        <p className="text-sm text-slate-700">SK, ijazah, KTP, KK, dan dokumen kepegawaian lain. Disimpan terenkripsi; hanya Anda, Kepegawaian, dan Admin yang bisa membuka.</p>
      </div>
      <Card>
        <CardContent>
          <FormUnggah aksi={unggahDokumenPribadi.bind(null, lain ? pemilikId : null)} kategori maksMb={maksMb} />
        </CardContent>
      </Card>
      <form className="flex flex-wrap gap-2" role="search">
        {lain && <input type="hidden" name="pegawai" value={pemilikId} />}
        <Input name="q" defaultValue={q} placeholder="Cari nama dokumen" aria-label="Cari nama dokumen" className="h-10 min-w-0 flex-1 bg-white sm:max-w-xs" />
        <Pilihan name="kategori" defaultValue={kat ?? ""} aria-label="Kategori" className="w-auto">
          <option value="">Semua kategori</option>
          {KATEGORI_PRIBADI.map((k) => (
            <option key={k} value={k}>
              {LABEL_KATEGORI[k]}
            </option>
          ))}
        </Pilihan>
        <Button type="submit" variant="outline" className="h-10 bg-white/70">
          <SearchIcon data-icon="inline-start" /> Cari
        </Button>
      </form>
      <Card className="py-0">
        <DaftarDokumen
          dokumen={dokumen.map((d) => ({ id: d.id, namaTampilan: d.namaTampilan, ekstensi: d.ekstensi, ukuran: d.ukuran, diunggahPada: d.diunggahPada, kategori: d.kategoriPribadi, kelola: true }))}
          kosong={q || kat ? "Tidak ada dokumen yang cocok." : "Belum ada dokumen. Unggah dokumen pertama di atas."}
        />
      </Card>
    </div>
  );
}
