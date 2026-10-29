import "server-only";
import { STATUS_DIPROSES, STATUS_DISETUJUI, tahapMenunggu } from "@/lib/domain/alur-cuti";
import { hitungHariKalender, hitungHariKerja } from "@/lib/domain/hari-kerja";
import { tentukanLevelSurat } from "@/lib/domain/level-surat";
import { formatNip } from "@/lib/domain/nip";
import { namaLengkap, pangkatTampil, sebutanStatus } from "@/lib/domain/pegawai";
import { saldoTersedia } from "@/lib/domain/saldo-cuti";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { LevelSurat, TahapPersetujuan } from "@/lib/generated/prisma/enums";
import { formatTanggal, hariIniWita } from "@/lib/tanggal";
import { db } from "../db";
import { hariKerja, setLibur, teksPengaturan } from "../pengaturan";

export async function levelSuratPegawai(p: { jabatan: { jenis: Parameters<typeof tentukanLevelSurat>[0]["jenisJabatan"]; kelasJabatan: number | null } | null; levelSuratOverride: LevelSurat | null }) {
  const mapping = await db.mappingEselon.findMany({ where: { jenisJabatan: "STRUKTURAL" } });
  return tentukanLevelSurat({ jenisJabatan: p.jabatan?.jenis ?? null, kelas: p.jabatan?.kelasJabatan ?? null, override: p.levelSuratOverride }, mapping);
}

/** Tahap persetujuan aktif untuk level (urut). */
export async function tahapanUntuk(level: LevelSurat, tx: Prisma.TransactionClient = db): Promise<TahapPersetujuan[]> {
  const alur = await tx.alurPersetujuan.findMany({ where: { level, aktif: true }, orderBy: { urutan: "asc" } });
  return alur.map((a) => a.tahap);
}

export async function alurTahap(level: LevelSurat, tahap: TahapPersetujuan, tx: Prisma.TransactionClient = db) {
  return tx.alurPersetujuan.findFirst({ where: { level, tahap, aktif: true } });
}

/** Hari pada pengajuan tahunan yang sedang diproses (memesan saldo). */
export async function hariDipesan(pegawaiId: string, tahun: number, kecualiId?: string, tx: Prisma.TransactionClient = db): Promise<number> {
  const r = await tx.pengajuanCuti.aggregate({
    _sum: { jumlahHari: true },
    where: { pegawaiId, tahunSaldo: tahun, status: { in: STATUS_DIPROSES }, jenisCuti: { potongSaldoTahunan: true }, ...(kecualiId ? { id: { not: kecualiId } } : {}) },
  });
  return r._sum.jumlahHari ?? 0;
}

export interface MasukanPengajuan {
  pegawaiId: string;
  jenisCutiId: string;
  mulai: Date;
  selesai: Date;
  /** Pengajuan yang sedang diubah (dikecualikan dari cek bentrok & saldo dipesan). */
  kecualiId?: string;
}

export type HasilValidasi =
  | { ok: true; jumlahHari: number; satuan: "hari kerja" | "hari kalender"; tahunSaldo: number; sisaSetelah: number | null }
  | { ok: false; galat: Partial<Record<"jenisCutiId" | "tanggalMulai" | "tanggalSelesai" | "_", string>>; jumlahHari?: number };

/**
 * Validasi spesifikasi [6]: hari kerja dihitung otomatis, tidak melebihi saldo,
 * tidak bertabrakan dengan cuti lain, tanggal tidak di masa lalu (kecuali sakit/
 * alasan penting), aturan per status kepegawaian dan batas hari per jenis.
 */
export async function validasiPengajuan(m: MasukanPengajuan, tx: Prisma.TransactionClient = db): Promise<HasilValidasi> {
  const [pegawai, jenis] = await Promise.all([
    tx.pegawai.findUnique({ where: { id: m.pegawaiId } }),
    tx.jenisCuti.findUnique({ where: { id: m.jenisCutiId }, include: { aturan: true } }),
  ]);
  if (!pegawai) return { ok: false, galat: { _: "Pegawai tidak ditemukan." } };
  if (!jenis || !jenis.aktif) return { ok: false, galat: { jenisCutiId: "Pilih jenis cuti." } };
  const aturan = jenis.aturan.find((a) => a.statusKepegawaian === pegawai.statusKepegawaian);
  if (!aturan?.berlaku) return { ok: false, galat: { jenisCutiId: `${jenis.nama} tidak berlaku untuk status kepegawaian Anda.` } };
  if (jenis.kode === "MELAHIRKAN" && pegawai.jenisKelamin === "L") return { ok: false, galat: { jenisCutiId: "Cuti Melahirkan hanya untuk pegawai perempuan." } };

  if (m.selesai < m.mulai) return { ok: false, galat: { tanggalSelesai: "Tanggal selesai sebelum tanggal mulai." } };
  const hariIni = hariIniWita();
  if (m.mulai < hariIni && !jenis.bolehTanggalLampau) {
    return { ok: false, galat: { tanggalMulai: `Tanggal mulai tidak boleh di masa lalu untuk ${jenis.nama}.` } };
  }

  const harian = jenis.satuanHitung === "HARI_KERJA";
  const jumlahHari = harian ? hitungHariKerja(m.mulai, m.selesai, await setLibur(m.mulai, m.selesai), await hariKerja()) : hitungHariKalender(m.mulai, m.selesai);
  if (jumlahHari === 0) return { ok: false, galat: { tanggalSelesai: "Rentang ini tidak berisi hari kerja." }, jumlahHari };

  const maks = aturan.maksHari ?? jenis.maksHari;
  if (maks != null && jumlahHari > maks) {
    return { ok: false, galat: { tanggalSelesai: `${jenis.nama} paling lama ${maks} ${harian ? "hari kerja" : "hari"}.` }, jumlahHari };
  }

  const bentrok = await tx.pengajuanCuti.findFirst({
    where: {
      pegawaiId: m.pegawaiId,
      ...(m.kecualiId ? { id: { not: m.kecualiId } } : {}),
      status: { in: [...STATUS_DIPROSES, ...STATUS_DISETUJUI] },
      tanggalMulai: { lte: m.selesai },
      tanggalSelesai: { gte: m.mulai },
    },
    include: { jenisCuti: true },
  });
  if (bentrok) {
    return {
      ok: false,
      galat: { tanggalMulai: `Bertabrakan dengan ${bentrok.jenisCuti.nama} ${formatTanggal(bentrok.tanggalMulai)} – ${formatTanggal(bentrok.tanggalSelesai)}.` },
      jumlahHari,
    };
  }

  const tahunSaldo = m.mulai.getUTCFullYear();
  let sisaSetelah: number | null = null;
  if (jenis.potongSaldoTahunan) {
    // PP 11/2017 Ps. 310: hak cuti tahunan setelah bekerja paling kurang 1 tahun terus-menerus.
    if (pegawai.tanggalMasuk) {
      const setahun = new Date(Date.UTC(pegawai.tanggalMasuk.getUTCFullYear() + 1, pegawai.tanggalMasuk.getUTCMonth(), pegawai.tanggalMasuk.getUTCDate()));
      if (m.mulai < setahun) return { ok: false, galat: { jenisCutiId: `Cuti tahunan baru bisa diambil mulai ${formatTanggal(setahun)} (setelah 1 tahun bekerja).` }, jumlahHari };
    }
    const saldo = await tx.saldoCuti.findUnique({ where: { pegawaiId_tahun: { pegawaiId: m.pegawaiId, tahun: tahunSaldo } } });
    if (!saldo) return { ok: false, galat: { _: `Saldo cuti tahunan ${tahunSaldo} belum diatur Kepegawaian.` }, jumlahHari };
    const tersedia = saldoTersedia(saldo, await hariDipesan(m.pegawaiId, tahunSaldo, m.kecualiId, tx));
    if (jumlahHari > tersedia) {
      return { ok: false, galat: { tanggalSelesai: `Melebihi saldo: tersedia ${tersedia} hari kerja, diminta ${jumlahHari}.` }, jumlahHari };
    }
    sisaSetelah = tersedia - jumlahHari;
  }
  return { ok: true, jumlahHari, satuan: harian ? "hari kerja" : "hari kalender", tahunSaldo, sisaSetelah };
}

/** Identitas pemohon saat diajukan (untuk surat & riwayat — tidak berubah bila data pegawai berubah). */
export async function snapshotIdentitas(pegawaiId: string, tx: Prisma.TransactionClient = db) {
  const p = await tx.pegawai.findUniqueOrThrow({
    where: { id: pegawaiId },
    include: { jabatan: true, pangkatGolongan: true, unitKerja: true, atasanLangsung: { include: { jabatan: true } } },
  });
  // Kepala unit tingkat-1 (Bidang/Sekretariat/UPTD) untuk tembusan surat.
  const units = await tx.unitKerja.findMany({ select: { id: true, parentId: true } });
  const peta = new Map(units.map((u) => [u.id, u]));
  let u = peta.get(p.unitKerjaId);
  while (u?.parentId && peta.get(u.parentId)?.parentId) u = peta.get(u.parentId);
  const kepalaUnit = u ? await tx.jabatan.findFirst({ where: { memimpinUnitId: u.id } }) : null;

  return {
    nama: namaLengkap(p),
    nip: p.nip ? formatNip(p.nip) : (p.idNonAsn ?? ""),
    pangkat: pangkatTampil(p.pangkatGolongan),
    jabatan: p.jabatan?.nama ?? "",
    unit: p.unitKerja.nama,
    satuanOrganisasi: await teksPengaturan("instansi.nama_lengkap"),
    statusKepegawaian: p.statusKepegawaian,
    sebutanStatus: sebutanStatus(p.statusKepegawaian),
    kepalaBidang: kepalaUnit?.nama ?? "",
    atasanJabatan: p.atasanLangsung?.jabatan?.nama ?? "",
  };
}
export type SnapshotIdentitas = Awaited<ReturnType<typeof snapshotIdentitas>>;

/** Pengajuan + tahap yang sedang ditunggu. */
export async function tahapPengajuan(p: { status: Parameters<typeof tahapMenunggu>[0]; levelSurat: LevelSurat; atasanLangsungId: string | null }, tx: Prisma.TransactionClient = db) {
  return tahapMenunggu(p.status, await tahapanUntuk(p.levelSurat, tx), !!p.atasanLangsungId);
}

/** Saat disetujui pejabat: potong saldo cuti tahunan. */
export async function terapkanPersetujuan(pengajuanId: string, olehUserId: string, tx: Prisma.TransactionClient) {
  const p = await tx.pengajuanCuti.findUniqueOrThrow({ where: { id: pengajuanId }, include: { jenisCuti: true } });
  if (p.jenisCuti.potongSaldoTahunan) {
    const saldo = await tx.saldoCuti.findUnique({ where: { pegawaiId_tahun: { pegawaiId: p.pegawaiId, tahun: p.tahunSaldo ?? p.tanggalMulai.getUTCFullYear() } } });
    if (!saldo) throw new Error("SALDO_TIDAK_ADA");
    await tx.saldoCuti.update({ where: { id: saldo.id }, data: { terpakai: { increment: p.jumlahHari } } });
    await tx.mutasiSaldoCuti.create({ data: { saldoId: saldo.id, pengajuanId, jenis: "PEMOTONGAN", jumlah: -p.jumlahHari, olehUserId, catatan: `${p.jenisCuti.nama} disetujui` } });
  }
}

/** Tugas terjadwal: cuti yang suratnya sudah terbit dan tanggalnya lewat → Selesai. */
export async function selesaikanCutiLewat(hariIni = hariIniWita()): Promise<number> {
  const daftar = await db.pengajuanCuti.findMany({ where: { status: "SURAT_TERBIT", tanggalSelesai: { lt: hariIni } }, select: { id: true } });
  for (const p of daftar) {
    await db.$transaction([
      db.pengajuanCuti.updateMany({ where: { id: p.id, status: "SURAT_TERBIT" }, data: { status: "SELESAI" } }),
      db.riwayatStatusCuti.create({ data: { pengajuanId: p.id, dariStatus: "SURAT_TERBIT", keStatus: "SELESAI", olehUserId: null, catatan: "Otomatis setelah tanggal selesai cuti" } }),
    ]);
  }
  return daftar.length;
}

/** Saat cuti yang sudah disetujui dibatalkan: kembalikan saldo. */
export async function batalkanPersetujuan(pengajuanId: string, olehUserId: string, tx: Prisma.TransactionClient) {
  const p = await tx.pengajuanCuti.findUniqueOrThrow({ where: { id: pengajuanId }, include: { jenisCuti: true } });
  const potong = await tx.mutasiSaldoCuti.findFirst({ where: { pengajuanId, jenis: "PEMOTONGAN" } });
  if (potong) {
    await tx.saldoCuti.update({ where: { id: potong.saldoId }, data: { terpakai: { decrement: -potong.jumlah } } });
    await tx.mutasiSaldoCuti.create({ data: { saldoId: potong.saldoId, pengajuanId, jenis: "PENGEMBALIAN", jumlah: -potong.jumlah, olehUserId, catatan: `${p.jenisCuti.nama} dibatalkan` } });
  }
}
