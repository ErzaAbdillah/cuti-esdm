import { describe, expect, it } from "vitest";
import {
  bagiHariPerBulan,
  type PengajuanAnalitikInput,
  pilihTahunBeranda,
  susunAnalitikBeranda,
  susunAnalitikDinas,
} from "@/lib/domain/beranda-analitik";
import { tanggalDari } from "@/lib/domain/hari-kerja";
import { saldoTersedia, totalHak } from "@/lib/domain/saldo-cuti";

function buatPengajuan(
  parsial: Partial<PengajuanAnalitikInput> & Pick<PengajuanAnalitikInput, "tanggalMulai" | "tanggalSelesai" | "jumlahHari">,
): PengajuanAnalitikInput {
  return {
    status: "SELESAI",
    tahunSaldo: parsial.tanggalMulai.getUTCFullYear(),
    potongSaldoTahunan: true,
    satuanHitung: "HARI_KERJA",
    namaJenis: "Cuti Tahunan",
    kodeJenis: "TAHUNAN",
    ...parsial,
  };
}

describe("analitik beranda", () => {
  it("memecah cuti kerja lintas bulan secara akurat (melewati akhir pekan & hari libur)", () => {
    // 29 Jan 2026 (Kam) - 3 Feb 2026 (Sel): 29, 30 Jan (2 hari) + 2, 3 Feb (2 hari) = 4 hari kerja
    const hasil = bagiHariPerBulan({
      tanggalMulai: tanggalDari("2026-01-29"),
      tanggalSelesai: tanggalDari("2026-02-03"),
      jumlahHari: 4,
      satuanHitung: "HARI_KERJA",
      tahunTarget: 2026,
      libur: new Set(),
      rekonsiliasiKeJumlahHari: true,
    });

    expect(hasil[0]).toBe(2); // Jan
    expect(hasil[1]).toBe(2); // Feb
    expect(hasil.reduce((a, b) => a + b, 0)).toBe(4);

    // Dengan 1 hari libur di 2 Feb 2026 -> 29, 30 Jan (2 hari) + 3 Feb (1 hari) = 3 hari kerja
    const denganLibur = bagiHariPerBulan({
      tanggalMulai: tanggalDari("2026-01-29"),
      tanggalSelesai: tanggalDari("2026-02-03"),
      jumlahHari: 3,
      satuanHitung: "HARI_KERJA",
      tahunTarget: 2026,
      libur: new Set(["2026-02-02"]),
      rekonsiliasiKeJumlahHari: true,
    });
    expect(denganLibur[0]).toBe(2);
    expect(denganLibur[1]).toBe(1);
    expect(denganLibur.reduce((a, b) => a + b, 0)).toBe(3);
  });

  it("merekonsiliasi cuti tahunan lintas tahun & perubahan hari libur agar total 12 bulan selalu cocok dengan jumlahHari", () => {
    // 30 Des 2025 (Sel) - 2 Jan 2026 (Jum), 1 Jan libur -> 3 hari kerja masuk tahunSaldo 2026
    const lintasTahun = bagiHariPerBulan({
      tanggalMulai: tanggalDari("2025-12-30"),
      tanggalSelesai: tanggalDari("2026-01-02"),
      jumlahHari: 3,
      satuanHitung: "HARI_KERJA",
      tahunTarget: 2026,
      libur: new Set(["2026-01-01"]),
      rekonsiliasiKeJumlahHari: true,
    });
    expect(lintasTahun[0]).toBe(3);
    expect(lintasTahun.reduce((a, b) => a + b, 0)).toBe(3);

    // Non-tahunan kalender lintas tahun: hanya menghitung hari yang jatuh di tahunTarget
    const melahirkan = bagiHariPerBulan({
      tanggalMulai: tanggalDari("2025-12-20"),
      tanggalSelesai: tanggalDari("2026-01-10"),
      jumlahHari: 22,
      satuanHitung: "HARI_KALENDER",
      tahunTarget: 2026,
      libur: new Set(),
      rekonsiliasiKeJumlahHari: false,
    });
    expect(melahirkan[0]).toBe(10); // 1–10 Jan 2026
    expect(melahirkan.reduce((a, b) => a + b, 0)).toBe(10);

    // Jika libur pernah dihapus sesudah cuti disetujui (totalHitung > jumlahHari), tidak pernah menghasilkan angka negatif
    const selisihNegatif = bagiHariPerBulan({
      tanggalMulai: tanggalDari("2026-03-02"),
      tanggalSelesai: tanggalDari("2026-03-06"),
      jumlahHari: 4,
      satuanHitung: "HARI_KERJA",
      tahunTarget: 2026,
      libur: new Set(),
      rekonsiliasiKeJumlahHari: true,
    });
    expect(selisihNegatif[2]).toBe(4);
    expect(selisihNegatif.every((h) => h >= 0)).toBe(true);
  });

  it("menjaga konsistensi total bulanan + terpakaiAwalImpor, tren sisa saldo, dan rincian kuota 3 tahun", () => {
    const saldo = {
      hakTahunIni: 12,
      sisaN1: 4,
      sisaN2: 2,
      penyesuaian: 0,
      terpakai: 7, // 4 hari tercatat dari pengajuan aplikasi + 3 hari dari rekap saldo awal impor
    };
    const dipesan = 2;

    const pengajuan: PengajuanAnalitikInput[] = [
      // Cuti tahunan disetujui lintas bulan: 2 Jan + 2 Feb = 4 hari
      buatPengajuan({
        tanggalMulai: tanggalDari("2026-01-29"),
        tanggalSelesai: tanggalDari("2026-02-03"),
        jumlahHari: 4,
        status: "SURAT_TERBIT",
        tahunSaldo: 2026,
      }),
      // Cuti sakit disetujui (non-tahunan): 3 hari kalender di Maret
      buatPengajuan({
        tanggalMulai: tanggalDari("2026-03-10"),
        tanggalSelesai: tanggalDari("2026-03-12"),
        jumlahHari: 3,
        status: "DISETUJUI",
        tahunSaldo: null,
        potongSaldoTahunan: false,
        satuanHitung: "HARI_KALENDER",
        namaJenis: "Cuti Sakit",
        kodeJenis: "SAKIT",
      }),
      // Pengajuan masih diproses (dihitung ke totalPengajuanDiproses, bukan grafik pemakaian)
      buatPengajuan({
        tanggalMulai: tanggalDari("2026-05-04"),
        tanggalSelesai: tanggalDari("2026-05-05"),
        jumlahHari: 2,
        status: "DIAJUKAN",
        tahunSaldo: 2026,
      }),
      // Pengajuan ditolak (diabaikan)
      buatPengajuan({
        tanggalMulai: tanggalDari("2026-04-06"),
        tanggalSelesai: tanggalDari("2026-04-08"),
        jumlahHari: 3,
        status: "DITOLAK",
        tahunSaldo: 2026,
      }),
    ];

    const hasil = susunAnalitikBeranda({
      tahun: 2026,
      saldo,
      dipesan,
      pengajuan,
      libur: new Set(),
    });

    expect(hasil.ringkasan.totalHak).toBe(18);
    expect(hasil.ringkasan.terpakai).toBe(7);
    expect(hasil.ringkasan.terpakaiTercatatAplikasi).toBe(4);
    expect(hasil.ringkasan.terpakaiAwalImpor).toBe(3);
    expect(hasil.ringkasan.terpakaiTercatatAplikasi + hasil.ringkasan.terpakaiAwalImpor).toBe(saldo.terpakai);
    expect(hasil.ringkasan.tersedia).toBe(saldoTersedia(saldo, dipesan)); // 18 - 7 - 2 = 9
    expect(hasil.ringkasan.cutiLainnyaHari).toBe(3);
    expect(hasil.ringkasan.totalPengajuanDisetujui).toBe(2);
    expect(hasil.ringkasan.totalPengajuanDiproses).toBe(1);

    // Bulanan: Jan = 2 tahunan, Feb = 2 tahunan, Mar = 3 lainnya
    expect(hasil.bulanan[0]).toMatchObject({ label: "Jan", tahunan: 2, lainnya: 0, total: 2 });
    expect(hasil.bulanan[1]).toMatchObject({ label: "Feb", tahunan: 2, lainnya: 0, total: 2 });
    expect(hasil.bulanan[2]).toMatchObject({ label: "Mar", tahunan: 0, lainnya: 3, total: 3 });

    // Tren saldo: Awal = 18 - 3 = 15, Jan = 13, Feb = 11, ..., Des = 11 (cocok persis totalHak - terpakai)
    expect(hasil.trenSaldo).toHaveLength(13);
    expect(hasil.trenSaldo[0]).toMatchObject({ label: "Awal", sisa: 15, terpakaiBulan: 3 });
    expect(hasil.trenSaldo[1]).toMatchObject({ label: "Jan", sisa: 13, terpakaiBulan: 2 });
    expect(hasil.trenSaldo[2]).toMatchObject({ label: "Feb", sisa: 11, terpakaiBulan: 2 });
    expect(hasil.trenSaldo[12].sisa).toBe(totalHak(saldo) - saldo.terpakai);
    expect(hasil.trenSaldo[12].proyeksiSetelahDipesan).toBe(saldoTersedia(saldo, dipesan));

    // Rincian kuota 3 tahun (terpakai 7 -> N-2 habis 2, N-1 habis 4, 2026 terpakai 1)
    expect(hasil.rincianKuota).toEqual([
      { tahun: 2024, label: "Sisa 2024 (N-2)", hak: 2, terpakai: 2, sisa: 0, persenTerpakai: 100 },
      { tahun: 2025, label: "Sisa 2025 (N-1)", hak: 4, terpakai: 4, sisa: 0, persenTerpakai: 100 },
      { tahun: 2026, label: "Hak 2026 (Berjalan)", hak: 12, terpakai: 1, sisa: 11, persenTerpakai: 8 },
    ]);
  });

  it("menangani pegawai baru tanpa saldo dan tanpa pengajuan secara aman (anti-NaN)", () => {
    const hasil = susunAnalitikBeranda({
      tahun: 2026,
      saldo: null,
      dipesan: 0,
      pengajuan: [],
      libur: new Set(),
    });

    expect(hasil.ringkasan.totalHak).toBe(0);
    expect(hasil.ringkasan.tersedia).toBe(0);
    expect(hasil.ringkasan.terpakai).toBe(0);
    expect(hasil.ringkasan.persenTerpakai).toBe(0);
    expect(Number.isNaN(hasil.ringkasan.persenTerpakai)).toBe(false);

    expect(hasil.bulanan).toHaveLength(12);
    expect(hasil.bulanan.every((b) => b.total === 0)).toBe(true);

    expect(hasil.trenSaldo).toHaveLength(13);
    expect(hasil.trenSaldo.every((t) => t.sisa === 0 && !Number.isNaN(t.sisa))).toBe(true);

    expect(hasil.komposisiKuota.every((s) => s.nilai === 0 && s.persen === 0 && !Number.isNaN(s.persen))).toBe(true);
    expect(hasil.rincianKuota.every((r) => r.hak === 0 && r.sisa === 0 && r.persenTerpakai === 0)).toBe(true);
  });

  it("menyusun analitik agregat Mode Admin (hari cuti, tren pengajuan, komposisi status) dan aman saat kosong", () => {
    const kosong = susunAnalitikDinas({
      tahun: 2026,
      pengajuan: [],
      libur: new Set(),
    });
    expect(kosong.totalPengajuan).toBe(0);
    expect(kosong.totalHariDisetujui).toBe(0);
    expect(kosong.komposisiStatus.every((s) => s.nilai === 0 && s.persen === 0)).toBe(true);

    const dinas = susunAnalitikDinas({
      tahun: 2026,
      libur: new Set(),
      pengajuan: [
        buatPengajuan({
          tanggalMulai: tanggalDari("2026-01-29"),
          tanggalSelesai: tanggalDari("2026-02-03"),
          jumlahHari: 4,
          status: "SELESAI",
        }),
        buatPengajuan({
          tanggalMulai: tanggalDari("2026-02-10"),
          tanggalSelesai: tanggalDari("2026-02-11"),
          jumlahHari: 2,
          status: "DIAJUKAN",
        }),
        buatPengajuan({
          tanggalMulai: tanggalDari("2026-02-17"),
          tanggalSelesai: tanggalDari("2026-02-18"),
          jumlahHari: 2,
          status: "DITOLAK",
        }),
        buatPengajuan({
          tanggalMulai: tanggalDari("2026-03-02"),
          tanggalSelesai: tanggalDari("2026-03-03"),
          jumlahHari: 2,
          status: "DIBATALKAN",
        }),
      ],
    });

    expect(dinas.totalPengajuan).toBe(4);
    expect(dinas.totalHariDisetujui).toBe(4);
    expect(dinas.bulananHari[0].tahunan).toBe(2);
    expect(dinas.bulananHari[1].tahunan).toBe(2);
    expect(dinas.bulananPengajuan[0].jumlah).toBe(1);
    expect(dinas.bulananPengajuan[1].jumlah).toBe(2);
    expect(dinas.bulananPengajuan[2].jumlah).toBe(1);

    expect(dinas.komposisiStatus.map((s) => ({ kunci: s.kunci, nilai: s.nilai, persen: s.persen }))).toEqual([
      { kunci: "disetujui", nilai: 1, persen: 25 },
      { kunci: "diproses", nilai: 1, persen: 25 },
      { kunci: "ditolak", nilai: 1, persen: 25 },
      { kunci: "dibatalkan", nilai: 1, persen: 25 },
    ]);
  });

  it("memvalidasi parameter tahun secara aman dan kembali ke tahun berjalan bila tidak sah", () => {
    expect(pilihTahunBeranda("2025", 2026, [2024, 2025, 2026])).toEqual({
      tahun: 2025,
      tahunTersedia: [2026, 2025, 2024],
    });

    // Tahun di luar daftar atau input tidak valid otomatis kembali ke tahun berjalan
    expect(pilihTahunBeranda("2020", 2026, [2025, 2026]).tahun).toBe(2026);
    expect(pilihTahunBeranda("abc", 2026, [2025, 2026]).tahun).toBe(2026);
    expect(pilihTahunBeranda("2025; DROP TABLE", 2026, [2025, 2026]).tahun).toBe(2026);
    expect(pilihTahunBeranda(undefined, 2026, []).tahunTersedia).toEqual([2026]);
  });
});
