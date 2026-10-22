import "server-only";
import { namaLengkap } from "@/lib/domain/pegawai";
import { db } from "../db";

const tgl = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

/** Nilai awal form ubah pegawai (termasuk data sensitif — halaman ini hanya untuk Kepegawaian). */
export async function nilaiFormPegawai(id: string) {
  const p = await db.pegawai.findUnique({ where: { id } });
  if (!p) return null;
  return {
    statusKepegawaian: p.statusKepegawaian,
    nip: p.nip ?? "",
    idNonAsn: p.idNonAsn ?? "",
    gelarDepan: p.gelarDepan ?? "",
    nama: p.nama,
    gelarBelakang: p.gelarBelakang ?? "",
    nik: p.nik ?? "",
    tempatLahir: p.tempatLahir ?? "",
    tanggalLahir: tgl(p.tanggalLahir),
    jenisKelamin: p.jenisKelamin ?? "",
    pendidikanTerakhir: p.pendidikanTerakhir ?? "",
    alamatDomisili: p.alamatDomisili ?? "",
    noHp: p.noHp ?? "",
    email: p.email ?? "",
    pangkatGolonganId: p.pangkatGolonganId ?? "",
    tmtPangkat: tgl(p.tmtPangkat),
    jabatanId: p.jabatanId ?? "",
    tmtJabatan: tgl(p.tmtJabatan),
    unitKerjaId: p.unitKerjaId,
    atasanLangsungId: p.atasanLangsungId ?? "",
    levelSuratOverride: p.levelSuratOverride ?? "",
    tanggalMasuk: tgl(p.tanggalMasuk),
    aktif: p.aktif,
  };
}

export const NILAI_KOSONG = {
  statusKepegawaian: "PNS",
  nip: "", idNonAsn: "", gelarDepan: "", nama: "", gelarBelakang: "", nik: "", tempatLahir: "", tanggalLahir: "",
  jenisKelamin: "", pendidikanTerakhir: "", alamatDomisili: "", noHp: "", email: "", pangkatGolonganId: "", tmtPangkat: "",
  jabatanId: "", tmtJabatan: "", unitKerjaId: "", atasanLangsungId: "", levelSuratOverride: "", tanggalMasuk: "", aktif: true,
};

/** Calon atasan: pegawai aktif yang memegang jabatan pimpinan unit. */
export async function calonAtasan(kecualiId?: string) {
  const ps = await db.pegawai.findMany({
    where: { aktif: true, jabatan: { memimpinUnitId: { not: null } }, ...(kecualiId ? { id: { not: kecualiId } } : {}) },
    include: { jabatan: true },
    orderBy: { jabatan: { kelasJabatan: "desc" } },
  });
  return ps.map((p) => ({ id: p.id, label: `${namaLengkap(p)} — ${p.jabatan?.namaSingkat ?? p.jabatan?.nama}` }));
}
