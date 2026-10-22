import { describe, expect, it } from "vitest";
import { ipDalamCidr, ipDiizinkan } from "@/lib/domain/jaringan";
import { lewatBatasAlpa, parseJam, statusAbsenMandiri, statusHarian, wajibAbsenPada } from "@/lib/domain/status-absen";

/** Jam WITA (UTC+8) pada tanggal tertentu → Date. */
const wita = (tanggal: string, jam: string) => new Date(`${tanggal}T${jam}:00+08:00`);
const tgl = (s: string) => new Date(`${s}T00:00:00Z`);

const aturan = { jamMasuk: "07:30", toleransiMenit: 15, batasAlpa: "12:00" };

describe("statusAbsenMandiri", () => {
  it("Hadir sampai jam masuk + toleransi, Terlambat setelahnya", () => {
    expect(statusAbsenMandiri(wita("2026-10-22", "07:10"), aturan)).toBe("HADIR");
    expect(statusAbsenMandiri(wita("2026-10-22", "07:45"), aturan)).toBe("HADIR");
    expect(statusAbsenMandiri(wita("2026-10-22", "07:46"), aturan)).toBe("TERLAMBAT");
  });

  it("selama jam masuk masih [ISI], selalu Hadir", () => {
    expect(statusAbsenMandiri(wita("2026-10-22", "10:00"), { jamMasuk: null, toleransiMenit: null, batasAlpa: null })).toBe("HADIR");
  });

  it("toleransi kosong dianggap 0 menit", () => {
    expect(statusAbsenMandiri(wita("2026-10-22", "07:31"), { ...aturan, toleransiMenit: null })).toBe("TERLAMBAT");
  });

  it("memakai jam WITA walau server berjalan di zona waktu lain", () => {
    // 23:50 UTC tanggal 21 = 07:50 WITA tanggal 22 → terlambat
    expect(statusAbsenMandiri(new Date("2026-10-21T23:50:00Z"), aturan)).toBe("TERLAMBAT");
  });
});

describe("parseJam", () => {
  it.each([["07:30", 450], ["7.05", 425], ["24:00", null], ["abc", null], [null, null]] as const)("%s → %s", (a, b) => {
    expect(parseJam(a)).toBe(b);
  });
});

describe("lewatBatasAlpa", () => {
  it("hari ini: lewat setelah jam batas", () => {
    expect(lewatBatasAlpa(tgl("2026-10-22"), wita("2026-10-22", "11:59"), aturan)).toBe(false);
    expect(lewatBatasAlpa(tgl("2026-10-22"), wita("2026-10-22", "12:00"), aturan)).toBe(true);
  });

  it("hari yang sudah lewat selalu lewat batas; hari depan tidak", () => {
    expect(lewatBatasAlpa(tgl("2026-10-21"), wita("2026-10-22", "06:00"), aturan)).toBe(true);
    expect(lewatBatasAlpa(tgl("2026-10-23"), wita("2026-10-22", "23:00"), aturan)).toBe(false);
  });

  it("tanpa batas alpa ([ISI]) tidak pernah alpa", () => {
    expect(lewatBatasAlpa(tgl("2026-10-01"), wita("2026-10-22", "12:00"), { batasAlpa: null })).toBe(false);
  });
});

describe("statusHarian (prioritas)", () => {
  const dasar = { cuti: false, keterangan: null, mandiri: null, lewatBatas: false, wajibAbsenOnline: true } as const;

  it("cuti mengalahkan semuanya", () => {
    expect(statusHarian({ ...dasar, cuti: true, keterangan: "DINAS_LUAR", mandiri: "HADIR" })).toBe("CUTI");
  });

  it("keterangan mengalahkan absen mandiri", () => {
    expect(statusHarian({ ...dasar, keterangan: "DINAS_LUAR", mandiri: "TERLAMBAT" })).toBe("DINAS_LUAR");
  });

  it("absen mandiri dipakai bila tidak ada cuti/keterangan", () => {
    expect(statusHarian({ ...dasar, mandiri: "TERLAMBAT", lewatBatas: true })).toBe("TERLAMBAT");
  });

  it("alpa hanya setelah batas dan hanya untuk yang wajib absen online", () => {
    expect(statusHarian({ ...dasar, lewatBatas: false })).toBeNull();
    expect(statusHarian({ ...dasar, lewatBatas: true })).toBe("ALPA");
    expect(statusHarian({ ...dasar, lewatBatas: true, wajibAbsenOnline: false })).toBeNull();
  });
});

describe("wajibAbsenPada", () => {
  it("hari sebelum akun dibuat tidak wajib; hari berikutnya wajib", () => {
    const akun = wita("2026-10-22", "09:00");
    expect(wajibAbsenPada(tgl("2026-10-21"), akun, "12:00")).toBe(false);
    expect(wajibAbsenPada(tgl("2026-10-22"), akun, "12:00")).toBe(true);
    expect(wajibAbsenPada(tgl("2026-10-23"), akun, "12:00")).toBe(true);
    expect(wajibAbsenPada(tgl("2026-10-23"), null, "12:00")).toBe(false);
  });

  it("akun yang dibuat setelah batas alpa belum wajib pada hari itu", () => {
    const akun = wita("2026-10-22", "17:04");
    expect(wajibAbsenPada(tgl("2026-10-22"), akun, "12:00")).toBe(false);
    expect(wajibAbsenPada(tgl("2026-10-23"), akun, "12:00")).toBe(true);
  });
});

describe("jaringan kantor", () => {
  it("cocok dengan CIDR IPv4 termasuk alamat IPv4-mapped", () => {
    expect(ipDalamCidr("192.168.10.25", "192.168.10.0/24")).toBe(true);
    expect(ipDalamCidr("::ffff:192.168.10.25", "192.168.10.0/24")).toBe(true);
    expect(ipDalamCidr("192.168.11.25", "192.168.10.0/24")).toBe(false);
    expect(ipDalamCidr("10.0.0.7", "10.0.0.7")).toBe(true);
  });

  it("daftar kosong mengizinkan semua; daftar terisi menolak IP lain", () => {
    expect(ipDiizinkan("8.8.8.8", [])).toBe(true);
    expect(ipDiizinkan("8.8.8.8", ["192.168.10.0/24"])).toBe(false);
    expect(ipDiizinkan(null, ["192.168.10.0/24"])).toBe(false);
  });
});
