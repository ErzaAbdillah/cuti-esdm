import { describe, expect, it } from "vitest";
import { type AturanMappingEselon, tentukanLevelSurat } from "@/lib/domain/level-surat";

const mapping: AturanMappingEselon[] = [
  { jenisJabatan: "STRUKTURAL", kelasMin: 15, kelasMax: 15, level: "ESELON_II" },
  { jenisJabatan: "STRUKTURAL", kelasMin: 11, kelasMax: 12, level: "ESELON_III" },
  { jenisJabatan: "STRUKTURAL", kelasMin: 9, kelasMax: 9, level: "ESELON_IV" },
];

describe("tentukanLevelSurat", () => {
  it.each([
    [15, "ESELON_II"], // Kepala Dinas
    [12, "ESELON_III"], // Sekretaris
    [11, "ESELON_III"], // Kepala Bidang / Kepala UPTD
    [9, "ESELON_IV"], // Kasubbag / Kasie
  ] as const)("struktural kelas %i → %s", (kelas, level) => {
    expect(tentukanLevelSurat({ jenisJabatan: "STRUKTURAL", kelas }, mapping)).toBe(level);
  });

  it("JF kelas 12 tetap Staf (JF Perencana Ahli Madya)", () => {
    expect(tentukanLevelSurat({ jenisJabatan: "FUNGSIONAL", kelas: 12 }, mapping)).toBe("STAF");
  });

  it("pelaksana dan Non-ASN selalu Staf", () => {
    expect(tentukanLevelSurat({ jenisJabatan: "PELAKSANA", kelas: 7 }, mapping)).toBe("STAF");
    expect(tentukanLevelSurat({ jenisJabatan: "NON_ASN", kelas: null }, mapping)).toBe("STAF");
  });

  it("struktural dengan kelas yang tidak ada di mapping jatuh ke Staf", () => {
    expect(tentukanLevelSurat({ jenisJabatan: "STRUKTURAL", kelas: 10 }, mapping)).toBe("STAF");
  });

  it("override dari Kepegawaian menang", () => {
    expect(
      tentukanLevelSurat({ jenisJabatan: "PELAKSANA", kelas: 7, override: "ESELON_IV" }, mapping),
    ).toBe("ESELON_IV");
  });
});
