import { ConstructionIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Penanda modul yang dibangun pada tahap berikutnya (lihat docs/RANCANGAN.md §10). */
export function SegeraHadir({ judul, tahap, isi }: { judul: string; tahap: number; isi: string }) {
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold tracking-tight text-judul">{judul}</h1>
      <Card className="max-w-2xl">
        <CardHeader className="flex flex-row items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
            <ConstructionIcon className="size-5" />
          </span>
          <div>
            <CardTitle className="text-judul">Sedang dibangun — tahap {tahap}</CardTitle>
            <CardDescription>Akses halaman ini sudah dibatasi sesuai peran.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-slate-700">{isi}</CardContent>
      </Card>
    </div>
  );
}
