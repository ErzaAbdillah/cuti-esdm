"use client";

import { CameraIcon, CircleCheckIcon, Trash2Icon, TriangleAlertIcon, UploadIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  ACCEPT_FOTO_PROFIL,
  inisialNama,
  MAKS_BYTE_FOTO_PROFIL,
  MAKS_BYTE_MENTAH_FOTO_PROFIL,
  periksaFotoProfil,
} from "@/lib/foto-profil";
import { hapusFotoProfil, unggahFotoProfil } from "@/server/aksi/profil";

const UKURAN_KOTAK = 512;

function canvasKeBlob(canvas: HTMLCanvasElement, mime: string, kualitas: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, mime, kualitas));
}

function muatGambar(file: File): Promise<{ sumber: CanvasImageSource; lebar: number; tinggi: number; tutup: () => void }> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file).then((bmp) => ({
      sumber: bmp,
      lebar: bmp.width,
      tinggi: bmp.height,
      tutup: () => bmp.close(),
    }));
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ sumber: img, lebar: img.naturalWidth, tinggi: img.naturalHeight, tutup: () => URL.revokeObjectURL(url) });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Gagal membaca gambar."));
    };
    img.src = url;
  });
}

/** Memotong foto menjadi persegi 512x512 di browser agar ringan disimpan & cepat dimuat. */
async function siapkanFotoPersegi(file: File): Promise<File> {
  if (file.size > MAKS_BYTE_MENTAH_FOTO_PROFIL) {
    throw new Error("Ukuran berkas foto terlalu besar (maksimal 10 MB sebelum dikecilkan).");
  }
  try {
    const gambar = await muatGambar(file);
    try {
      const sisi = Math.min(gambar.lebar, gambar.tinggi);
      const asalX = Math.floor((gambar.lebar - sisi) / 2);
      const asalY = Math.floor((gambar.tinggi - sisi) / 2);
      const target = Math.min(UKURAN_KOTAK, sisi);

      const canvas = document.createElement("canvas");
      canvas.width = target;
      canvas.height = target;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas tidak tersedia");

      ctx.drawImage(gambar.sumber, asalX, asalY, sisi, sisi, 0, 0, target, target);

      const webp = await canvasKeBlob(canvas, "image/webp", 0.86);
      if (webp && webp.type === "image/webp" && webp.size <= MAKS_BYTE_FOTO_PROFIL) {
        return new File([webp], "foto-profil.webp", { type: "image/webp" });
      }
      const jpeg = await canvasKeBlob(canvas, "image/jpeg", 0.86);
      if (jpeg && jpeg.size <= MAKS_BYTE_FOTO_PROFIL) {
        return new File([jpeg], "foto-profil.jpg", { type: "image/jpeg" });
      }
    } finally {
      gambar.tutup();
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("terlalu besar")) throw e;
  }

  // Fallback jika browser tidak mendukung canvas: gunakan berkas asli bila <= 2 MB.
  const buf = new Uint8Array(await file.arrayBuffer());
  const cek = periksaFotoProfil(file.name, buf, file.type);
  if (!cek.ok) throw new Error(cek.galat);
  return file;
}

export function FormFotoProfil({ nama, fotoUrl }: { nama: string; fotoUrl: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [sedangProses, startTransition] = useTransition();
  const [calon, setCalon] = useState<{ file: File; previewUrl: string } | null>(null);
  const [konfirmasiHapus, setKonfirmasiHapus] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (calon) URL.revokeObjectURL(calon.previewUrl);
    };
  }, [calon]);

  const sumberTampil = calon?.previewUrl ?? fotoUrl;

  async function pilihBerkas(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setGalat(null);
    setSukses(null);
    setKonfirmasiHapus(false);

    try {
      const siap = await siapkanFotoPersegi(file);
      const previewUrl = URL.createObjectURL(siap);
      setCalon({ file: siap, previewUrl });
    } catch (err) {
      setGalat(err instanceof Error ? err.message : "Berkas tidak dapat diproses sebagai foto.");
    }
  }

  function batalPilih() {
    setCalon(null);
    setGalat(null);
  }

  function simpanFoto() {
    if (!calon) return;
    setGalat(null);
    setSukses(null);
    const fd = new FormData();
    fd.set("foto", calon.file);

    startTransition(async () => {
      const res = await unggahFotoProfil({}, fd);
      if (res.galat) {
        setGalat(res.galat);
        return;
      }
      setCalon(null);
      setSukses(res.sukses ?? "Foto profil berhasil disimpan.");
      toast.success(res.sukses ?? "Foto profil berhasil disimpan.");
      router.refresh();
    });
  }

  function hapusFoto() {
    setGalat(null);
    setSukses(null);
    startTransition(async () => {
      const res = await hapusFotoProfil({});
      if (res.galat) {
        setGalat(res.galat);
        return;
      }
      setKonfirmasiHapus(false);
      setSukses(res.sukses ?? "Foto profil berhasil dihapus.");
      toast.success(res.sukses ?? "Foto profil berhasil dihapus.");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4">
      {galat && (
        <Alert variant="destructive" role="alert">
          <TriangleAlertIcon />
          <AlertDescription>{galat}</AlertDescription>
        </Alert>
      )}
      {sukses && (
        <Alert className="border-emerald-300 bg-emerald-50" role="status">
          <CircleCheckIcon className="text-emerald-700" />
          <AlertDescription className="text-emerald-900">{sukses}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <Avatar className="size-20 shrink-0 ring-2 ring-sky-100">
          {sumberTampil && <AvatarImage key={sumberTampil} src={sumberTampil} alt={`Foto profil ${nama}`} />}
          <AvatarFallback className="bg-primary text-lg font-semibold text-primary-foreground">
            {inisialNama(nama)}
          </AvatarFallback>
        </Avatar>

        <div className="grid min-w-0 flex-1 gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_FOTO_PROFIL}
            onChange={pilihBerkas}
            disabled={sedangProses}
            className="sr-only"
            aria-label="Pilih berkas foto profil"
          />

          {calon ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" onClick={simpanFoto} disabled={sedangProses}>
                <UploadIcon data-icon="inline-start" />
                {sedangProses ? "Menyimpan…" : "Simpan foto"}
              </Button>
              <Button type="button" variant="outline" onClick={batalPilih} disabled={sedangProses}>
                <XIcon data-icon="inline-start" />
                Batal
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => inputRef.current?.click()}
                disabled={sedangProses}
              >
                <CameraIcon data-icon="inline-start" />
                {fotoUrl ? "Ganti foto" : "Pilih foto"}
              </Button>
              {fotoUrl && !konfirmasiHapus && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-merah hover:bg-red-50 hover:text-merah"
                  onClick={() => setKonfirmasiHapus(true)}
                  disabled={sedangProses}
                >
                  <Trash2Icon data-icon="inline-start" />
                  Hapus foto
                </Button>
              )}
            </div>
          )}

          {konfirmasiHapus && !calon && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50/70 px-3 py-2 text-xs text-red-900">
              <span>Hapus foto profil dan kembali ke inisial nama?</span>
              <Button type="button" size="sm" variant="destructive" onClick={hapusFoto} disabled={sedangProses}>
                {sedangProses ? "Menghapus…" : "Ya, hapus"}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setKonfirmasiHapus(false)} disabled={sedangProses}>
                Batal
              </Button>
            </div>
          )}

          <p className="text-xs text-slate-600">
            {calon
              ? `Pratinjau siap disimpan (${Math.max(1, Math.round(calon.file.size / 1024))} KB). Klik Simpan foto untuk menerapkan.`
              : "Format JPG, PNG, atau WebP. Foto otomatis dirapikan berbentuk persegi agar cepat dimuat."}
          </p>
        </div>
      </div>
    </div>
  );
}
