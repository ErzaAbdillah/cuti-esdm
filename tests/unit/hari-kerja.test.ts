import { describe, expect, it } from "vitest";
import { adalahHariKerja, hitungHariKalender, hitungHariKerja, tanggalDari } from "@/lib/domain/hari-kerja";

const t = tanggalDari;

/** Libur nasional & cuti bersama 2026 (SKB 3 Menteri) yang relevan untuk tes. */
const LIBUR_2026 = new Set([
  "2026-03-18", "2026-03-19", "2026-03-20", "2026-03-21", "2026-03-22", "2026-03-23", "2026-03-24",
  "2026-12-24", "2026-12-25",
]);
const TANPA_LIBUR = new Set<string>();

describe("hitungHariKerja", () => {
  it("01–10 Juli 2026 = 8 hari kerja (kriteria selesai spesifikasi)", () => {
    expect(hitungHariKerja(t("2026-07-01"), t("2026-07-10"), LIBUR_2026)).toBe(8);
  });

  it("02–17 Januari 2024 = 12 hari kerja (contoh surat Eselon II)", () => {
    expect(hitungHariKerja(t("2024-01-02"), t("2024-01-17"), TANPA_LIBUR)).toBe(12);
  });

  it("06–10 Juli 2026 = 5 dan 25–27 Maret 2026 = 3 (contoh surat staf & Eselon IV)", () => {
    expect(hitungHariKerja(t("2026-07-06"), t("2026-07-10"), LIBUR_2026)).toBe(5);
    expect(hitungHariKerja(t("2026-03-25"), t("2026-03-27"), LIBUR_2026)).toBe(3);
  });

  it("tidak menghitung libur nasional & cuti bersama (Idul Fitri 2026)", () => {
    // 16–17 Mar kerja; 18–24 libur/cuti bersama; 25–27 kerja.
    expect(hitungHariKerja(t("2026-03-16"), t("2026-03-27"), LIBUR_2026)).toBe(5);
  });

  it("tidak menghitung Natal & cuti bersama 24 Des 2026", () => {
    expect(hitungHariKerja(t("2026-12-21"), t("2026-12-31"), LIBUR_2026)).toBe(7);
  });

  it("rentang satu hari di akhir pekan = 0; rentang terbalik = 0", () => {
    expect(hitungHariKerja(t("2026-07-04"), t("2026-07-04"), TANPA_LIBUR)).toBe(0);
    expect(hitungHariKerja(t("2026-07-10"), t("2026-07-01"), TANPA_LIBUR)).toBe(0);
  });

  it("menghormati pengaturan hari kerja selain Senin–Jumat", () => {
    expect(hitungHariKerja(t("2026-07-01"), t("2026-07-10"), TANPA_LIBUR, [1, 2, 3, 4, 5, 6])).toBe(9);
  });
});

describe("adalahHariKerja & hitungHariKalender", () => {
  it("Sabtu dan hari libur bukan hari kerja", () => {
    expect(adalahHariKerja(t("2026-07-04"), TANPA_LIBUR)).toBe(false);
    expect(adalahHariKerja(t("2026-03-19"), LIBUR_2026)).toBe(false);
    expect(adalahHariKerja(t("2026-07-06"), LIBUR_2026)).toBe(true);
  });

  it("hari kalender menghitung semua hari termasuk akhir pekan", () => {
    expect(hitungHariKalender(t("2026-07-01"), t("2026-07-10"))).toBe(10);
  });
});
