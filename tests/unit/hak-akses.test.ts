import { describe, expect, it } from "vitest";
import { DAFTAR_HAK_AKSES, DESKRIPSI_HAK_AKSES, HAK_AKSES_BAWAAN_KEPEGAWAIAN, LABEL_HAK_AKSES, SEMUA_HAK_AKSES } from "@/lib/hak-akses";
import { menuUntuk } from "@/lib/menu";

describe("hak akses pegawai (granular permissions)", () => {
  it("mendefinisikan 5 hak akses lengkap dengan label dan deskripsi", () => {
    expect(DAFTAR_HAK_AKSES).toHaveLength(5);
    expect(SEMUA_HAK_AKSES).toEqual([
      "KELOLA_SALDO_CUTI",
      "PROSES_CUTI",
      "KELOLA_PEGAWAI",
      "KELOLA_DOKUMEN_ORGANISASI",
      "PENGATURAN_ADMIN",
    ]);
    for (const kode of SEMUA_HAK_AKSES) {
      expect(LABEL_HAK_AKSES[kode]).toBeTruthy();
      expect(DESKRIPSI_HAK_AKSES[kode]).toBeTruthy();
    }
    expect(HAK_AKSES_BAWAAN_KEPEGAWAIAN).toEqual([
      "KELOLA_SALDO_CUTI",
      "PROSES_CUTI",
      "KELOLA_PEGAWAI",
    ]);
  });

  it("menyaring menu navigasi berdasarkan peran dan hakAkses aktif", () => {
    // Pegawai biasa tanpa hak akses tambahan
    const menuPegawai = menuUntuk(new Set(["PEGAWAI"]), new Set());
    const hrefPegawai = menuPegawai.flatMap((g) => g.item.map((b) => b.href));
    expect(hrefPegawai).toContain("/beranda");
    expect(hrefPegawai).toContain("/cuti");
    expect(hrefPegawai).toContain("/dokumen/organisasi");
    expect(hrefPegawai).not.toContain("/cuti/saldo");
    expect(hrefPegawai).not.toContain("/cuti/proses");
    expect(hrefPegawai).not.toContain("/pegawai");
    expect(hrefPegawai).not.toContain("/admin");

    // Pegawai yang diberi hak akses KELOLA_SALDO_CUTI & KELOLA_PEGAWAI saja
    const menuGranular = menuUntuk(
      new Set(["PEGAWAI"]),
      new Set(["KELOLA_SALDO_CUTI", "KELOLA_PEGAWAI"]),
    );
    const hrefGranular = menuGranular.flatMap((g) => g.item.map((b) => b.href));
    expect(hrefGranular).toContain("/cuti/saldo");
    expect(hrefGranular).toContain("/pegawai");
    expect(hrefGranular).not.toContain("/cuti/proses");
    expect(hrefGranular).not.toContain("/admin");

    // Atasan tetap bisa membuka Proses Cuti walaupun tanpa hak akses PROSES_CUTI
    const menuAtasan = menuUntuk(new Set(["PEGAWAI", "ATASAN"]), new Set());
    expect(menuAtasan.flatMap((g) => g.item.map((b) => b.href))).toContain("/cuti/proses");

    // Admin / Superadmin otomatis melihat menu Proses Cuti, Saldo & Rekap, Data Pegawai, dan Admin
    const menuAdmin = menuUntuk(new Set(["PEGAWAI", "ADMIN"]), new Set());
    const hrefAdmin = menuAdmin.flatMap((g) => g.item.map((b) => b.href));
    expect(hrefAdmin).toContain("/cuti/proses");
    expect(hrefAdmin).toContain("/cuti/saldo");
    expect(hrefAdmin).toContain("/pegawai");
    expect(hrefAdmin).toContain("/admin");
  });

  it("memverifikasi integritas daftar hak akses untuk UI dan backend", () => {
    // Pastikan kode hak akses unik
    const setKode = new Set(DAFTAR_HAK_AKSES.map((h) => h.kode));
    expect(setKode.size).toBe(5);

    // Semua hak bawaan kepegawaian harus ada di SEMUA_HAK_AKSES
    for (const h of HAK_AKSES_BAWAAN_KEPEGAWAIAN) {
      expect(SEMUA_HAK_AKSES).toContain(h);
    }
  });
});
