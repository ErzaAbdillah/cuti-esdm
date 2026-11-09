import Image from "next/image";
import { TombolTema } from "@/components/tata-letak/tombol-tema";

export default function LayoutPublik({ children }: LayoutProps<"/">) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center px-4 py-14 sm:py-12">
      <div className="fixed right-4 top-4 z-20 sm:right-6 sm:top-5">
        <TombolTema />
      </div>
      <div className="grid w-full max-w-4xl items-center gap-8 md:grid-cols-[1fr_minmax(0,26rem)] md:gap-12">
        <section className="flex flex-col items-center text-center md:items-start md:text-left">
          <Image
            src="/lambang-kalsel.png"
            alt="Lambang Provinsi Kalimantan Selatan"
            width={120}
            height={168}
            priority
            className="h-28 w-auto drop-shadow-md md:h-40"
          />
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-judul md:text-4xl">Layanan Cuti ESDM Kalsel</h1>
          <p className="mt-2 max-w-sm text-sm text-slate-700 md:text-base">
            Layanan cuti dan dokumen pegawai Dinas Energi dan Sumber Daya Mineral Provinsi Kalimantan Selatan.
          </p>
        </section>
        <section className="kaca rounded-2xl p-5 sm:p-7">{children}</section>
      </div>
    </main>
  );
}
