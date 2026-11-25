import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { batasUkuranDokumenMb } from "@/lib/dokumen";

const mocks = vi.hoisted(() => ({
  catatAudit: vi.fn(),
  penggunaSaatIni: vi.fn(),
  bolehLihatDokumen: vi.fn(),
  selesaikanCutiLewat: vi.fn(),
  kirimAntreanEmail: vi.fn(),
  dokumenStore: new Map<string, { id: string; namaTampilan: string; namaFileSimpan: string; ekstensi: string; mime: string; terenkripsi: boolean; dihapusPada: Date | null; pengajuanCuti: null }>(),
  berkasStore: new Map<string, Buffer>(),
}));

vi.mock("@/server/audit", () => ({ catatAudit: mocks.catatAudit }));
vi.mock("@/server/auth/pengguna", () => ({ penggunaSaatIni: mocks.penggunaSaatIni }));
vi.mock("@/server/layanan/akses-dokumen", () => ({ bolehLihatDokumen: mocks.bolehLihatDokumen }));
vi.mock("@/server/layanan/cuti", () => ({ selesaikanCutiLewat: mocks.selesaikanCutiLewat }));
vi.mock("@/server/notifikasi", () => ({ kirimAntreanEmail: mocks.kirimAntreanEmail }));
vi.mock("@/server/db", () => ({
  db: {
    dokumen: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => mocks.dokumenStore.get(where.id) ?? null),
    },
    dokumenBerkas: {
      create: vi.fn(async ({ data }: { data: { dokumenId: string; data: Uint8Array } }) => {
        mocks.berkasStore.set(data.dokumenId, Buffer.from(data.data));
        return data;
      }),
      findUnique: vi.fn(async ({ where }: { where: { dokumenId: string } }) => {
        const data = mocks.berkasStore.get(where.dokumenId);
        return data ? { data } : null;
      }),
    },
  },
}));

import { GET as berkasGet } from "@/app/api/dokumen/[id]/berkas/route";
import { GET as cronGet, POST as cronPost } from "@/app/api/tugas/harian/route";
import { GalatGabung, gabungkanPdf } from "@/server/dokumen/gabung";
import {
  bacaBerkas,
  GalatBerkasTidakDitemukan,
  GalatKonfigurasiBerkas,
  periksaBerkas,
  siapkanBerkas,
  simpanIsiBerkas,
} from "@/server/dokumen/penyimpanan";

const KUNCI_UJI = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const DOK_ID = "22222222-2222-4222-8222-222222222222";
const PDF_CONTOH = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

describe("penyimpanan berkas permanen (tabel dokumen_berkas) & batas ukuran", () => {
  const envAsli = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.dokumenStore.clear();
    mocks.berkasStore.clear();
    process.env.PENYIMPANAN_DOKUMEN = "db";
    process.env.BERKAS_KUNCI = KUNCI_UJI;
    process.env.STORAGE_DIR = "./.data/berkas-tidak-ada-uji";
  });

  afterEach(() => {
    process.env = { ...envAsli };
  });

  it("membatasi ukuran unggahan maksimal 4 MB di Vercel dan hingga 10 MB di lokal", () => {
    expect(batasUkuranDokumenMb(10, true)).toBe(4);
    expect(batasUkuranDokumenMb(3, true)).toBe(3);
    expect(batasUkuranDokumenMb(null, true)).toBe(4);
    expect(batasUkuranDokumenMb(10, false)).toBe(10);
    expect(batasUkuranDokumenMb(15, false)).toBe(10);
    expect(batasUkuranDokumenMb(6, false)).toBe(6);

    const file5Mb = Buffer.concat([Buffer.from("%PDF-"), Buffer.alloc(5 * 1024 * 1024)]);
    const cekVercel = periksaBerkas("scan.pdf", file5Mb, "application/pdf", 4 * 1024 * 1024);
    expect(cekVercel.ok).toBe(false);
    if (!cekVercel.ok) expect(cekVercel.galat).toContain("4 MB");
  });

  it("menyimpan berkas terenkripsi AES-256-GCM ke dokumen_berkas dan membacanya kembali persis sama", async () => {
    const siap = siapkanBerkas(PDF_CONTOH, "pdf", true);
    expect(siap.terenkripsi).toBe(true);
    expect(siap.data.equals(PDF_CONTOH)).toBe(false);

    await simpanIsiBerkas(DOK_ID, siap);
    expect(mocks.berkasStore.has(DOK_ID)).toBe(true);

    const hasil = await bacaBerkas({ id: DOK_ID, namaFileSimpan: siap.namaFileSimpan, terenkripsi: true });
    expect(hasil.equals(PDF_CONTOH)).toBe(true);
  });

  it("melempar GalatKonfigurasiBerkas bila BERKAS_KUNCI belum diisi", () => {
    process.env.BERKAS_KUNCI = "";
    expect(() => siapkanBerkas(PDF_CONTOH, "pdf", true)).toThrow(GalatKonfigurasiBerkas);
  });

  it("melempar GalatKonfigurasiBerkas ramah & membalas 503 bila BERKAS_KUNCI tidak cocok saat dekripsi", async () => {
    const siap = siapkanBerkas(PDF_CONTOH, "pdf", true);
    await simpanIsiBerkas(DOK_ID, siap);
    mocks.dokumenStore.set(DOK_ID, {
      id: DOK_ID,
      namaTampilan: "KTP Uji",
      namaFileSimpan: siap.namaFileSimpan,
      ekstensi: "pdf",
      mime: "application/pdf",
      terenkripsi: true,
      dihapusPada: null,
      pengajuanCuti: null,
    });

    // Ganti kunci enkripsi server menjadi kunci lain yang berbeda
    process.env.BERKAS_KUNCI = "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";

    await expect(
      bacaBerkas({ id: DOK_ID, namaFileSimpan: siap.namaFileSimpan, terenkripsi: true }),
    ).rejects.toThrow(GalatKonfigurasiBerkas);

    mocks.penggunaSaatIni.mockResolvedValueOnce({ userId: "u1", wajibGantiPassword: false });
    mocks.bolehLihatDokumen.mockResolvedValueOnce(true);
    const res = await berkasGet(new NextRequest(`http://localhost/api/dokumen/${DOK_ID}/berkas`), {
      params: Promise.resolve({ id: DOK_ID }),
    });
    expect(res.status).toBe(503);
    expect(await res.text()).toContain("kunci enkripsi server tidak cocok");
    expect(mocks.catatAudit).not.toHaveBeenCalled();
  });

  it("mengembalikan 404 ramah tanpa audit unduh palsu jika berkas hilang di DB & disk, dan 403 jika wajibGantiPassword", async () => {
    const siap = siapkanBerkas(PDF_CONTOH, "pdf", false);
    mocks.dokumenStore.set(DOK_ID, {
      id: DOK_ID,
      namaTampilan: "SK Uji",
      namaFileSimpan: siap.namaFileSimpan,
      ekstensi: "pdf",
      mime: "application/pdf",
      terenkripsi: false,
      dihapusPada: null,
      pengajuanCuti: null,
    });
    mocks.bolehLihatDokumen.mockResolvedValue(true);

    // 1. Akun wajib ganti password ditolak 403
    mocks.penggunaSaatIni.mockResolvedValueOnce({ userId: "u1", wajibGantiPassword: true });
    const resWajib = await berkasGet(new NextRequest(`http://localhost/api/dokumen/${DOK_ID}/berkas`), {
      params: Promise.resolve({ id: DOK_ID }),
    });
    expect(resWajib.status).toBe(403);
    expect(await resWajib.text()).toContain("password sementara");

    // 2. Berkas fisik hilang -> 404 ramah & tidak mencatat audit
    mocks.penggunaSaatIni.mockResolvedValueOnce({ userId: "u1", wajibGantiPassword: false });
    const resHilang = await berkasGet(new NextRequest(`http://localhost/api/dokumen/${DOK_ID}/berkas`), {
      params: Promise.resolve({ id: DOK_ID }),
    });
    expect(resHilang.status).toBe(404);
    expect(await resHilang.text()).toContain("tidak ditemukan");
    expect(mocks.catatAudit).not.toHaveBeenCalled();

    // 3. Cetak gabungan juga membungkus GalatBerkasTidakDitemukan menjadi GalatGabung menyebut nama dokumen
    await expect(bacaBerkas({ id: DOK_ID, namaFileSimpan: siap.namaFileSimpan, terenkripsi: false })).rejects.toThrow(
      GalatBerkasTidakDitemukan,
    );
    await expect(
      gabungkanPdf([{ id: DOK_ID, namaTampilan: "SK Uji", ekstensi: "pdf", namaFileSimpan: siap.namaFileSimpan, terenkripsi: false }]),
    ).rejects.toThrow(GalatGabung);
  });
});

describe("jadwal harian otomatis (/api/tugas/harian)", () => {
  const envAsli = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "rahasia-vercel-cron-minimal-32-karakter-uji";
    process.env.TUGAS_TOKEN = "token-docker-lokal-minimal-24-karakter";
    mocks.selesaikanCutiLewat.mockResolvedValue(2);
    mocks.kirimAntreanEmail.mockResolvedValue({ terkirim: 1, gagal: 0 });
  });

  afterEach(() => {
    process.env = { ...envAsli };
  });

  it("menerima GET dengan Bearer CRON_SECRET dan POST dengan Bearer TUGAS_TOKEN, serta menolak token salah 401", async () => {
    const resGet = await cronGet(
      new Request("http://localhost/api/tugas/harian", {
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      }),
    );
    expect(resGet.status).toBe(200);
    expect(await resGet.json()).toEqual({ ok: true, cutiSelesai: 2, email: { terkirim: 1, gagal: 0 } });

    const resPost = await cronPost(
      new Request("http://localhost/api/tugas/harian", {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.TUGAS_TOKEN}` },
      }),
    );
    expect(resPost.status).toBe(200);
    expect(await resPost.json()).toEqual({ ok: true, cutiSelesai: 2, email: { terkirim: 1, gagal: 0 } });

    const resSalah = await cronGet(
      new Request("http://localhost/api/tugas/harian", {
        headers: { authorization: "Bearer token-palsu-salah" },
      }),
    );
    expect(resSalah.status).toBe(401);
  });
});
