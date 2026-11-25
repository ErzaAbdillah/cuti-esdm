export const KUKI_TEMA = "tema";

export type IdTema = "cursor-dark" | "langit-pagi" | "mossy-stone" | "notion-monokrom";

export interface InfoTema {
  id: IdTema;
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
    id: "cursor-dark",
    nama: "Cursor Dark",
    keterangan: "Hitam arang modern bawaan",
    warna: {
      background: "#0E0E10",
      foreground: "#EDEDEF",
      accent: "#60A5FA",
    },
  },
  {
    id: "langit-pagi",
    nama: "Langit Pagi",
    keterangan: "Biru cerah bersih",
    warna: {
      background: "#F0F9FF",
      foreground: "#0F172A",
      accent: "#0EA5E9",
    },
  },
  {
    id: "mossy-stone",
    nama: "Mossy Stone",
    keterangan: "Hijau lumut teduh",
    warna: {
      background: "#161E1A",
      foreground: "#D6DFDC",
      accent: "#52A478",
    },
  },
  {
    id: "notion-monokrom",
    nama: "Notion Monokrom",
    keterangan: "Putih bersih & hitam arang minimalis",
    warna: {
      background: "#FBFBFA",
      foreground: "#191919",
      accent: "#787774",
    },
  },
] as const;

export const TEMA_BAWAAN: IdTema = "cursor-dark";

export function normalisasiTema(nilai: string | undefined | null): IdTema {
  if (
    nilai === "langit-pagi" ||
    nilai === "mossy-stone" ||
    nilai === "cursor-dark" ||
    nilai === "notion-monokrom"
  ) {
    return nilai;
  }
  return TEMA_BAWAAN;
}

export function adalahTemaTerang(id: IdTema): boolean {
  return id === "langit-pagi" || id === "notion-monokrom";
}
