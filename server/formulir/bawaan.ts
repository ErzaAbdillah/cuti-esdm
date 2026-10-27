import "server-only";
import type { BarisSisaCuti, IsianFormulir, Pejabat } from "@/lib/formulir/isian";
import { formatNip, parseNip } from "@/lib/domain/nip";
import { namaLengkap } from "@/lib/domain/pegawai";
import { rincianPemakaian } from "@/lib/domain/saldo-cuti";
import type { LevelSurat } from "@/lib/generated/prisma/enums";
import { hariIniWita } from "@/lib/tanggal";
import { db } from "../db";
import { pejabatBerlaku } from "../layanan/pejabat";
import { teksPengaturan } from "../pengaturan";

const SEKDA: Pejabat = { jabatan: "Sekretaris Daerah\nProvinsi Kalimantan Selatan", nama: "", nip: "" };
const GUBERNUR: Pejabat = { jabatan: "Gubernur Kalimantan Selatan", nama: "", nip: "" };

/** "… Sumber Daya Mineral Provinsi Kalimantan Selatan" → dua baris seperti di formulir. */
const duaBaris = (s: string) => s.replace(/ (Provinsi )/i, "\n$1");

/** Masa kerja dari TMT pada NIP (PNS: tahun+bulan, PPPK: tahun), cadangan tanggal masuk. */
function masaKerja(nip: string | null, tanggalMasuk: Date | null, hariIni: Date): string {
  const info = nip ? parseNip(nip) : null;
  let mulai: Date | null = tanggalMasuk;
  if (info?.ok) mulai = new Date(Date.UTC(info.data.tahunTmt, (info.data.bulanTmt ?? 1) - 1, 1));
  if (!mulai) return "";
  const tahun = Math.floor((hariIni.getTime() - mulai.getTime()) / (365.25 * 24 * 3600 * 1000));
  return tahun >= 0 ? `${tahun} Tahun` : "";
}

const angka = (n: number) => (n > 0 ? String(n) : "---");

/**
 * Nilai awal formulir untuk pegawai & level surat, mengikuti contoh formulir
 * per eselon: tujuan surat, atasan (VII), dan pejabat berwenang (VIII).
 */
export async function bawaanFormulir(pegawaiId: string, level: LevelSurat, tahunCuti?: number): Promise<IsianFormulir> {
  const hariIni = hariIniWita();
  const tahun = tahunCuti ?? hariIni.getUTCFullYear();
  const [p, satuanOrganisasi, ttd, saldo] = await Promise.all([
    db.pegawai.findUniqueOrThrow({
      where: { id: pegawaiId },
      include: { jabatan: true, pangkatGolongan: true, atasanLangsung: { include: { jabatan: true } } },
    }),
    teksPengaturan("instansi.nama_lengkap"),
    pejabatBerlaku(level, null, hariIni),
    db.saldoCuti.findUnique({ where: { pegawaiId_tahun: { pegawaiId, tahun } } }),
  ]);

  const kadisJabatan = duaBaris(ttd ? `${ttd.awalan ? `${ttd.awalan} ` : ""}${ttd.jabatanTeks}` : "Kepala Dinas Energi dan Sumber Daya Mineral Provinsi Kalimantan Selatan");
  const kadis: Pejabat = { jabatan: kadisJabatan, nama: ttd?.nama ?? "", nip: ttd?.nip ? formatNip(ttd.nip) : "" };
  const atasanDb: Pejabat | null = p.atasanLangsung
    ? { jabatan: p.atasanLangsung.jabatan?.nama ?? "", nama: namaLengkap(p.atasanLangsung), nip: p.atasanLangsung.nip ? formatNip(p.atasanLangsung.nip) : "" }
    : null;

  const diBanjarbaru = ["Di -", "      Banjarbaru"];
  let kepada: string[];
  let atasan: Pejabat;
  let pejabat: Pejabat;
  switch (level) {
    case "ESELON_II":
      kepada = ["Gubernur Kalimantan Selatan", "u.p. Sekretaris Daerah", "Provinsi Kalimantan Selatan", ...diBanjarbaru];
      atasan = SEKDA;
      pejabat = GUBERNUR;
      break;
    case "ESELON_III":
      kepada = [...kadisJabatan.split("\n"), ...diBanjarbaru];
      atasan = kadis;
      pejabat = SEKDA;
      break;
    default:
      // Staf & Eselon IV: diajukan melalui atasan langsung, diputuskan (Plt.) Kepala Dinas.
      kepada = [...kadisJabatan.split("\n"), ...(atasanDb?.jabatan ? ["Melalui :", atasanDb.jabatan] : []), ...diBanjarbaru];
      atasan = atasanDb ?? kadis;
      pejabat = kadis;
  }

  const golongan = p.pangkatGolongan?.golongan.replace("/", " / ");
  const pakai = saldo ? rincianPemakaian(saldo) : null;
  const catatanTahunan: [BarisSisaCuti, BarisSisaCuti, BarisSisaCuti] = [
    { tahun: String(tahun - 2), sisa: saldo && pakai ? angka(saldo.sisaN2 - pakai.dariN2) : "", keterangan: "" },
    { tahun: String(tahun - 1), sisa: saldo && pakai ? angka(saldo.sisaN1 - pakai.dariN1) : "", keterangan: "" },
    { tahun: String(tahun), sisa: saldo && pakai ? angka(saldo.hakTahunIni + saldo.penyesuaian - pakai.dariN) : "", keterangan: "" },
  ];

  return {
    tanggalSurat: hariIni.toISOString().slice(0, 10),
    hariKosong: true,
    kepada: kepada.join("\n"),
    nama: namaLengkap(p),
    nip: p.nip ? formatNip(p.nip) : (p.idNonAsn ?? ""),
    jabatan: `${p.jabatan?.nama ?? ""}${golongan ? ` – ${golongan}` : ""}`,
    masaKerja: masaKerja(p.nip, p.tanggalMasuk, hariIni),
    unitKerja: satuanOrganisasi,
    lamanya: "",
    catatanTahunan,
    catatanLain: ["", "", "", "", ""],
    telp: p.noHp ?? "",
    atasan,
    pejabat,
  };
}
