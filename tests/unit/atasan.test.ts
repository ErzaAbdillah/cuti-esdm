import { describe, expect, it } from "vitest";
import { tentukanAtasanLangsung, type UnitStruktur } from "@/lib/domain/atasan";

const units = new Map<string, UnitStruktur>(
  [
    { id: "dinas", parentId: null },
    { id: "sekretariat", parentId: "dinas" },
    { id: "subbag-umum", parentId: "sekretariat" },
    { id: "bidang-listrik", parentId: "dinas" },
    { id: "seksi-pengawasan", parentId: "bidang-listrik" },
  ].map((u) => [u.id, u]),
);

const kepala = new Map([
  ["dinas", "kadis"],
  ["sekretariat", "sekretaris"],
  ["subbag-umum", "kasubbag"],
  ["seksi-pengawasan", "kasie"],
  // bidang-listrik sengaja kosong (Kepala Bidang belum terisi)
]);

describe("tentukanAtasanLangsung", () => {
  it("staf → kepala unitnya", () => {
    expect(tentukanAtasanLangsung("staf", "subbag-umum", units, kepala)).toBe("kasubbag");
  });

  it("kepala subbag → sekretaris", () => {
    expect(tentukanAtasanLangsung("kasubbag", "subbag-umum", units, kepala)).toBe("sekretaris");
  });

  it("sekretaris → kepala dinas", () => {
    expect(tentukanAtasanLangsung("sekretaris", "sekretariat", units, kepala)).toBe("kadis");
  });

  it("kepala dinas tidak punya atasan di dinas", () => {
    expect(tentukanAtasanLangsung("kadis", "dinas", units, kepala)).toBeNull();
  });

  it("melewati kepala unit yang kosong", () => {
    expect(tentukanAtasanLangsung("kasie", "seksi-pengawasan", units, kepala)).toBe("kadis");
  });

  it("JF yang ditempatkan langsung di dinas → kepala dinas", () => {
    expect(tentukanAtasanLangsung("jf-madya", "dinas", units, kepala)).toBe("kadis");
  });
});
