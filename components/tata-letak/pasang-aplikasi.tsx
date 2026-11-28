"use client";

import { DownloadIcon, ShareIcon, SmartphoneIcon } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type JenisPerangkat = "ios" | "safari-mac" | "umum";

interface StatusPasang {
  terpasang: boolean;
  bisaLangsung: boolean;
  perangkat: JenisPerangkat;
}

const SNAPSHOT_SERVER: StatusPasang = {
  terpasang: true,
  bisaLangsung: false,
  perangkat: "umum",
};

let eventPasangTertunda: BeforeInstallPromptEvent | null = null;
let terpasangFlag = false;
let listenerTerdaftar = false;
let snapshotKlien: StatusPasang = SNAPSHOT_SERVER;
const pendengar = new Set<() => void>();

function deteksiPerangkat(): JenisPerangkat {
  if (typeof navigator === "undefined") return "umum";
  const ua = navigator.userAgent;
  const adalahIos =
    /iPad|iPhone|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (adalahIos) return "ios";
  const adalahSafariMac =
    /Macintosh/i.test(ua) && /Safari/i.test(ua) && !/Chrome|Chromium|Edg|OPR|Firefox/i.test(ua);
  if (adalahSafariMac) return "safari-mac";
  return "umum";
}

function cekTerpasang(): boolean {
  if (typeof window === "undefined") return true;
  if (terpasangFlag) return true;
  const navStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  const mediaStandalone =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;
  return navStandalone || mediaStandalone;
}

function perbaruiSnapshot() {
  const baru: StatusPasang = {
    terpasang: cekTerpasang(),
    bisaLangsung: eventPasangTertunda !== null,
    perangkat: deteksiPerangkat(),
  };
  if (
    snapshotKlien.terpasang !== baru.terpasang ||
    snapshotKlien.bisaLangsung !== baru.bisaLangsung ||
    snapshotKlien.perangkat !== baru.perangkat
  ) {
    snapshotKlien = baru;
    for (const fn of pendengar) fn();
  }
}

function pastikanListenerAktif() {
  if (listenerTerdaftar || typeof window === "undefined") return;
  listenerTerdaftar = true;
  perbaruiSnapshot();

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    eventPasangTertunda = e as BeforeInstallPromptEvent;
    perbaruiSnapshot();
  });

  window.addEventListener("appinstalled", () => {
    terpasangFlag = true;
    eventPasangTertunda = null;
    perbaruiSnapshot();
  });

  if (typeof window.matchMedia === "function") {
    const mq = window.matchMedia("(display-mode: standalone)");
    mq.addEventListener?.("change", perbaruiSnapshot);
  }
}

function langgananStatus(cb: () => void) {
  pastikanListenerAktif();
  pendengar.add(cb);
  return () => {
    pendengar.delete(cb);
  };
}

function ambilSnapshotKlien(): StatusPasang {
  pastikanListenerAktif();
  return snapshotKlien;
}

function ambilSnapshotServer(): StatusPasang {
  return SNAPSHOT_SERVER;
}

/** Hook terpusat: sembunyi otomatis saat mode aplikasi terpasang (standalone) & dukung 1-klik Chrome/Edge. */
export function usePasangAplikasi() {
  const status = useSyncExternalStore(langgananStatus, ambilSnapshotKlien, ambilSnapshotServer);
  const [bukaPanduan, setBukaPanduan] = useState(false);

  async function picuPasang() {
    if (eventPasangTertunda) {
      const ev = eventPasangTertunda;
      eventPasangTertunda = null;
      perbaruiSnapshot();
      try {
        await ev.prompt();
        const pilihan = await ev.userChoice;
        if (pilihan.outcome === "accepted") {
          terpasangFlag = true;
          perbaruiSnapshot();
        }
        return;
      } catch {
        // Bila dialog native tidak bisa muncul, tampilkan panduan 3 langkah.
      }
    }
    setBukaPanduan(true);
  }

  return {
    tampil: !status.terpasang,
    bisaLangsung: status.bisaLangsung,
    perangkat: status.perangkat,
    bukaPanduan,
    setBukaPanduan,
    picuPasang,
  };
}

/** Dialog panduan singkat 3 langkah ramah pemula untuk Safari iOS/Mac atau browser tanpa tombol 1-klik. */
export function DialogPanduanPasang({
  buka,
  onOpenChange,
  perangkat,
}: {
  buka: boolean;
  onOpenChange: (buka: boolean) => void;
  perangkat: JenisPerangkat;
}) {
  const judulPerangkat =
    perangkat === "ios"
      ? "iPhone / iPad (Safari)"
      : perangkat === "safari-mac"
        ? "Mac (Safari)"
        : "HP Android / Komputer (Chrome / Edge)";

  return (
    <Dialog open={buka} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-judul">
            <SmartphoneIcon className="size-4 text-primary" aria-hidden />
            Download Aplikasi Cuti ESDM
          </DialogTitle>
          <DialogDescription>
            Ikuti 3 langkah singkat untuk memasang aplikasi di <b>{judulPerangkat}</b>:
          </DialogDescription>
        </DialogHeader>

        {perangkat === "ios" ? (
          <ol className="grid gap-2.5 pl-5 text-sm text-foreground list-decimal">
            <li>
              Ketuk tombol <b>Bagikan</b> (<ShareIcon className="inline size-3.5 align-text-bottom" aria-hidden /> kotak
              dengan panah ke atas) di bagian bawah atau atas layar Safari.
            </li>
            <li>
              Geser ke bawah lalu pilih <b>Tambah ke Layar Utama</b> (<i>Add to Home Screen</i>).
            </li>
            <li>
              Ketuk <b>Tambah</b> di pojok kanan atas — ikon <b>Cuti ESDM</b> langsung muncul di layar utama HP Anda.
            </li>
          </ol>
        ) : perangkat === "safari-mac" ? (
          <ol className="grid gap-2.5 pl-5 text-sm text-foreground list-decimal">
            <li>
              Klik menu <b>File</b> di bilah atas layar Mac Anda.
            </li>
            <li>
              Pilih <b>Tambahkan ke Dock...</b> (<i>Add to Dock</i>).
            </li>
            <li>
              Klik <b>Tambahkan</b> — aplikasi <b>Cuti ESDM</b> siap dibuka langsung dari Dock.
            </li>
          </ol>
        ) : (
          <ol className="grid gap-2.5 pl-5 text-sm text-foreground list-decimal">
            <li>
              Klik ikon <b>Pasang</b> di ujung kanan kotak alamat browser, atau ketuk menu titik tiga (<b>⋮</b>) di pojok
              kanan atas.
            </li>
            <li>
              Pilih <b>Pasang aplikasi</b> (<i>Install app</i>) atau <b>Tambahkan ke layar utama</b>.
            </li>
            <li>
              Klik <b>Pasang</b> — ikon <b>Cuti ESDM</b> otomatis muncul di layar utama HP atau Desktop Anda.
            </li>
          </ol>
        )}

        <p className="rounded-xl bg-muted/70 px-3 py-2 text-xs text-muted-foreground">
          Aplikasi ini tidak menyimpan data pribadi di luar jaringan. Semua data cuti dan dokumen tetap aman di server
          dinas dan selalu mengikuti pembaruan terbaru.
        </p>

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Mengerti
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Tombol kapsul ringan di bawah kartu login agar pegawai bisa langsung memasang aplikasi sebelum/sesudah masuk. */
export function TombolPasangPublik() {
  const { tampil, perangkat, bukaPanduan, setBukaPanduan, picuPasang } = usePasangAplikasi();

  if (!tampil) return null;

  return (
    <>
      <div className="flex justify-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={picuPasang}
          className="bg-white/80 text-judul"
        >
          <DownloadIcon data-icon="inline-start" aria-hidden />
          Download Aplikasi
        </Button>
      </div>
      <DialogPanduanPasang buka={bukaPanduan} onOpenChange={setBukaPanduan} perangkat={perangkat} />
    </>
  );
}
