import { describe, expect, it } from "vitest";
import { adalahTemaTerang, DAFTAR_TEMA, normalisasiTema, TEMA_BAWAAN } from "@/lib/tema";

describe("tema tampilan", () => {
  it("menyediakan tepat 4 tema tampilan termasuk Notion Monokrom", () => {
    expect(DAFTAR_TEMA).toHaveLength(4);
    expect(DAFTAR_TEMA.map((t) => t.id)).toEqual([
      "cursor-dark",
      "langit-pagi",
      "mossy-stone",
      "notion-monokrom",
    ]);
  });

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

  it("menyediakan tema Mossy Stone dan Notion Monokrom dengan palet warna yang sesuai", () => {
    const mossy = DAFTAR_TEMA.find((t) => t.id === "mossy-stone");
    expect(mossy).toBeDefined();
    expect(mossy?.nama).toBe("Mossy Stone");
    expect(mossy?.warna).toEqual({
      background: "#161E1A",
      foreground: "#D6DFDC",
      accent: "#52A478",
    });

    const notion = DAFTAR_TEMA.find((t) => t.id === "notion-monokrom");
    expect(notion).toBeDefined();
    expect(notion?.nama).toBe("Notion Monokrom");
    expect(notion?.keterangan).toBe("Putih bersih & hitam arang minimalis");
    expect(notion?.warna).toEqual({
      background: "#FBFBFA",
      foreground: "#191919",
      accent: "#787774",
    });
  });

  it("menormalisasi nilai tema ke tema bawaan bila tidak dikenal", () => {
    expect(normalisasiTema("cursor-dark")).toBe("cursor-dark");
    expect(normalisasiTema("mossy-stone")).toBe("mossy-stone");
    expect(normalisasiTema("langit-pagi")).toBe("langit-pagi");
    expect(normalisasiTema("notion-monokrom")).toBe("notion-monokrom");
    expect(normalisasiTema("tidak-ada")).toBe("cursor-dark");
    expect(normalisasiTema(undefined)).toBe("cursor-dark");
    expect(normalisasiTema(null)).toBe("cursor-dark");
  });

  it("mengenali tema terang (Langit Pagi & Notion Monokrom) dan tema gelap (Cursor Dark & Mossy Stone)", () => {
    expect(adalahTemaTerang("langit-pagi")).toBe(true);
    expect(adalahTemaTerang("notion-monokrom")).toBe(true);
    expect(adalahTemaTerang("cursor-dark")).toBe(false);
    expect(adalahTemaTerang("mossy-stone")).toBe(false);
  });
});
