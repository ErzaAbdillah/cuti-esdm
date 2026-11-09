import { describe, expect, it } from "vitest";
import { DAFTAR_TEMA, normalisasiTema, TEMA_BAWAAN } from "@/lib/tema";

describe("tema tampilan", () => {
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
    expect(normalisasiTema("mossy-stone")).toBe("mossy-stone");
    expect(normalisasiTema("langit-pagi")).toBe("langit-pagi");
    expect(normalisasiTema("tidak-ada")).toBe(TEMA_BAWAAN);
    expect(normalisasiTema(undefined)).toBe(TEMA_BAWAAN);
    expect(normalisasiTema(null)).toBe(TEMA_BAWAAN);
  });
});
