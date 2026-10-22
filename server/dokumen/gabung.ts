import "server-only";
import { PDFDocument } from "pdf-lib";
import { bacaBerkas } from "./penyimpanan";

/** A4 dalam point PDF. */
const A4 = { lebar: 595.28, tinggi: 841.89, tepi: 28.35 };

export interface BerkasGabung {
  namaTampilan: string;
  ekstensi: string;
  namaFileSimpan: string;
  terenkripsi: boolean;
}

/** DOCX/XLSX → PDF lewat LibreOffice di Gotenberg. */
async function officeKePdf(isi: Buffer, ext: string): Promise<Buffer> {
  const url = process.env.GOTENBERG_URL;
  if (!url) throw new GalatGabung("Layanan konversi (Gotenberg) belum dikonfigurasi, jadi DOCX/XLSX tidak bisa digabung.");
  const fd = new FormData();
  fd.append("files", new Blob([new Uint8Array(isi)]), `berkas.${ext}`);
  let r: Response;
  try {
    r = await fetch(`${url.replace(/\/$/, "")}/forms/libreoffice/convert`, { method: "POST", body: fd, signal: AbortSignal.timeout(90_000) });
  } catch {
    throw new GalatGabung("Layanan konversi (Gotenberg) tidak dapat dihubungi untuk mengubah DOCX/XLSX.");
  }
  if (!r.ok) throw new GalatGabung(`Konversi ${ext.toUpperCase()} gagal (HTTP ${r.status}).`);
  return Buffer.from(await r.arrayBuffer());
}

export class GalatGabung extends Error {}

/**
 * Gabungkan dokumen terpilih menjadi satu PDF, sesuai urutan: PDF disalin
 * halamannya, JPG/PNG ditaruh di halaman A4 (diperkecil agar muat), DOCX/XLSX
 * dikonversi dulu oleh Gotenberg.
 */
export async function gabungkanPdf(daftar: BerkasGabung[]): Promise<Uint8Array> {
  const hasil = await PDFDocument.create();
  hasil.setTitle("Dokumen gabungan");
  hasil.setProducer("Absensi & Cuti ESDM Kalsel");

  for (const d of daftar) {
    const isi = await bacaBerkas(d);
    const ext = d.ekstensi.toLowerCase();
    if (ext === "jpg" || ext === "jpeg" || ext === "png") {
      const gambar = ext === "png" ? await hasil.embedPng(isi) : await hasil.embedJpg(isi);
      const lebarMaks = A4.lebar - 2 * A4.tepi;
      const tinggiMaks = A4.tinggi - 2 * A4.tepi;
      const skala = Math.min(1, lebarMaks / gambar.width, tinggiMaks / gambar.height);
      const w = gambar.width * skala;
      const h = gambar.height * skala;
      const hal = hasil.addPage([A4.lebar, A4.tinggi]);
      hal.drawImage(gambar, { x: (A4.lebar - w) / 2, y: A4.tinggi - A4.tepi - h, width: w, height: h });
      continue;
    }
    const pdf = ext === "pdf" ? isi : await officeKePdf(isi, ext);
    let sumber: PDFDocument;
    try {
      sumber = await PDFDocument.load(pdf, { ignoreEncryption: true });
    } catch {
      throw new GalatGabung(`"${d.namaTampilan}" tidak bisa dibaca sebagai PDF (rusak atau terproteksi).`);
    }
    for (const hal of await hasil.copyPages(sumber, sumber.getPageIndices())) hasil.addPage(hal);
  }
  // Tanpa object stream: lebih kompatibel dengan penampil/printer lama.
  return hasil.save({ useObjectStreams: false });
}
