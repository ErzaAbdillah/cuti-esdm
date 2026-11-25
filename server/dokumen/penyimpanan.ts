import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Prisma } from "@/lib/generated/prisma/client";
import { db } from "../db";

/**
 * Penyimpanan berkas dokumen:
 * - Mode bawaan `db` (PENYIMPANAN_DOKUMEN=db): isi biner disimpan di tabel `dokumen_berkas`
 *   secara atomik bersama metadata `dokumen` (aman di Vercel & ikut backup DB).
 * - Mode `disk` (PENYIMPANAN_DOKUMEN=disk): isi biner disimpan di STORAGE_DIR (di luar /public)
 *   dengan nama UUID untuk server kantor mandiri.
 * Dokumen pribadi & lampiran surat izin dienkripsi AES-256-GCM: [IV 12B][tag 16B][isi].
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

export type ModePenyimpanan = "db" | "disk";

export const MAKS_BYTE_BAWAAN = 10 * 1024 * 1024;

export class GalatBerkasTidakDitemukan extends Error {
  constructor(pesan = "Berkas fisik dokumen tidak ditemukan di penyimpanan server. Hubungi Admin/Kepegawaian untuk mengunggah ulang.") {
    super(pesan);
    this.name = "GalatBerkasTidakDitemukan";
  }
}

export class GalatKonfigurasiBerkas extends Error {
  constructor(pesan = "Kunci enkripsi dokumen belum dikonfigurasi di server. Hubungi Admin.") {
    super(pesan);
    this.name = "GalatKonfigurasiBerkas";
  }
}

export function modePenyimpananDokumen(): ModePenyimpanan {
  const mode = (process.env.PENYIMPANAN_DOKUMEN ?? "db").trim().toLowerCase();
  return mode === "disk" ? "disk" : "db";
}

// Lokasi berkas ditentukan saat runtime; jangan ditelusuri saat build (file tracing).
function folder(): string {
  return path.resolve(/* turbopackIgnore: true */ process.env.STORAGE_DIR || "./.data/berkas");
}

function jalurBerkas(nama: string): string {
  return path.join(/* turbopackIgnore: true */ folder(), nama);
}

function kunci(): Buffer {
  const hex = process.env.BERKAS_KUNCI ?? "";
  if (!/^[0-9a-f]{64}$/i.test(hex)) throw new GalatKonfigurasiBerkas();
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

export function periksaBerkas(
  nama: string,
  isi: Buffer,
  mimeKlaim: string,
  maksByte = MAKS_BYTE_BAWAAN,
  izin: readonly Ekstensi[] = Object.keys(JENIS_BERKAS) as Ekstensi[],
): HasilPeriksa {
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

export interface BerkasSiapSimpan extends BerkasTersimpan {
  /** Isi biner (sudah terenkripsi bila `terenkripsi = true`) siap disimpan ke DB atau disk. */
  data: Buffer;
}

/** Siapkan metadata, hash SHA-256, dan enkripsi AES-256-GCM (bila diminta) sebelum transaksi DB. */
export function siapkanBerkas(isi: Buffer, ext: Ekstensi, enkripsi: boolean): BerkasSiapSimpan {
  const namaFileSimpan = randomUUID();
  const sha256 = createHash("sha256").update(isi).digest("hex");
  let data = isi;
  if (enkripsi) {
    const iv = randomBytes(12);
    const c = createCipheriv("aes-256-gcm", kunci(), iv);
    const terenkripsi = Buffer.concat([c.update(isi), c.final()]);
    data = Buffer.concat([iv, c.getAuthTag(), terenkripsi]);
  }
  return { namaFileSimpan, ekstensi: ext, mime: JENIS_BERKAS[ext], ukuran: isi.length, sha256, terenkripsi: enkripsi, data };
}

export function metadataBerkas(siap: BerkasSiapSimpan): BerkasTersimpan {
  return {
    namaFileSimpan: siap.namaFileSimpan,
    ekstensi: siap.ekstensi,
    mime: siap.mime,
    ukuran: siap.ukuran,
    sha256: siap.sha256,
    terenkripsi: siap.terenkripsi,
  };
}

/** Simpan isi berkas sesuai mode aktif (`db` dalam transaksi yang sama, atau `disk`). */
export async function simpanIsiBerkas(dokumenId: string, siap: BerkasSiapSimpan, tx: Prisma.TransactionClient = db): Promise<void> {
  if (modePenyimpananDokumen() === "disk") {
    await mkdir(/* turbopackIgnore: true */ folder(), { recursive: true });
    await writeFile(/* turbopackIgnore: true */ jalurBerkas(siap.namaFileSimpan), siap.data, { flag: "wx" });
    return;
  }
  await tx.dokumenBerkas.create({
    data: { dokumenId, data: Buffer.from(siap.data) },
  });
}

function dekripsiJikaPerlu(data: Buffer, terenkripsi: boolean): Buffer {
  if (!terenkripsi) return data;
  if (data.length < 28) throw new GalatBerkasTidakDitemukan("Isi berkas terenkripsi rusak atau tidak lengkap.");
  const dc = createDecipheriv("aes-256-gcm", kunci(), data.subarray(0, 12));
  dc.setAuthTag(data.subarray(12, 28));
  try {
    return Buffer.concat([dc.update(data.subarray(28)), dc.final()]);
  } catch {
    throw new GalatKonfigurasiBerkas(
      "Berkas terenkripsi tidak dapat dibuka karena kunci enkripsi server tidak cocok atau berkas rusak. Hubungi Admin.",
    );
  }
}

function adalahFileHilang(e: unknown): boolean {
  const code = typeof e === "object" && e !== null && "code" in e ? (e as { code?: unknown }).code : null;
  return code === "ENOENT" || code === "ENOTDIR" || code === "EISDIR";
}

/**
 * Baca isi berkas dengan urutan:
 * 1) Tabel `dokumen_berkas` berdasarkan `id` dokumen.
 * 2) Fallback ke folder disk `STORAGE_DIR` (untuk data lama di server lokal).
 * 3) Jika tetap tidak ditemukan, lempar `GalatBerkasTidakDitemukan`.
 */
export async function bacaBerkas(d: { id?: string; namaFileSimpan: string; terenkripsi: boolean }, tx: Prisma.TransactionClient = db): Promise<Buffer> {
  if (!/^[0-9a-f-]{36}$/i.test(d.namaFileSimpan)) throw new GalatBerkasTidakDitemukan("Nama berkas tidak sah.");

  let data: Buffer | null = null;
  if (d.id) {
    const baris = await tx.dokumenBerkas.findUnique({ where: { dokumenId: d.id }, select: { data: true } });
    if (baris) data = Buffer.from(baris.data);
  }

  if (!data) {
    try {
      data = await readFile(/* turbopackIgnore: true */ jalurBerkas(d.namaFileSimpan));
    } catch (e) {
      if (adalahFileHilang(e)) throw new GalatBerkasTidakDitemukan();
      throw e;
    }
  }

  return dekripsiJikaPerlu(data, d.terenkripsi);
}
