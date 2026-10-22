import "server-only";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { DataPegawai } from "@/lib/validasi/pegawai";
import { db } from "../db";

/** FormData → objek mentah untuk skemaPegawai. */
export function bacaFormPegawai(fd: FormData) {
  const s = (k: string) => String(fd.get(k) ?? "");
  return {
    statusKepegawaian: s("statusKepegawaian"),
    nip: s("nip"),
    idNonAsn: s("idNonAsn"),
    gelarDepan: s("gelarDepan"),
    nama: s("nama"),
    gelarBelakang: s("gelarBelakang"),
    nik: s("nik"),
    tempatLahir: s("tempatLahir"),
    tanggalLahir: s("tanggalLahir"),
    jenisKelamin: s("jenisKelamin"),
    pendidikanTerakhir: s("pendidikanTerakhir"),
    alamatDomisili: s("alamatDomisili"),
    noHp: s("noHp"),
    email: s("email"),
    pangkatGolonganId: s("pangkatGolonganId"),
    tmtPangkat: s("tmtPangkat"),
    jabatanId: s("jabatanId"),
    tmtJabatan: s("tmtJabatan"),
    unitKerjaId: s("unitKerjaId"),
    atasanLangsungId: s("atasanLangsungId"),
    levelSuratOverride: s("levelSuratOverride"),
    tanggalMasuk: s("tanggalMasuk"),
    aktif: fd.get("aktif") === "on",
  };
}

/** Referensi master yang dimuat sekali, untuk memeriksa banyak baris sekaligus (impor). */
export async function muatReferensi(tx: Prisma.TransactionClient = db) {
  const [unit, jabatan, pangkat, pegawai] = await Promise.all([
    tx.unitKerja.findMany({ select: { id: true } }),
    tx.jabatan.findMany({ select: { id: true } }),
    tx.pangkatGolongan.findMany({ select: { id: true, untuk: true } }),
    tx.pegawai.findMany({ select: { id: true } }),
  ]);
  return {
    unit: new Set(unit.map((x) => x.id)),
    jabatan: new Set(jabatan.map((x) => x.id)),
    pangkat: new Map(pangkat.map((x) => [x.id, x.untuk])),
    pegawai: new Set(pegawai.map((x) => x.id)),
  };
}
export type Referensi = Awaited<ReturnType<typeof muatReferensi>>;

/** Referensi ada, golongan sesuai status, atasan sah. */
export function periksaReferensiDengan(ref: Referensi, d: DataPegawai, pegawaiId: string | null) {
  const galat: Record<string, string> = {};
  if (!ref.unit.has(d.unitKerjaId)) galat.unitKerjaId = "Unit kerja tidak ditemukan.";
  if (d.jabatanId && !ref.jabatan.has(d.jabatanId)) galat.jabatanId = "Jabatan tidak ditemukan.";
  if (d.pangkatGolonganId) {
    const untuk = ref.pangkat.get(d.pangkatGolonganId);
    if (!untuk) galat.pangkatGolonganId = "Pangkat/golongan tidak ditemukan.";
    else if (d.statusKepegawaian === "NON_ASN") galat.pangkatGolonganId = "Non-ASN tidak memakai pangkat/golongan.";
    else if (d.statusKepegawaian === "PNS" && untuk !== "PNS") galat.pangkatGolonganId = "PNS harus memakai pangkat/golongan PNS (I/a–IV/e).";
    else if (d.statusKepegawaian !== "PNS" && untuk !== "PPPK") galat.pangkatGolonganId = "PPPK memakai golongan I–XVII.";
  }
  if (d.atasanLangsungId) {
    if (!ref.pegawai.has(d.atasanLangsungId)) galat.atasanLangsungId = "Atasan tidak ditemukan.";
    else if (d.atasanLangsungId === pegawaiId) galat.atasanLangsungId = "Atasan tidak boleh diri sendiri.";
  }
  return galat;
}

export async function periksaReferensi(d: DataPegawai, pegawaiId: string | null, tx: Prisma.TransactionClient = db) {
  return periksaReferensiDengan(await muatReferensi(tx), d, pegawaiId);
}

