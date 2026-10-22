import { describe, expect, it } from "vitest";
import { bandingkanBarisDaftarHadir, type BarisUrut, unitDaftarHadir, type UnitPohon } from "@/lib/domain/daftar-hadir";

const units = new Map<string, UnitPohon>(
  [
    { id: "dinas", parentId: null },
    { id: "sekretariat", parentId: "dinas" },
    { id: "subbag", parentId: "sekretariat" },
    { id: "bidang", parentId: "dinas" },
    { id: "seksi", parentId: "bidang" },
  ].map((u) => [u.id, u]),
);

describe("unitDaftarHadir", () => {
  it("memetakan seksi/subbag ke unit tingkat-1", () => {
    expect(unitDaftarHadir("seksi", units)).toBe("bidang");
    expect(unitDaftarHadir("subbag", units)).toBe("sekretariat");
    expect(unitDaftarHadir("bidang", units)).toBe("bidang");
  });

  it("unit akar (Dinas) tidak punya daftar hadir sendiri", () => {
    expect(unitDaftarHadir("dinas", units)).toBeNull();
  });
});

describe("bandingkanBarisDaftarHadir", () => {
  const baris = (nama: string, x: Partial<BarisUrut>): BarisUrut => ({
    pimpinan: false,
    status: "PNS",
    urutanGolongan: 0,
    kelas: 5,
    nama,
    ...x,
  });

  it("mengikuti urutan form fisik", () => {
    const acak = [
      baris("PPPK IX", { status: "PPPK", urutanGolongan: 109, kelas: 8 }),
      baris("PNS II/a", { urutanGolongan: 5 }),
      baris("Paruh waktu", { status: "PPPK_PARUH_WAKTU" }),
      baris("Sekretaris", { pimpinan: true, urutanGolongan: 14, kelas: 12 }),
      baris("PNS III/d", { urutanGolongan: 12, kelas: 7 }),
    ];
    expect(acak.sort(bandingkanBarisDaftarHadir).map((b) => b.nama)).toEqual([
      "Sekretaris",
      "PNS III/d",
      "PNS II/a",
      "PPPK IX",
      "Paruh waktu",
    ]);
  });
});
