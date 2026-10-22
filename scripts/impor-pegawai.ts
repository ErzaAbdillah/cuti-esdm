/**
 * Impor pegawai dari Excel lewat terminal (validasi & aturan sama dengan menu Impor Excel):
 *   npm run impor:pegawai -- <berkas.xlsx> [--simpan]
 * Tanpa --simpan hanya memeriksa. Berkas data asli jangan disimpan di repo (folder data-impor/ diabaikan git).
 */
import { readFileSync } from "node:fs";
import { pratinjauImpor } from "../server/excel/impor-pegawai";
import { simpanImporPegawai } from "../server/layanan/impor-pegawai";

async function main() {
  const [berkas, ...opsi] = process.argv.slice(2);
  if (!berkas) throw new Error("Pemakaian: npm run impor:pegawai -- <berkas.xlsx> [--simpan]");
  const b = readFileSync(berkas);
  const h = await pratinjauImpor(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
  if (h.galat) throw new Error(h.galat);
  const salah = h.baris!.filter((r) => r.galat.length);
  for (const r of salah) console.log(`baris ${r.baris} (${r.nama}): ${r.galat.join("; ")}`);
  const baru = h.baris!.filter((r) => r.aksi === "BARU").length;
  console.log(`${h.baris!.length} baris: ${baru} baru, ${h.baris!.length - baru} diperbarui, ${salah.length} bermasalah.`);
  if (salah.length) throw new Error("Perbaiki baris bermasalah lalu ulangi.");
  if (!opsi.includes("--simpan")) return console.log("Pemeriksaan saja. Tambahkan --simpan untuk menyimpan.");
  const s = await simpanImporPegawai({ baris: h.baris!.map((r) => r.nilai), kolomAda: h.kolomAda ?? [] }, null);
  if (s.galat) throw new Error(s.galat);
  console.log(`Tersimpan: ${s.baru} baru, ${s.ubah} diperbarui.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
