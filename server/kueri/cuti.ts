import "server-only";
import { tahapMenunggu, STATUS_DIPROSES } from "@/lib/domain/alur-cuti";
import { namaLengkap } from "@/lib/domain/pegawai";
import { hariIniWita } from "@/lib/tanggal";
import type { PenggunaSaatIni } from "../auth/pengguna";
import { db } from "../db";
import { hariDipesan, tahapanUntuk } from "../layanan/cuti";
import { bolehPutuskan, modeTahap } from "../layanan/wewenang-cuti";

export async function dataCutiSaya(pegawaiId: string) {
  const tahun = hariIniWita().getUTCFullYear();
  const [saldo, dipesan, pengajuan] = await Promise.all([
    db.saldoCuti.findUnique({ where: { pegawaiId_tahun: { pegawaiId, tahun } } }),
    hariDipesan(pegawaiId, tahun),
    db.pengajuanCuti.findMany({ where: { pegawaiId }, include: { jenisCuti: true }, orderBy: { dibuatPada: "desc" } }),
  ]);
  return { tahun, saldo, dipesan, pengajuan };
}

/** Opsi form pengajuan: jenis cuti yang berlaku untuk status kepegawaian pemohon + calon penanggung jawab. */
export async function opsiPengajuan(pegawaiId: string) {
  const p = await db.pegawai.findUniqueOrThrow({ where: { id: pegawaiId }, include: { atasanLangsung: { include: { jabatan: true } } } });
  const [jenis, rekan] = await Promise.all([
    db.jenisCuti.findMany({
      where: {
        aktif: true,
        aturan: { some: { statusKepegawaian: p.statusKepegawaian, berlaku: true } },
        ...(p.jenisKelamin === "L" ? { kode: { not: "MELAHIRKAN" } } : {}),
      },
      orderBy: { kode: "asc" },
    }),
    db.pegawai.findMany({
      where: {
        aktif: true,
        id: { not: pegawaiId },
        OR: [{ unitKerjaId: p.unitKerjaId }, ...(p.atasanLangsungId ? [{ id: p.atasanLangsungId }, { atasanLangsungId: p.atasanLangsungId }] : [])],
      },
      orderBy: { nama: "asc" },
    }),
  ]);
  const urutan = ["TAHUNAN", "SAKIT", "ALASAN_PENTING", "MELAHIRKAN", "BESAR", "CLTN"];
  return {
    jenis: jenis
      .sort((a, b) => urutan.indexOf(a.kode) - urutan.indexOf(b.kode))
      .map((j) => ({ id: j.id, nama: j.nama, wajibLampiran: j.wajibLampiran, bolehTanggalLampau: j.bolehTanggalLampau, kode: j.kode, potongSaldoTahunan: j.potongSaldoTahunan })),
    rekan: rekan.map((r) => ({ id: r.id, nama: namaLengkap(r) })),
    atasan: p.atasanLangsung ? `${namaLengkap(p.atasanLangsung)} — ${p.atasanLangsung.jabatan?.nama ?? ""}` : null,
    noHp: p.noHp ?? "",
    alamat: p.alamatDomisili ?? "",
  };
}

export async function detailPengajuan(id: string) {
  return db.pengajuanCuti.findUnique({
    where: { id },
    include: {
      jenisCuti: true,
      pegawai: { include: { jabatan: true } },
      penanggungJawab: true,
      atasanLangsung: { include: { jabatan: true } },
      riwayat: { include: { oleh: { include: { pegawai: true } } }, orderBy: { waktu: "asc" } },
      lampiran: { where: { dihapusPada: null }, orderBy: { diunggahPada: "asc" } },
    },
  });
}

/** Pengajuan yang menunggu keputusan pengguna ini (untuk antrean & beranda). */
export async function antreanSaya(u: PenggunaSaatIni) {
  const proses = await db.pengajuanCuti.findMany({
    where: { status: { in: STATUS_DIPROSES } },
    include: { jenisCuti: true, pegawai: true },
    orderBy: { dibuatPada: "asc" },
  });
  const tahapanCache = new Map<string, Awaited<ReturnType<typeof tahapanUntuk>>>();
  const hasil = [];
  for (const p of proses) {
    if (!tahapanCache.has(p.levelSurat)) tahapanCache.set(p.levelSurat, await tahapanUntuk(p.levelSurat));
    const tahap = tahapMenunggu(p.status, tahapanCache.get(p.levelSurat)!, !!p.atasanLangsungId);
    if (tahap && (await bolehPutuskan(u, p, tahap))) {
      hasil.push({ ...p, tahap, eksternal: tahap === "PEJABAT_BERWENANG" && (await modeTahap(p.levelSurat, tahap)) === "EKSTERNAL" });
    }
  }
  return hasil;
}
