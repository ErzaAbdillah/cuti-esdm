import { describe, expect, it, vi } from "vitest";
import { FILTER_UNIT_PJLP, idTurunan, susunOpsiUnitFilterPegawai, urutkanPohon } from "@/lib/domain/unit";

vi.mock("server-only", () => ({}));

const UNIT_CONTOH = [
  { id: "00000000-0000-4000-8000-000000000001", parentId: null, kode: "DINAS", nama: "Dinas Energi dan Sumber Daya Mineral", urutan: 0 },
  { id: "00000000-0000-4000-8000-000000000002", parentId: "00000000-0000-4000-8000-000000000001", kode: "SEKRETARIAT", nama: "Sekretariat", urutan: 1 },
  { id: "00000000-0000-4000-8000-000000000003", parentId: "00000000-0000-4000-8000-000000000002", kode: "SUBBAG_UK", nama: "Sub Bagian Umum dan Kepegawaian", urutan: 2 },
  { id: "00000000-0000-4000-8000-000000000004", parentId: "00000000-0000-4000-8000-000000000001", kode: "BIDANG_GEOLOGI", nama: "Bidang Geologi", urutan: 3 },
  { id: "00000000-0000-4000-8000-000000000005", parentId: "00000000-0000-4000-8000-000000000004", kode: "SEKSI_PAT", nama: "Seksi Pendayagunaan Air Tanah", urutan: 4 },
  { id: "00000000-0000-4000-8000-000000000006", parentId: "00000000-0000-4000-8000-000000000001", kode: "BIDANG_PERTAMBANGAN", nama: "Bidang Pertambangan", urutan: 5 },
  { id: "00000000-0000-4000-8000-000000000007", parentId: "00000000-0000-4000-8000-000000000001", kode: "BIDANG_ENERGI", nama: "Bidang Energi", urutan: 6 },
  { id: "00000000-0000-4000-8000-000000000008", parentId: "00000000-0000-4000-8000-000000000001", kode: "BIDANG_KETENAGALISTRIKAN", nama: "Bidang Ketenagalistrikan", urutan: 7 },
  { id: "00000000-0000-4000-8000-000000000009", parentId: "00000000-0000-4000-8000-000000000001", kode: "UPTD_LAB", nama: "UPTD Laboratorium Energi dan Sumber Daya Mineral", urutan: 8 },
];

vi.mock("@/server/db", () => ({
  db: {
    unitKerja: {
      findMany: vi.fn(async () => UNIT_CONTOH),
    },
    mappingEselon: {
      findMany: vi.fn(async () => []),
    },
  },
}));

describe("filter unit kerja Data Pegawai", () => {
  it("hanya menyusun 5 unit utama dan PJLP untuk dropdown filter, sementara pohon lengkap tetap utuh untuk form pegawai", () => {
    const filterUnit = susunOpsiUnitFilterPegawai(UNIT_CONTOH);
    expect(filterUnit.map((u) => u.label)).toEqual([
      "Sekretariat",
      "Geologi",
      "Pertambangan",
      "Energi",
      "Ketenagalistrikan",
      "PJLP",
    ]);
    expect(filterUnit.at(-1)).toEqual({
      id: FILTER_UNIT_PJLP,
      label: "PJLP",
      kode: FILTER_UNIT_PJLP,
    });

    // Pohon lengkap untuk form Tambah/Ubah Pegawai masih menyimpan subbagian & seksi
    const pohonLengkap = urutkanPohon(UNIT_CONTOH);
    expect(pohonLengkap).toHaveLength(UNIT_CONTOH.length);
    expect(pohonLengkap.some((u) => u.kode === "SUBBAG_UK")).toBe(true);
    expect(pohonLengkap.some((u) => u.kode === "SEKSI_PAT")).toBe(true);
  });

  it("menerima unit=PJLP dan UUID valid di bacaFilter & menyaring NON_ASN atau turunan unit di kondisiFilter", async () => {
    const { bacaFilter, kondisiFilter } = await import("@/server/kueri/pegawai");

    // 1. Filter PJLP lolos validasi dan diterjemahkan ke statusKepegawaian NON_ASN
    const filterPjlp = bacaFilter({ unit: "PJLP" });
    expect(filterPjlp.unit).toBe("PJLP");
    const kondisiPjlp = await kondisiFilter(filterPjlp);
    expect(kondisiPjlp).toEqual({
      AND: [{ aktif: true }, { statusKepegawaian: "NON_ASN" }],
    });

    // 2. Filter bidang (UUID) ikut menyertakan seluruh seksi turunannya
    const idGeologi = "00000000-0000-4000-8000-000000000004";
    const filterGeologi = bacaFilter({ unit: idGeologi });
    expect(filterGeologi.unit).toBe(idGeologi);
    const kondisiGeologi = await kondisiFilter(filterGeologi);
    expect(kondisiGeologi).toEqual({
      AND: [{ aktif: true }, { unitKerjaId: { in: [...idTurunan(idGeologi, UNIT_CONTOH)] } }],
    });

    // 3. Nilai unit sembarang tetap ditolak aman menjadi undefined
    const filterNgawur = bacaFilter({ unit: "BUKAN_UNIT_SAH" });
    expect(filterNgawur.unit).toBeUndefined();
  });
});
