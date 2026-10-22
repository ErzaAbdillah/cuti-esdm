import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Berkas disimpan di STORAGE_DIR (di luar /public) dengan nama UUID.
 * Dokumen pribadi & lampiran cuti dienkripsi AES-256-GCM: [IV 12B][tag 16B][isi].
 */

export const JENIS_BERKAS = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
} as const;
export type Ekstensi = keyof typeof JENIS_BERKAS;

export const MAKS_BYTE_BAWAAN = 10 * 1024 * 1024;

// Lokasi berkas ditentukan saat runtime; jangan ditelusuri saat build (file tracing).
function folder(): string {
  return path.resolve(/* turbopackIgnore: true */ process.env.STORAGE_DIR || "./.data/berkas");
}

function jalurBerkas(nama: string): string {
  return path.join(/* turbopackIgnore: true */ folder(), nama);
}

function kunci(): Buffer {
  const hex = process.env.BERKAS_KUNCI ?? "";
  if (!/^[0-9a-f]{64}$/i.test(hex)) throw new Error("BERKAS_KUNCI harus 64 karakter hex (lihat .env.example).");
  return Buffer.from(hex, "hex");
}

/** Cek isi berkas (magic bytes), bukan hanya ekstensi. */
function isiSesuai(ext: Ekstensi, b: Buffer): boolean {
  switch (ext) {
    case "pdf":
      return b.subarray(0, 5).toString("latin1") === "%PDF-";
    case "png":
      return b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case "jpg":
    case "jpeg":
      return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case "docx":
    case "xlsx": {
      if (!b.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) return false;
      const isi = b.toString("latin1");
      return ext === "docx" ? isi.includes("word/") : isi.includes("xl/");
    }
  }
}

export type HasilPeriksa = { ok: true; ext: Ekstensi; mime: string } | { ok: false; galat: string };

export function periksaBerkas(nama: string, isi: Buffer, mimeKlaim: string, maksByte = MAKS_BYTE_BAWAAN, izin: readonly Ekstensi[] = Object.keys(JENIS_BERKAS) as Ekstensi[]): HasilPeriksa {
  const ext = path.extname(nama).slice(1).toLowerCase() as Ekstensi;
  if (!izin.includes(ext)) return { ok: false, galat: `Jenis berkas .${ext || "?"} tidak diizinkan. Gunakan ${izin.map((e) => e.toUpperCase()).join(", ")}.` };
  if (isi.length === 0) return { ok: false, galat: "Berkas kosong." };
  if (isi.length > maksByte) return { ok: false, galat: `Ukuran berkas maksimal ${Math.round(maksByte / 1024 / 1024)} MB.` };
  const mime = JENIS_BERKAS[ext];
  // Browser kadang mengirim MIME kosong/generik; yang menentukan tetap isi berkas.
  if (mimeKlaim && mimeKlaim !== "application/octet-stream" && mimeKlaim !== mime) {
    return { ok: false, galat: "Tipe berkas (MIME) tidak sesuai dengan ekstensinya." };
  }
  if (!isiSesuai(ext, isi)) return { ok: false, galat: "Isi berkas tidak sesuai dengan ekstensinya." };
  return { ok: true, ext, mime };
}

export interface BerkasTersimpan {
  namaFileSimpan: string;
  ekstensi: Ekstensi;
  mime: string;
  ukuran: number;
  sha256: string;
  terenkripsi: boolean;
}

export async function simpanBerkas(isi: Buffer, ext: Ekstensi, enkripsi: boolean): Promise<BerkasTersimpan> {
  const namaFileSimpan = randomUUID();
  const sha256 = createHash("sha256").update(isi).digest("hex");
  let data = isi;
  if (enkripsi) {
    const iv = randomBytes(12);
    const c = createCipheriv("aes-256-gcm", kunci(), iv);
    const terenkripsi = Buffer.concat([c.update(isi), c.final()]);
    data = Buffer.concat([iv, c.getAuthTag(), terenkripsi]);
  }
  await mkdir(/* turbopackIgnore: true */ folder(), { recursive: true });
  await writeFile(/* turbopackIgnore: true */ jalurBerkas(namaFileSimpan), data, { flag: "wx" });
  return { namaFileSimpan, ekstensi: ext, mime: JENIS_BERKAS[ext], ukuran: isi.length, sha256, terenkripsi: enkripsi };
}

export async function bacaBerkas(d: { namaFileSimpan: string; terenkripsi: boolean }): Promise<Buffer> {
  if (!/^[0-9a-f-]{36}$/i.test(d.namaFileSimpan)) throw new Error("Nama berkas tidak sah");
  const data = await readFile(/* turbopackIgnore: true */ jalurBerkas(d.namaFileSimpan));
  if (!d.terenkripsi) return data;
  const dc = createDecipheriv("aes-256-gcm", kunci(), data.subarray(0, 12));
  dc.setAuthTag(data.subarray(12, 28));
  return Buffer.concat([dc.update(data.subarray(28)), dc.final()]);
}
