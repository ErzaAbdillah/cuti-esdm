import { describe, expect, it } from "vitest";
import { formatNip, normalisasiNip, parseNip } from "@/lib/domain/nip";

describe("parseNip", () => {
  it("menerima NIP PNS dan membaca bagian-bagiannya", () => {
    const h = parseNip("19800326 200803 1 002", 2026);
    expect(h.ok).toBe(true);
    if (!h.ok) return;
    expect(h.data).toMatchObject({
      nip: "198003262008031002",
      jenis: "PNS",
      tanggalLahir: { tahun: 1980, bulan: 3, hari: 26 },
      tahunTmt: 2008,
      bulanTmt: 3,
      jenisKelamin: "L",
      nomorUrut: 2,
    });
  });

  it("menerima NIP PPPK dengan kode 21 di posisi bulan TMT", () => {
    const h = parseNip("199004252024211016", 2026);
    expect(h.ok).toBe(true);
    if (!h.ok) return;
    expect(h.data.jenis).toBe("PPPK");
    expect(h.data.tahunTmt).toBe(2024);
    expect(h.data.bulanTmt).toBeNull();
  });

  it("membaca digit jenis kelamin perempuan", () => {
    const h = parseNip("198210192009032006", 2026);
    expect(h.ok && h.data.jenisKelamin).toBe("P");
  });

  it.each([
    ["kurang dari 18 digit", "19800326200803100"],
    ["mengandung huruf", "19800326200803100A"],
    ["tanggal lahir tidak ada", "19800230200803 1002"],
    ["bulan TMT 13", "198003262008131002"],
    ["kode TMT selain 21", "198003262008221002"],
    ["TMT sebelum lahir", "198003261975031002"],
    ["digit kelamin 3", "198003262008033002"],
    ["nomor urut 000", "198003262008031000"],
  ])("menolak NIP: %s", (_, nip) => {
    expect(parseNip(nip, 2026).ok).toBe(false);
  });
});

describe("format & normalisasi", () => {
  it("menyimpan tanpa spasi dan menampilkan dengan spasi 8-6-1-3", () => {
    expect(normalisasiNip("19800326 200803 1 002")).toBe("198003262008031002");
    expect(formatNip("198003262008031002")).toBe("19800326 200803 1 002");
  });

  it("membiarkan input yang bukan 18 digit apa adanya", () => {
    expect(formatNip("PJLP-001")).toBe("PJLP-001");
  });
});
