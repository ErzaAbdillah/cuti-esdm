import { describe, expect, it } from "vitest";
import {
  adalahTemaTerang,
  balikModeTema,
  DAFTAR_TEMA,
  gantiGayaTema,
  gayaTema,
  modeTema,
  normalisasiTema,
  TEMA_BAWAAN,
  temaDari,
  warnaBilahBrowser,
} from "@/lib/tema";

describe("tema tampilan", () => {
  it("menyediakan tepat 4 tema simetris (Langit Pagi/Malam & Notion Light/Dark) tanpa deskripsi maupun tema lama", () => {
    expect(DAFTAR_TEMA).toHaveLength(4);
    const ids = DAFTAR_TEMA.map((t) => t.id);
    expect(ids).toEqual(["langit-pagi", "langit-malam", "notion-light", "notion-dark"]);
    expect(ids).not.toContain("cursor-dark");
    expect(ids).not.toContain("mossy-stone");
    expect(ids).not.toContain("notion-monokrom");
    for (const tema of DAFTAR_TEMA) {
      expect("keterangan" in tema).toBe(false);
    }
  });

  it("menjadikan Langit Pagi sebagai tema bawaan dengan palet warna yang sesuai", () => {
    expect(TEMA_BAWAAN).toBe("langit-pagi");
    const langitPagi = DAFTAR_TEMA.find((t) => t.id === "langit-pagi");
    expect(langitPagi).toEqual({
      id: "langit-pagi",
      gaya: "langit",
      mode: "siang",
      namaGaya: "Langit",
      nama: "Langit Pagi",
      warna: {
        background: "#F0F9FF",
        foreground: "#0F172A",
        accent: "#0EA5E9",
      },
    });
  });

  it("menyediakan Langit Malam, Notion Light, dan Notion Dark dengan metadata dan palet warna yang sesuai", () => {
    expect(DAFTAR_TEMA.find((t) => t.id === "langit-malam")).toEqual({
      id: "langit-malam",
      gaya: "langit",
      mode: "malam",
      namaGaya: "Langit",
      nama: "Langit Malam",
      warna: {
        background: "#0B1526",
        foreground: "#E8F1FA",
        accent: "#38BDF8",
      },
    });

    expect(DAFTAR_TEMA.find((t) => t.id === "notion-light")).toEqual({
      id: "notion-light",
      gaya: "notion",
      mode: "siang",
      namaGaya: "Notion",
      nama: "Notion Light",
      warna: {
        background: "#FBFBFA",
        foreground: "#191919",
        accent: "#787774",
      },
    });

    expect(DAFTAR_TEMA.find((t) => t.id === "notion-dark")).toEqual({
      id: "notion-dark",
      gaya: "notion",
      mode: "malam",
      namaGaya: "Notion",
      nama: "Notion Dark",
      warna: {
        background: "#191919",
        foreground: "#E6E6E3",
        accent: "#787774",
      },
    });
  });

  it("mengalihkan otomatis tema lama maupun nilai tidak dikenal ke Langit Pagi", () => {
    expect(normalisasiTema("langit-pagi")).toBe("langit-pagi");
    expect(normalisasiTema("langit-malam")).toBe("langit-malam");
    expect(normalisasiTema("notion-light")).toBe("notion-light");
    expect(normalisasiTema("notion-dark")).toBe("notion-dark");

    expect(normalisasiTema("cursor-dark")).toBe("langit-pagi");
    expect(normalisasiTema("mossy-stone")).toBe("langit-pagi");
    expect(normalisasiTema("notion-monokrom")).toBe("langit-pagi");
    expect(normalisasiTema("tidak-ada")).toBe("langit-pagi");
    expect(normalisasiTema("")).toBe("langit-pagi");
    expect(normalisasiTema(undefined)).toBe("langit-pagi");
    expect(normalisasiTema(null)).toBe("langit-pagi");
  });

  it("mengenali tema terang (siang) dan tema gelap (malam) secara konsisten", () => {
    expect(adalahTemaTerang("notion-light")).toBe(true);
    expect(adalahTemaTerang("langit-pagi")).toBe(true);
    expect(adalahTemaTerang("notion-dark")).toBe(false);
    expect(adalahTemaTerang("langit-malam")).toBe(false);

    expect(gayaTema("notion-light")).toBe("notion");
    expect(gayaTema("notion-dark")).toBe("notion");
    expect(gayaTema("langit-pagi")).toBe("langit");
    expect(gayaTema("langit-malam")).toBe("langit");

    expect(modeTema("notion-light")).toBe("siang");
    expect(modeTema("langit-pagi")).toBe("siang");
    expect(modeTema("notion-dark")).toBe("malam");
    expect(modeTema("langit-malam")).toBe("malam");
  });

  it("membentuk tema dari pasangan gaya + mode dan menukar Siang/Malam dengan benar", () => {
    expect(temaDari("notion", "siang")).toBe("notion-light");
    expect(temaDari("notion", "malam")).toBe("notion-dark");
    expect(temaDari("langit", "siang")).toBe("langit-pagi");
    expect(temaDari("langit", "malam")).toBe("langit-malam");

    expect(balikModeTema("notion-light")).toBe("notion-dark");
    expect(balikModeTema("notion-dark")).toBe("notion-light");
    expect(balikModeTema("langit-pagi")).toBe("langit-malam");
    expect(balikModeTema("langit-malam")).toBe("langit-pagi");
  });

  it("mempertahankan mode Siang/Malam saat berpindah gaya tema", () => {
    expect(gantiGayaTema("notion-dark", "langit")).toBe("langit-malam");
    expect(gantiGayaTema("langit-malam", "notion")).toBe("notion-dark");
    expect(gantiGayaTema("notion-light", "langit")).toBe("langit-pagi");
    expect(gantiGayaTema("langit-pagi", "notion")).toBe("notion-light");
  });

  it("mengembalikan warna bilah browser HP yang identik untuk ke-4 tema", () => {
    expect(warnaBilahBrowser("notion-light")).toBe("#FBFBFA");
    expect(warnaBilahBrowser("notion-dark")).toBe("#191919");
    expect(warnaBilahBrowser("langit-pagi")).toBe("#F0F9FF");
    expect(warnaBilahBrowser("langit-malam")).toBe("#0B1526");
  });
});
