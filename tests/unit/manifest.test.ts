import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";
import { config, proxy } from "@/proxy";

const ROOT = process.cwd();
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function bacaDimensiPng(relPath: string) {
  const fullPath = join(ROOT, relPath);
  expect(existsSync(fullPath), `Berkas ikon tidak ditemukan: ${relPath}`).toBe(true);
  const buf = readFileSync(fullPath);
  expect(buf.subarray(0, 8).equals(PNG_MAGIC), `${relPath} bukan PNG sah`).toBe(true);
  return {
    lebar: buf.readUInt32BE(16),
    tinggi: buf.readUInt32BE(20),
    ukuranByte: buf.length,
  };
}

describe("dukungan PWA (manifest, ikon resmi, & akses publik proxy)", () => {
  it("mengembalikan metadata manifest PWA yang lengkap dengan tema bawaan Langit Pagi dan 3 entri ikon terpisah", () => {
    const m = manifest();
    expect(m.id).toBe("/");
    expect(m.name).toBe("Layanan Cuti ESDM Kalsel");
    expect(m.short_name).toBe("Cuti ESDM");
    expect(m.lang).toBe("id");
    expect(m.dir).toBe("ltr");
    expect(m.start_url).toBe("/");
    expect(m.scope).toBe("/");
    expect(m.display).toBe("standalone");
    expect(m.display_override).toEqual(["standalone", "minimal-ui"]);
    expect(m.background_color).toBe("#F0F9FF");
    expect(m.theme_color).toBe("#0369A1");
    expect(m.orientation).toBeUndefined();

    expect(m.icons).toEqual([
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ]);
  });

  it("menyediakan 4 berkas PNG ikon resmi dengan dimensi tepat dan tanpa Service Worker cache offline", () => {
    expect(bacaDimensiPng("public/icons/icon-192.png")).toMatchObject({ lebar: 192, tinggi: 192 });
    expect(bacaDimensiPng("public/icons/icon-512.png")).toMatchObject({ lebar: 512, tinggi: 512 });
    expect(bacaDimensiPng("public/icons/icon-maskable-512.png")).toMatchObject({ lebar: 512, tinggi: 512 });
    expect(bacaDimensiPng("public/icons/apple-touch-icon.png")).toMatchObject({ lebar: 180, tinggi: 180 });

    // Tidak ada Service Worker offline agar nol data pribadi ASN tersimpan di cache browser
    expect(existsSync(join(ROOT, "public/sw.js"))).toBe(false);
    expect(existsSync(join(ROOT, "public/service-worker.js"))).toBe(false);
  });

  it("meloloskan manifest & ikon sebelum login di proxy.ts tanpa melonggarkan proteksi halaman & API data", () => {
    const polaMatcher = config.matcher[0];
    expect(polaMatcher).toContain("manifest.webmanifest");
    expect(polaMatcher).toContain("icons/");
    expect(polaMatcher).toContain("apple-icon.png");
    expect(polaMatcher).toContain("icon.png");

    // Tanpa cookie sesi: manifest & ikon tetap lolos (tidak 307 ke /login)
    const resManifest = proxy(new NextRequest("http://localhost:3000/manifest.webmanifest"));
    expect(resManifest.status).toBe(200);
    expect(resManifest.headers.get("location")).toBeNull();

    const resIkon = proxy(new NextRequest("http://localhost:3000/icons/icon-192.png"));
    expect(resIkon.status).toBe(200);
    expect(resIkon.headers.get("location")).toBeNull();

    // Tanpa cookie sesi: halaman aplikasi & API data tetap dialihkan ke /login
    for (const jalur of ["/beranda", "/pegawai", "/cuti", "/api/dokumen/abc/berkas"]) {
      const res = proxy(new NextRequest(`http://localhost:3000${jalur}`));
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/login");
    }
  });
});
