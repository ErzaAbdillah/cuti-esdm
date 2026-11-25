import * as XLSX from "xlsx";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { unitDaftarHadir } from "@/lib/domain/daftar-hadir";
import { buatNamaSheetUnik } from "@/lib/excel";
import type { PenggunaSaatIni } from "@/server/auth/pengguna";

class RedirectStop extends Error {
  constructor(public tujuan: string) {
    super(`NEXT_REDIRECT:${tujuan}`);
  }
}

const state = vi.hoisted(() => ({
  pengguna: null as PenggunaSaatIni | null,
  pengajuanMap: new Map<string, Record<string, unknown>>(),
  saldoMap: new Map<string, { id: string; pegawaiId: string; tahun: number; hakTahunIni: number; sisaN1: number; sisaN2: number; penyesuaian: number; terpakai: number }>(),
  unitRows: [] as { id: string; parentId: string | null }[],
  pegawaiRows: [] as { id: string; nip: string | null }[],
  updateManyCount: 1,
  riwayatDibuat: 0,
  mutasiDibuat: 0,
  saldoDiubah: 0,
}));

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new RedirectStop(url);
  }),
  revalidatePath: vi.fn(),
  catatAudit: vi.fn(),
  kirimNotifikasi: vi.fn(),
  userDariPegawai: vi.fn(async () => "u-target"),
  userDenganHakAkses: vi.fn(async () => ["u-proses"]),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/server/audit", () => ({ catatAudit: mocks.catatAudit }));
vi.mock("@/server/notifikasi", () => ({
  kirimNotifikasi: mocks.kirimNotifikasi,
  userDariPegawai: mocks.userDariPegawai,
  userDenganHakAkses: mocks.userDenganHakAkses,
}));
vi.mock("@/server/auth/pengguna", () => ({
  wajibLogin: vi.fn(async () => {
    if (!state.pengguna) throw new RedirectStop("/login");
    return state.pengguna;
  }),
  adalahSuperadmin: (u: PenggunaSaatIni) => u.peran.has("SUPERADMIN") || u.loginId.toLowerCase() === "admin",
  punyaPeran: (u: PenggunaSaatIni, ...p: string[]) => p.some((x) => u.peran.has(x as never)),
  punyaHakAkses: (u: PenggunaSaatIni, ...h: string[]) =>
    u.peran.has("SUPERADMIN") || h.some((x) => u.hakAkses.has(x as never)),
}));
vi.mock("@/server/pengaturan", () => ({
  semuaPengaturan: vi.fn(async () => new Map()),
  teksPengaturan: vi.fn(async () => "Dinas ESDM Kalsel"),
  hariKerja: vi.fn(async () => [1, 2, 3, 4, 5]),
  setLibur: vi.fn(async () => new Set<string>()),
  maksUkuranDokumenMb: vi.fn(async () => 4),
}));

vi.mock("@/server/db", () => {
  const tx = {
    $executeRaw: vi.fn(async () => 0),
    pengajuanCuti: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => state.pengajuanMap.get(where.id) ?? null),
      findUniqueOrThrow: vi.fn(async ({ where }: { where: { id: string } }) => {
        const p = state.pengajuanMap.get(where.id);
        if (!p) throw new Error("Tidak ada");
        return p;
      }),
      findMany: vi.fn(async () => [...state.pengajuanMap.values()]),
      updateMany: vi.fn(async () => ({ count: state.updateManyCount })),
    },
    riwayatStatusCuti: {
      findFirst: vi.fn(async () => null),
      create: vi.fn(async () => {
        state.riwayatDibuat += 1;
        return { id: "r1" };
      }),
    },
    alurPersetujuan: {
      findMany: vi.fn(async () => [{ tahap: "PEJABAT_BERWENANG", urutan: 1, aktif: true }]),
      findFirst: vi.fn(async () => ({ tahap: "PEJABAT_BERWENANG", mode: "PENGGUNA", penyetujuUserId: null, aktif: true })),
    },
    saldoCuti: {
      findUnique: vi.fn(async ({ where }: { where: { pegawaiId_tahun: { pegawaiId: string; tahun: number } } }) =>
        state.saldoMap.get(`${where.pegawaiId_tahun.pegawaiId}:${where.pegawaiId_tahun.tahun}`) ?? null,
      ),
      update: vi.fn(async () => {
        state.saldoDiubah += 1;
      }),
      upsert: vi.fn(async () => {
        state.saldoDiubah += 1;
        return { id: "s1" };
      }),
    },
    mutasiSaldoCuti: {
      create: vi.fn(async () => {
        state.mutasiDibuat += 1;
      }),
    },
    aksesFolder: {
      findMany: vi.fn(async () => []),
    },
    unitKerja: {
      findMany: vi.fn(async () => state.unitRows),
      update: vi.fn(async () => ({ id: "u1" })),
      create: vi.fn(async () => ({ id: "u1" })),
    },
    pegawai: {
      findMany: vi.fn(async () => state.pegawaiRows),
    },
    pejabatPenandatangan: {
      findMany: vi.fn(async () => []),
    },
  };
  return {
    db: {
      ...tx,
      $transaction: async <T>(fn: (t: typeof tx) => Promise<T>) => fn(tx),
    },
  };
});

import { batalkanCuti, pratinjauCuti, setujuiCuti, simpanFormulir, tolakCuti } from "@/server/aksi/cuti";
import { simpanUnit } from "@/server/aksi/master";
import { imporSaldo } from "@/server/aksi/saldo";
import { bolehLihatDataSensitif } from "@/server/kueri/pegawai-detail";
import { bolehAturNomorSurat, bolehLihatPengajuan, bolehUbahSurat } from "@/server/layanan/akses-cuti";
import { bolehDokumenPribadi, hakFolder } from "@/server/layanan/akses-dokumen";
import { selesaikanCutiLewat, terapkanPersetujuan } from "@/server/layanan/cuti";

const PEG_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PEG_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PENGAJUAN_B = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const JENIS_TAHUNAN = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const UNIT_A = "11111111-1111-4111-8111-111111111111";
const UNIT_B = "22222222-2222-4222-8222-222222222222";

function buatUser(override: Partial<PenggunaSaatIni>): PenggunaSaatIni {
  return {
    userId: "u-a",
    sesiId: "s-a",
    loginId: "199001012015011001",
    googleEmail: null,
    fotoUrl: null,
    wajibGantiPassword: false,
    peran: new Set(["PEGAWAI"]),
    hakAkses: new Set(),
    pegawai: { id: PEG_A, namaLengkap: "Pegawai A", nip: "19900101 201501 1 001", jabatan: "Staf", unitId: UNIT_A, unit: "Sekretariat" },
    ...override,
  };
}

describe("Gelombang 1: isolasi ketat hak akses modular", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.pengajuanMap.clear();
  });

  it("pemegang PENGATURAN_ADMIN saja (bahkan jika masih punya peran ADMIN) tidak bisa mengakses dokumen pribadi, data sensitif, atau cuti orang lain", async () => {
    const adminTerbatas = buatUser({
      peran: new Set(["PEGAWAI", "ADMIN"]),
      hakAkses: new Set(["PENGATURAN_ADMIN"]),
    });

    expect(bolehDokumenPribadi(adminTerbatas, PEG_B)).toBe(false);
    expect(bolehDokumenPribadi(adminTerbatas, PEG_A)).toBe(true);
    expect(bolehLihatDataSensitif(adminTerbatas, PEG_B)).toBe(false);
    expect(bolehLihatDataSensitif(adminTerbatas, PEG_A)).toBe(true);
    expect(bolehUbahSurat(adminTerbatas, { pegawaiId: PEG_B })).toBe(false);
    expect(bolehAturNomorSurat(adminTerbatas)).toBe(false);
    expect(await hakFolder(adminTerbatas, "folder-1")).toEqual({ lihat: false, kelola: false });
    expect(
      await bolehLihatPengajuan(adminTerbatas, {
        id: PENGAJUAN_B,
        pegawaiId: PEG_B,
        atasanLangsungId: null,
        levelSurat: "STAF",
        status: "DIAJUKAN",
      }),
    ).toBe(false);
  });

  it("akun eks-KEPEGAWAIAN yang dicabut hak PROSES_CUTI tidak lagi lolos pemeriksaan cuti", async () => {
    const eksKepegawaian = buatUser({
      peran: new Set(["PEGAWAI", "KEPEGAWAIAN"]),
      hakAkses: new Set(["KELOLA_PEGAWAI"]),
    });
    expect(bolehUbahSurat(eksKepegawaian, { pegawaiId: PEG_B })).toBe(false);
    expect(bolehAturNomorSurat(eksKepegawaian)).toBe(false);
  });
});

describe("Gelombang 2: privasi pratinjauCuti, integritas transaksi, saldo kurang, & BERUBAH", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.pengajuanMap.clear();
    state.saldoMap.clear();
    state.updateManyCount = 1;
    state.riwayatDibuat = 0;
    state.mutasiDibuat = 0;
    state.saldoDiubah = 0;
  });

  it("pratinjauCuti menolak kecualiId milik rekan kerja tanpa membocorkan saldo/tanggal", async () => {
    state.pengguna = buatUser({});
    state.pengajuanMap.set(PENGAJUAN_B, { id: PENGAJUAN_B, pegawaiId: PEG_B });

    const res = await pratinjauCuti({
      jenisCutiId: JENIS_TAHUNAN,
      tanggalMulai: "2026-07-01",
      tanggalSelesai: "2026-07-05",
      kecualiId: PENGAJUAN_B,
    });
    expect(res).toEqual({ galat: "Anda tidak berhak mengakses pengajuan ini." });
  });

  it("simpanFormulir menolak id bukan UUID sebelum menyentuh DB", async () => {
    state.pengguna = buatUser({});
    const res = await simpanFormulir("bukan-uuid", {} as never);
    expect(res.galat).toBe("Pengajuan tidak ditemukan.");
  });

  it("setujuiCuti / terapkanPersetujuan menolak bila saldo berkurang sebelum persetujuan (SALDO_KURANG)", async () => {
    state.pengguna = buatUser({ hakAkses: new Set(["PROSES_CUTI"]) });
    state.pengajuanMap.set(PENGAJUAN_B, {
      id: PENGAJUAN_B,
      pegawaiId: PEG_B,
      atasanLangsungId: null,
      levelSurat: "STAF",
      status: "DIAJUKAN",
      jumlahHari: 8,
      tahunSaldo: 2026,
      tanggalMulai: new Date("2026-07-01T00:00:00Z"),
      tanggalSelesai: new Date("2026-07-10T00:00:00Z"),
      snapshotIdentitas: { nama: "Pegawai B" },
      jenisCuti: { nama: "Cuti Tahunan", potongSaldoTahunan: true },
      pegawai: { id: PEG_B },
    });
    state.saldoMap.set(`${PEG_B}:2026`, {
      id: "saldo-b",
      pegawaiId: PEG_B,
      tahun: 2026,
      hakTahunIni: 12,
      sisaN1: 0,
      sisaN2: 0,
      penyesuaian: 0,
      terpakai: 10, // tersisa hanya 2 hari < 8 hari
    });

    const res = await setujuiCuti(PENGAJUAN_B, "OK");
    expect(res.galat).toContain("tidak mencukupi");
    expect(state.saldoDiubah).toBe(0);
    expect(terapkanPersetujuan).toBeTypeOf("function");
  });

  it("tolakCuti & batalkanCuti menangkap BERUBAH menjadi pesan ramah tanpa error mentah", async () => {
    state.updateManyCount = 0;
    state.pengajuanMap.set(PENGAJUAN_B, {
      id: PENGAJUAN_B,
      pegawaiId: PEG_B,
      atasanLangsungId: null,
      levelSurat: "STAF",
      status: "DIAJUKAN",
      tanggalMulai: new Date("2099-07-01T00:00:00Z"),
      tanggalSelesai: new Date("2099-07-05T00:00:00Z"),
      jenisCuti: { nama: "Cuti Tahunan", potongSaldoTahunan: true },
      pegawai: { id: PEG_B },
    });

    state.pengguna = buatUser({ hakAkses: new Set(["PROSES_CUTI"]) });
    const resTolak = await tolakCuti(PENGAJUAN_B, "Alasan penolakan cukup panjang");
    expect(resTolak.galat).toContain("baru saja berubah");

    state.pengguna = buatUser({ pegawai: { id: PEG_B, namaLengkap: "Pegawai B", nip: null, jabatan: null, unitId: UNIT_A, unit: "Sekretariat" } });
    const resBatal = await batalkanCuti(PENGAJUAN_B, "Batal");
    expect(resBatal.galat).toContain("baru saja berubah");
  });

  it("selesaikanCutiLewat tidak mencatat riwayat ganda bila updateMany mengembalikan 0", async () => {
    state.pengajuanMap.set(PENGAJUAN_B, { id: PENGAJUAN_B });
    state.updateManyCount = 0;

    const jumlah = await selesaikanCutiLewat(new Date("2026-11-25T00:00:00Z"));
    expect(jumlah).toBe(0);
    expect(state.riwayatDibuat).toBe(0);
  });
});

describe("Gelombang 3: impor saldo NIP ganda, nama sheet unik, & anti-loop unit kerja", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.unitRows = [];
    state.pegawaiRows = [];
    state.saldoDiubah = 0;
  });

  it("imporSaldo menolak tahun di luar 2020–2100 dan menolak berkas Excel berisi NIP ganda", async () => {
    state.pengguna = buatUser({ hakAkses: new Set(["KELOLA_SALDO_CUTI"]) });
    state.pegawaiRows = [{ id: PEG_A, nip: "199001012015011001" }];

    const resTahun = await imporSaldo(1999, {}, new FormData());
    expect(resTahun.galat).toContain("2020");

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ["NIP", "Sisa N-2", "Sisa N-1", "Hak Tahun Ini", "Terpakai"],
      ["199001012015011001", 0, 2, 12, 0],
      ["19900101 201501 1 001", 0, 3, 12, 1],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, "Saldo");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    const fd = new FormData();
    fd.set("berkas", new File([new Uint8Array(buf)], "saldo.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));

    const resGanda = await imporSaldo(2026, {}, fd);
    expect(resGanda.galat).toContain("ganda");
    expect(resGanda.galat).toContain("baris 2");
    expect(state.saldoDiubah).toBe(0);
  });

  it("buatNamaSheetUnik menjaga maks. 31 karakter dan menghindari bentrok awalan kembar", () => {
    const terpakai = new Set<string>();
    const s1 = buatNamaSheetUnik("BIDANG ENERGI DAN KETENAGALISTRIKAN A", terpakai);
    const s2 = buatNamaSheetUnik("BIDANG ENERGI DAN KETENAGALISTRIKAN B", terpakai);
    const s3 = buatNamaSheetUnik("bidang energi dan ketenagalistrikan c", terpakai);
    const s4 = buatNamaSheetUnik("Unit: [A/B]*?", terpakai);

    expect(s1.length).toBeLessThanOrEqual(31);
    expect(s2.length).toBeLessThanOrEqual(31);
    expect(s3.length).toBeLessThanOrEqual(31);
    expect(s1).not.toBe(s2);
    expect(s2).toContain("(2)");
    expect(s3).toContain("(3)");
    expect(s4).toBe("Unit AB");
  });

  it("simpanUnit menolak induk melingkar A -> B -> A dan unitDaftarHadir tidak terjebak infinite loop", async () => {
    state.pengguna = buatUser({ hakAkses: new Set(["PENGATURAN_ADMIN"]) });
    state.unitRows = [
      { id: UNIT_A, parentId: UNIT_B },
      { id: UNIT_B, parentId: null },
    ];

    const fd = new FormData();
    fd.set("kode", "UNIT_B");
    fd.set("nama", "Unit B");
    fd.set("singkatan", "UB");
    fd.set("jenis", "BIDANG");
    fd.set("parentId", UNIT_A);

    await expect(simpanUnit(UNIT_B, fd)).rejects.toThrow(/galat=.*melingkar/i);

    const petaLoop = new Map([
      [UNIT_A, { id: UNIT_A, parentId: UNIT_B }],
      [UNIT_B, { id: UNIT_B, parentId: UNIT_A }],
    ]);
    expect(unitDaftarHadir(UNIT_A, petaLoop)).toBeNull();
  });
});
