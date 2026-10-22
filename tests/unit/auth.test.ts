import { describe, expect, it } from "vitest";
import { validasiPassword } from "@/lib/password";
import { skemaAktivasi, tujuanAman } from "@/lib/validasi/auth";

describe("validasiPassword", () => {
  it.each([
    ["Rahasia1", null],
    ["pendek1", "Password minimal 8 karakter."],
    ["tanpaangka", "Password harus berisi huruf dan angka."],
    ["12345678", "Password harus berisi huruf dan angka."],
  ])("%s → %s", (pw, galat) => {
    expect(validasiPassword(pw)).toBe(galat);
  });
});

describe("skemaAktivasi", () => {
  it("menolak konfirmasi yang berbeda", () => {
    const h = skemaAktivasi.safeParse({ loginId: "1", verifikasi: "1", password: "Rahasia1", konfirmasi: "Rahasia2" });
    expect(h.success).toBe(false);
    expect(h.error?.issues[0].path).toEqual(["konfirmasi"]);
  });
});

describe("tujuanAman (cegah open redirect)", () => {
  it.each([
    ["/cuti", "/cuti"],
    ["/cuti?x=1", "/cuti?x=1"],
    [undefined, "/beranda"],
    ["https://jahat.example", "/beranda"],
    ["//jahat.example", "/beranda"],
    ["/\\jahat.example", "/beranda"],
  ])("%s → %s", (masuk, keluar) => {
    expect(tujuanAman(masuk)).toBe(keluar);
  });
});
