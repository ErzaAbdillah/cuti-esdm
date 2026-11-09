export const KUKI_TEMA = "tema";

export type IdTema = "langit-pagi" | "mossy-stone";

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
    id: "langit-pagi",
    nama: "Langit Pagi",
    keterangan: "Biru cerah bawaan",
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
] as const;

export const TEMA_BAWAAN: IdTema = "langit-pagi";

export function normalisasiTema(nilai: string | undefined | null): IdTema {
  if (nilai === "mossy-stone") return "mossy-stone";
  return "langit-pagi";
}
