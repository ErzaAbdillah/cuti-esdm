import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { inisialNama, MAKS_BYTE_FOTO_PROFIL, periksaFotoProfil, urlFotoProfil } from "@/lib/foto-profil";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  catatAudit: vi.fn(),
  penggunaSaatIni: vi.fn(),
  wajibLogin: vi.fn(),
  fotoProfil: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/server/audit", () => ({ catatAudit: mocks.catatAudit }));
vi.mock("@/server/auth/pengguna", () => ({
  penggunaSaatIni: mocks.penggunaSaatIni,
  wajibLogin: mocks.wajibLogin,
}));
vi.mock("@/server/db", () => ({
  db: { fotoProfil: mocks.fotoProfil },
}));

import { GET } from "@/app/api/profil/foto/[userId]/route";
import { hapusFotoProfil, unggahFotoProfil } from "@/server/aksi/profil";

const PNG_SAH = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const JPEG_SAH = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const WEBP_SAH = Uint8Array.from([
  0x52, 0x49, 0x46, 0x46, 0x12, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20,
]);
const USER_ID = "11111111-1111-4111-8111-111111111111";

describe("helper foto profil", () => {
  it("menerima gambar JPG, PNG, dan WebP yang magic bytes-nya asli", () => {
    expect(periksaFotoProfil("foto.jpg", JPEG_SAH, "image/jpeg")).toEqual({ ok: true, mime: "image/jpeg" });
    expect(periksaFotoProfil("foto.png", PNG_SAH, "image/png")).toEqual({ ok: true, mime: "image/png" });
    expect(periksaFotoProfil("foto.webp", WEBP_SAH, "image/webp")).toEqual({ ok: true, mime: "image/webp" });
  });

  it("menolak SVG, berkas palsu, ukuran berlebih, dan ekstensi tidak cocok", () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    expect(periksaFotoProfil("jahat.svg", svg, "image/svg+xml").ok).toBe(false);
    expect(periksaFotoProfil("palsu.png", svg, "image/png").ok).toBe(false);
    expect(periksaFotoProfil("ketukar.jpg", PNG_SAH, "image/jpeg").ok).toBe(false);
    expect(periksaFotoProfil("kosong.png", new Uint8Array(0), "image/png").ok).toBe(false);

    const besar = new Uint8Array(MAKS_BYTE_FOTO_PROFIL + 1);
    besar.set(JPEG_SAH);
    expect(periksaFotoProfil("besar.jpg", besar, "image/jpeg").ok).toBe(false);
  });

  it("menghitung inisial nama dan URL foto berversi dengan benar", () => {
    expect(inisialNama("Ir. Budi Santoso, M.Si")).toBe("BS");
    expect(inisialNama("H. Ahmad")).toBe("A");
    expect(inisialNama("   ")).toBe("?");
    expect(urlFotoProfil(USER_ID, null)).toBeNull();
    expect(urlFotoProfil(USER_ID, new Date(1700000000000))).toBe(`/api/profil/foto/${USER_ID}?v=1700000000000`);
  });
});

describe("aksi & endpoint foto profil", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.penggunaSaatIni.mockResolvedValue({ userId: USER_ID });
    mocks.wajibLogin.mockResolvedValue({ userId: USER_ID });
  });

  it("menyimpan foto yang sah, mencatat audit, dan merefresh layout", async () => {
    const fd = new FormData();
    fd.set("foto", new File([WEBP_SAH], "foto-profil.webp", { type: "image/webp" }));

    const res = await unggahFotoProfil({}, fd);
    expect(res.sukses).toContain("berhasil disimpan");
    expect(mocks.fotoProfil.upsert).toHaveBeenCalledTimes(1);
    expect(mocks.catatAudit).toHaveBeenCalledWith(expect.objectContaining({ aksi: "UNGGAH_FOTO_PROFIL", userId: USER_ID }));
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("menolak unggahan berkas palsu pada server action", async () => {
    const fd = new FormData();
    fd.set("foto", new File([Buffer.from("<script>alert(1)</script>")], "xss.jpg", { type: "image/jpeg" }));

    const res = await unggahFotoProfil({}, fd);
    expect(res.galat).toBeTruthy();
    expect(mocks.fotoProfil.upsert).not.toHaveBeenCalled();
  });

  it("menghapus foto profil dan mencatat audit", async () => {
    mocks.fotoProfil.findUnique.mockResolvedValueOnce({ mime: "image/webp", ukuran: 16 });
    const res = await hapusFotoProfil({});
    expect(res.sukses).toContain("berhasil dihapus");
    expect(mocks.fotoProfil.delete).toHaveBeenCalledWith({ where: { userId: USER_ID } });
    expect(mocks.catatAudit).toHaveBeenCalledWith(expect.objectContaining({ aksi: "HAPUS_FOTO_PROFIL", userId: USER_ID }));
  });

  it("menolak akses endpoint foto tanpa login dan untuk pegawai nonaktif", async () => {
    mocks.penggunaSaatIni.mockResolvedValueOnce(null);
    const resAnon = await GET(new NextRequest(`http://localhost/api/profil/foto/${USER_ID}`), {
      params: Promise.resolve({ userId: USER_ID }),
    });
    expect(resAnon.status).toBe(401);

    mocks.fotoProfil.findUnique.mockResolvedValueOnce({
      data: Buffer.from(PNG_SAH),
      mime: "image/png",
      ukuran: PNG_SAH.length,
      diubahPada: new Date(1700000000000),
      user: { aktif: true, pegawai: { aktif: false } },
    });
    const resNonaktif = await GET(new NextRequest(`http://localhost/api/profil/foto/${USER_ID}`), {
      params: Promise.resolve({ userId: USER_ID }),
    });
    expect(resNonaktif.status).toBe(404);
  });

  it("menyajikan foto beserta header keamanan dan mendukung 304 ETag", async () => {
    mocks.fotoProfil.findUnique.mockResolvedValue({
      data: Buffer.from(PNG_SAH),
      mime: "image/png",
      ukuran: PNG_SAH.length,
      diubahPada: new Date(1700000000000),
      user: { aktif: true, pegawai: { aktif: true } },
    });

    const req = new NextRequest(`http://localhost/api/profil/foto/${USER_ID}?v=1700000000000`);
    const res = await GET(req, { params: Promise.resolve({ userId: USER_ID }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("Cache-Control")).toContain("private");

    const etag = res.headers.get("ETag")!;
    const req304 = new NextRequest(`http://localhost/api/profil/foto/${USER_ID}?v=1700000000000`, {
      headers: { "if-none-match": etag },
    });
    const res304 = await GET(req304, { params: Promise.resolve({ userId: USER_ID }) });
    expect(res304.status).toBe(304);
  });
});
