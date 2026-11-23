import { describe, expect, it } from "vitest";
import { DAFTAR_TEMA, normalisasiTema, TEMA_BAWAAN } from "@/lib/tema";

describe("tema tampilan", () => {
  it("menjadikan Cursor Dark sebagai tema bawaan dengan palet obsidian yang sesuai", () => {
    expect(TEMA_BAWAAN).toBe("cursor-dark");
    const cursor = DAFTAR_TEMA.find((t) => t.id === "cursor-dark");
    expect(cursor).toBeDefined();
    expect(cursor?.nama).toBe("Cursor Dark");
    expect(cursor?.warna).toEqual({
      background: "#0E0E10",
      foreground: "#EDEDEF",
      accent: "#60A5FA",
    });
  });

  it("menyediakan tema Mossy Stone dengan palet warna yang sesuai", () => {
    const mossy = DAFTAR_TEMA.find((t) => t.id === "mossy-stone");
    expect(mossy).toBeDefined();
    expect(mossy?.nama).toBe("Mossy Stone");
    expect(mossy?.warna).toEqual({
      background: "#161E1A",
      foreground: "#D6DFDC",
      accent: "#52A478",
    });
  });

  it("menormalisasi nilai tema ke tema bawaan bila tidak dikenal", () => {
    expect(normalisasiTema("cursor-dark")).toBe("cursor-dark");
    expect(normalisasiTema("mossy-stone")).toBe("mossy-stone");
    expect(normalisasiTema("langit-pagi")).toBe("langit-pagi");
    expect(normalisasiTema("tidak-ada")).toBe("cursor-dark");
    expect(normalisasiTema(undefined)).toBe("cursor-dark");
    expect(normalisasiTema(null)).toBe("cursor-dark");
  });
});
