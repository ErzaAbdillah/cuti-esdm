export const KUKI_TEMA = "tema";

export type IdTema = "notion-light" | "notion-dark" | "langit-pagi" | "langit-malam";

export type GayaTema = "notion" | "langit";

export type ModeTema = "siang" | "malam";

export interface InfoTema {
  id: IdTema;
  gaya: GayaTema;
  mode: ModeTema;
  namaGaya: string;
  nama: string;
  keterangan: string;
  warna: {
    background: string;
    foreground: string;
    accent: string;
  };
}

export const DAFTAR_TEMA: readonly InfoTema[] = [
  {
    id: "notion-light",
    gaya: "notion",
    mode: "siang",
    namaGaya: "Notion",
    nama: "Notion Light",
    keterangan: "Putih bersih & hitam arang minimalis",
    warna: {
      background: "#FBFBFA",
      foreground: "#191919",
      accent: "#787774",
    },
  },
  {
    id: "notion-dark",
    gaya: "notion",
    mode: "malam",
    namaGaya: "Notion",
    nama: "Notion Dark",
    keterangan: "Arang gelap minimalis nyaman mata",
    warna: {
      background: "#191919",
      foreground: "#E6E6E3",
      accent: "#787774",
    },
  },
  {
    id: "langit-pagi",
    gaya: "langit",
    mode: "siang",
    namaGaya: "Langit",
    nama: "Langit Pagi",
    keterangan: "Biru cerah bersih",
    warna: {
      background: "#F0F9FF",
      foreground: "#0F172A",
      accent: "#0EA5E9",
    },
  },
  {
    id: "langit-malam",
    gaya: "langit",
    mode: "malam",
    namaGaya: "Langit",
    nama: "Langit Malam",
    keterangan: "Biru malam tenang",
    warna: {
      background: "#0B1526",
      foreground: "#E8F1FA",
      accent: "#38BDF8",
    },
  },
] as const;

export const TEMA_BAWAAN: IdTema = "notion-light";

export function normalisasiTema(nilai: string | undefined | null): IdTema {
  if (
    nilai === "notion-light" ||
    nilai === "notion-dark" ||
    nilai === "langit-pagi" ||
    nilai === "langit-malam"
  ) {
    return nilai;
  }
  return TEMA_BAWAAN;
}

export function adalahTemaTerang(id: IdTema): boolean {
  return id === "notion-light" || id === "langit-pagi";
}

export function gayaTema(id: IdTema): GayaTema {
  return id === "langit-pagi" || id === "langit-malam" ? "langit" : "notion";
}

export function modeTema(id: IdTema): ModeTema {
  return adalahTemaTerang(id) ? "siang" : "malam";
}

export function temaDari(gaya: GayaTema, mode: ModeTema): IdTema {
  if (gaya === "langit") {
    return mode === "siang" ? "langit-pagi" : "langit-malam";
  }
  return mode === "siang" ? "notion-light" : "notion-dark";
}

export function balikModeTema(id: IdTema): IdTema {
  return temaDari(gayaTema(id), modeTema(id) === "siang" ? "malam" : "siang");
}

export function gantiGayaTema(idSaatIni: IdTema, gayaBaru: GayaTema): IdTema {
  return temaDari(gayaBaru, modeTema(idSaatIni));
}

export function warnaBilahBrowser(id: IdTema): string {
  const info = DAFTAR_TEMA.find((t) => t.id === id) ?? DAFTAR_TEMA[0];
  return info.warna.background;
}
