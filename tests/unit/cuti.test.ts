import { describe, expect, it } from "vitest";
import { bisaDibatalkan, bisaDitolak, harusSelesai, tahapMenunggu } from "@/lib/domain/alur-cuti";
import { rincianPemakaian, saldoTahunBerikut, saldoTersedia, totalHak } from "@/lib/domain/saldo-cuti";

const saldo = (x: Partial<Parameters<typeof totalHak>[0]> = {}) => ({ hakTahunIni: 12, sisaN1: 0, sisaN2: 0, penyesuaian: 0, terpakai: 0, ...x });
const batas = { maksSisaN1: 6, maksSisaN2: 6 };
const tgl = (s: string) => new Date(`${s}T00:00:00Z`);

describe("saldo cuti tahunan", () => {
  it("total hak = N + N-1 + N-2 (+ penyesuaian), maks. 24 sesuai contoh rekap", () => {
    expect(totalHak(saldo({ sisaN1: 6, sisaN2: 6 }))).toBe(24);
    expect(totalHak(saldo({ sisaN1: 4, penyesuaian: -1 }))).toBe(15);
  });

  it("tersedia dikurangi terpakai dan yang sedang diproses, tidak pernah negatif", () => {
    expect(saldoTersedia(saldo({ sisaN1: 6, terpakai: 10 }))).toBe(8);
    expect(saldoTersedia(saldo({ sisaN1: 6, terpakai: 10 }), 3)).toBe(5);
    expect(saldoTersedia(saldo({ terpakai: 10 }), 5)).toBe(0);
  });

  it("pemakaian mengambil sisa tertua lebih dulu", () => {
    expect(rincianPemakaian(saldo({ sisaN2: 2, sisaN1: 6, terpakai: 5 }))).toEqual({ dariN2: 2, dariN1: 3, dariN: 0 });
    expect(rincianPemakaian(saldo({ sisaN2: 2, sisaN1: 6, terpakai: 12 }))).toEqual({ dariN2: 2, dariN1: 6, dariN: 4 });
  });

  it("tutup tahun: sisa tahun berjalan → N-1 (maks 6), sisa N-1 → N-2 (maks 6), sisa N-2 hangus", () => {
    // Tidak cuti sama sekali dengan N-1 = 6, N-2 = 6 → tahun depan 12 + 6 + 6 = 24.
    expect(saldoTahunBerikut(saldo({ sisaN1: 6, sisaN2: 6 }), 12, batas)).toEqual({ hakTahunIni: 12, sisaN1: 6, sisaN2: 6 });
    // Memakai 8 hari: N-2 (6) habis, N-1 terpakai 2 → sisa N-1 4 jadi N-2; hak 12 utuh → N-1 6.
    expect(saldoTahunBerikut(saldo({ sisaN1: 6, sisaN2: 6, terpakai: 8 }), 12, batas)).toEqual({ hakTahunIni: 12, sisaN1: 6, sisaN2: 4 });
    // Memakai 10 dari hak 12 saja → sisa 2 dibawa.
    expect(saldoTahunBerikut(saldo({ terpakai: 10 }), 12, batas)).toEqual({ hakTahunIni: 12, sisaN1: 2, sisaN2: 0 });
  });

  it("batas akumulasi mengikuti pengaturan Admin", () => {
    expect(saldoTahunBerikut(saldo(), 12, { maksSisaN1: 4, maksSisaN2: 0 })).toEqual({ hakTahunIni: 12, sisaN1: 4, sisaN2: 0 });
  });
});

describe("alur status cuti", () => {
  const staf = ["ATASAN_LANGSUNG", "KEPEGAWAIAN", "PEJABAT_BERWENANG"] as const;
  const eselon2 = ["KEPEGAWAIAN", "PEJABAT_BERWENANG"] as const;

  it("staf: atasan → Kepegawaian → pejabat", () => {
    expect(tahapMenunggu("DIAJUKAN", staf, true)).toBe("ATASAN_LANGSUNG");
    expect(tahapMenunggu("DISETUJUI_ATASAN", staf, true)).toBe("KEPEGAWAIAN");
    expect(tahapMenunggu("DIVERIFIKASI", staf, true)).toBe("PEJABAT_BERWENANG");
    expect(tahapMenunggu("DISETUJUI", staf, true)).toBeNull();
  });

  it("tahap atasan dilewati bila tidak punya atasan; Eselon II langsung ke Kepegawaian", () => {
    expect(tahapMenunggu("DIAJUKAN", staf, false)).toBe("KEPEGAWAIAN");
    expect(tahapMenunggu("DIAJUKAN", eselon2, false)).toBe("KEPEGAWAIAN");
  });

  it("tahap yang dinonaktifkan Admin tidak ditunggu", () => {
    expect(tahapMenunggu("DIAJUKAN", ["KEPEGAWAIAN", "PEJABAT_BERWENANG"], true)).toBe("KEPEGAWAIAN");
    expect(tahapMenunggu("DIAJUKAN", ["PEJABAT_BERWENANG"], true)).toBe("PEJABAT_BERWENANG");
  });

  it("status akhir tidak menunggu apa pun", () => {
    for (const s of ["DITOLAK", "DIBATALKAN", "SELESAI", "SURAT_TERBIT"] as const) expect(tahapMenunggu(s, staf, true)).toBeNull();
  });

  it("tolak hanya sebelum keputusan pejabat", () => {
    expect(bisaDitolak("DIVERIFIKASI")).toBe(true);
    expect(bisaDitolak("DISETUJUI")).toBe(false);
  });

  it("batal hanya sebelum tanggal mulai dan belum berstatus akhir", () => {
    expect(bisaDibatalkan("DISETUJUI", tgl("2026-11-02"), tgl("2026-10-22"))).toBe(true);
    expect(bisaDibatalkan("DISETUJUI", tgl("2026-10-22"), tgl("2026-10-22"))).toBe(false);
    expect(bisaDibatalkan("DITOLAK", tgl("2026-11-02"), tgl("2026-10-22"))).toBe(false);
  });

  it("selesai otomatis setelah tanggal selesai bila surat sudah terbit", () => {
    expect(harusSelesai("SURAT_TERBIT", tgl("2026-10-21"), tgl("2026-10-22"))).toBe(true);
    expect(harusSelesai("SURAT_TERBIT", tgl("2026-10-22"), tgl("2026-10-22"))).toBe(false);
    expect(harusSelesai("DISETUJUI", tgl("2026-10-01"), tgl("2026-10-22"))).toBe(false);
  });
});
