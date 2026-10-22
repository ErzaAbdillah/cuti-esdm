import "server-only";
import * as XLSX from "xlsx";
import { normalisasiNip, parseNip } from "@/lib/domain/nip";
import { skemaPegawai } from "@/lib/validasi/pegawai";
import { db } from "../db";
import { muatReferensi, periksaReferensiDengan } from "../layanan/pegawai";
import { KOLOM_PEGAWAI, type KunciKolom } from "./kolom-pegawai";

export const MAKS_BARIS_IMPOR = 1000;

export interface BarisImpor {
  baris: number;
  nama: string;
  identitas: string;
  aksi: "BARU" | "UBAH";
  galat: string[];
  /** Nilai mentah; divalidasi ulang di server saat disimpan (klien tidak dipercaya). */
  nilai: Record<string, string | boolean>;
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

function teksSel(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}

/** Tanggal Excel (Date) atau teks YYYY-MM-DD / DD-MM-YYYY / DD/MM/YYYY → YYYY-MM-DD. */
function teksTanggal(v: unknown): string {
  if (v instanceof Date) {
    // SheetJS membaca tanggal pada tengah malam waktu lokal; ambil komponen lokalnya.
    const y = v.getFullYear();
    return `${y}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
  }
  const s = teksSel(v);
  const m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return s;
}

function statusDari(teks: string, nip: string): string {
  const t = norm(teks).replace(/[-_]/g, " ");
  if (t === "pns") return "PNS";
  if (t === "pppk") return "PPPK";
  if (t.includes("paruh")) return "PPPK_PARUH_WAKTU";
  if (t.includes("non")) return "NON_ASN";
  if (t) return teks; // biar skema yang menolak
  if (!nip) return "NON_ASN";
  const h = parseNip(nip);
  return h.ok && h.data.jenis === "PPPK" ? "PPPK" : "PNS";
}

export interface HasilPratinjau {
  galat?: string;
  baris?: BarisImpor[];
  /** Kolom yang ada di berkas; kolom yang tidak ada tidak mengubah data lama. */
  kolomAda?: KunciKolom[];
}

export async function pratinjauImpor(buffer: ArrayBuffer): Promise<HasilPratinjau> {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: "array", cellDates: true, dense: true });
  } catch {
    return { galat: "Berkas tidak bisa dibaca. Gunakan format .xlsx dari template." };
  }
  const sheet = wb.Sheets["Pegawai"] ?? wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null });
  if (data.length < 2) return { galat: "Sheet kosong. Isi data mulai baris ke-2 di bawah judul kolom." };

  const judul = (data[0] as unknown[]).map((j) => norm(teksSel(j)));
  const indeks = new Map<KunciKolom, number>();
  for (const k of KOLOM_PEGAWAI) {
    const i = judul.indexOf(norm(k.judul));
    if (i >= 0) indeks.set(k.kunci, i);
  }
  const wajib: KunciKolom[] = ["nama", "unitKerja"];
  const hilang = wajib.filter((k) => !indeks.has(k)).map((k) => KOLOM_PEGAWAI.find((x) => x.kunci === k)!.judul);
  if (hilang.length) return { galat: `Kolom wajib tidak ditemukan: ${hilang.join(", ")}. Gunakan template.` };

  const isiBaris = data.slice(1).map((r, i) => ({ r: r as unknown[], no: i + 2 })).filter(({ r }) => r.some((v) => teksSel(v) !== ""));
  if (isiBaris.length > MAKS_BARIS_IMPOR) return { galat: `Maksimal ${MAKS_BARIS_IMPOR} baris per impor.` };

  const [units, jabatan, pangkat, pegawaiAda, ref] = await Promise.all([
    db.unitKerja.findMany(),
    db.jabatan.findMany(),
    db.pangkatGolongan.findMany(),
    db.pegawai.findMany({ select: { id: true, nip: true, idNonAsn: true } }),
    muatReferensi(),
  ]);
  const unitPer = new Map<string, string>();
  for (const u of units) {
    unitPer.set(norm(u.kode), u.id);
    unitPer.set(norm(u.nama), u.id);
    if (u.singkatan) unitPer.set(norm(u.singkatan), u.id);
  }
  const jabatanPer = new Map<string, string>();
  for (const j of jabatan) {
    jabatanPer.set(norm(j.nama), j.id);
    if (j.namaSingkat) jabatanPer.set(norm(j.namaSingkat), j.id);
  }
  const nipKeId = new Map(pegawaiAda.filter((p) => p.nip).map((p) => [p.nip!, p.id]));
  const idNonAsnKeId = new Map(pegawaiAda.filter((p) => p.idNonAsn).map((p) => [norm(p.idNonAsn!), p.id]));

  const hasil: BarisImpor[] = [];
  const nipDiFile = new Map<string, number>();
  const semuaNipFile = new Set(isiBaris.map(({ r }) => normalisasiNip(teksSel(r[indeks.get("nip") ?? -1]))).filter(Boolean));

  for (const { r, no } of isiBaris) {
    const ambil = (k: KunciKolom) => (indeks.has(k) ? r[indeks.get(k)!] : null);
    const galat: string[] = [];

    const nipMentah = ambil("nip");
    if (typeof nipMentah === "number") galat.push("NIP tersimpan sebagai angka di Excel (digit terakhir bisa hilang). Ubah format sel NIP menjadi Teks.");
    const nip = normalisasiNip(teksSel(nipMentah));
    const idNonAsn = teksSel(ambil("idNonAsn"));
    const status = statusDari(teksSel(ambil("statusKepegawaian")), nip);

    let jabatanId = "";
    const namaJabatan = teksSel(ambil("jabatan"));
    if (namaJabatan) {
      const n = norm(namaJabatan).replace(/^jf\s+/, "").replace(/^kasie\b/, "kepala seksi").replace(/^kasubbag\b/, "kepala sub bagian");
      jabatanId = jabatanPer.get(norm(namaJabatan)) ?? jabatanPer.get(n) ?? "";
      if (!jabatanId) galat.push(`Jabatan "${namaJabatan}" tidak ada di master jabatan.`);
    }

    const namaUnit = teksSel(ambil("unitKerja"));
    const unitKerjaId = unitPer.get(norm(namaUnit)) ?? "";
    if (!unitKerjaId) galat.push(namaUnit ? `Unit kerja "${namaUnit}" tidak dikenal.` : "Unit kerja wajib diisi.");

    let pangkatGolonganId = "";
    const gol = teksSel(ambil("golongan")).replace(/^golongan\s+/i, "");
    if (gol && gol !== "-") {
      const kode = (gol.split(/[–-]\s*/).pop() ?? gol).trim().replace(/\s+/g, "");
      const cocok = pangkat.find((p) =>
        status === "PNS" ? p.untuk === "PNS" && p.golongan.toLowerCase() === kode.toLowerCase() : p.untuk === "PPPK" && p.golongan.toUpperCase() === kode.toUpperCase(),
      );
      if (cocok) pangkatGolonganId = cocok.id;
      else galat.push(`Golongan "${gol}" tidak dikenal untuk status ${status}.`);
    }

    const jk = norm(teksSel(ambil("jenisKelamin")));
    const aktifTeks = norm(teksSel(ambil("aktif")));

    const nilai = {
      statusKepegawaian: status,
      nip,
      idNonAsn,
      gelarDepan: teksSel(ambil("gelarDepan")),
      nama: teksSel(ambil("nama")),
      gelarBelakang: teksSel(ambil("gelarBelakang")),
      nik: teksSel(ambil("nik")).replace(/\s/g, ""),
      tempatLahir: teksSel(ambil("tempatLahir")),
      tanggalLahir: teksTanggal(ambil("tanggalLahir")),
      jenisKelamin: jk.startsWith("l") ? "L" : jk.startsWith("p") ? "P" : "",
      pendidikanTerakhir: teksSel(ambil("pendidikanTerakhir")),
      alamatDomisili: teksSel(ambil("alamatDomisili")),
      noHp: teksSel(ambil("noHp")),
      email: teksSel(ambil("email")),
      pangkatGolonganId,
      tmtPangkat: teksTanggal(ambil("tmtPangkat")),
      jabatanId,
      tmtJabatan: teksTanggal(ambil("tmtJabatan")),
      unitKerjaId,
      atasanLangsungId: "",
      levelSuratOverride: "",
      tanggalMasuk: teksTanggal(ambil("tanggalMasuk")),
      aktif: !(aktifTeks === "tidak" || aktifTeks === "nonaktif" || aktifTeks === "n"),
      nipAtasan: normalisasiNip(teksSel(ambil("nipAtasan"))),
    };

    const v = skemaPegawai.safeParse(nilai);
    if (!v.success) {
      for (const i of v.error.issues) {
        const kolom = KOLOM_PEGAWAI.find((k) => k.kunci === i.path[0])?.judul ?? String(i.path[0] ?? "");
        if (!(i.path[0] === "unitKerjaId" && !unitKerjaId)) galat.push(`${kolom}: ${i.message}`);
      }
    } else {
      for (const [k, pesan] of Object.entries(periksaReferensiDengan(ref, v.data, null))) {
        if (k !== "atasanLangsungId") galat.push(pesan);
      }
    }

    const kunci = nip || norm(idNonAsn);
    if (kunci) {
      const sebelumnya = nipDiFile.get(kunci);
      if (sebelumnya) galat.push(`NIP/ID sama dengan baris ${sebelumnya}.`);
      else nipDiFile.set(kunci, no);
    }
    if (nilai.nipAtasan && !nipKeId.has(nilai.nipAtasan) && !semuaNipFile.has(nilai.nipAtasan)) {
      galat.push(`NIP atasan ${nilai.nipAtasan} tidak ditemukan.`);
    }

    const sudahAda = nip ? nipKeId.has(nip) : idNonAsn ? idNonAsnKeId.has(norm(idNonAsn)) : false;
    hasil.push({ baris: no, nama: nilai.nama || "(tanpa nama)", identitas: nip || idNonAsn || "-", aksi: sudahAda ? "UBAH" : "BARU", galat, nilai });
  }
  return { baris: hasil, kolomAda: [...indeks.keys()] };
}
