import "server-only";
import {
  type HasilAnalitikBeranda,
  type HasilAnalitikDinas,
  type PengajuanAnalitikInput,
  pilihTahunBeranda,
  susunAnalitikBeranda,
  susunAnalitikDinas,
} from "@/lib/domain/beranda-analitik";
import { namaLengkap } from "@/lib/domain/pegawai";
import type { JenisHariLibur, StatusCuti } from "@/lib/generated/prisma/enums";
import { hariIniWita } from "@/lib/tanggal";
import { type PenggunaSaatIni, punyaHakAkses, punyaPeran } from "../auth/pengguna";
import { db } from "../db";
import { hariDipesan } from "../layanan/cuti";
import { hariKerja, setLibur } from "../pengaturan";
import { antreanSaya } from "./cuti";

export interface ItemHariLiburBeranda {
  id: string;
  tanggal: Date;
  nama: string;
  jenis: JenisHariLibur;
}

export interface ItemPengajuanBeranda {
  id: string;
  status: StatusCuti;
  tanggalMulai: Date;
  tanggalSelesai: Date;
  jumlahHari: number;
  jenisCuti: { nama: string };
  namaPegawai?: string;
}

export interface ItemDokumenBeranda {
  id: string;
  namaTampilan: string;
  diunggahPada: Date;
}

export interface DataBerandaPegawai {
  mode: "pegawai";
  hariIni: Date;
  tahun: number;
  tahunSekarang: number;
  tahunTersedia: number[];
  saldo: {
    hakTahunIni: number;
    sisaN1: number;
    sisaN2: number;
    penyesuaian: number;
    terpakai: number;
  } | null;
  dipesan: number;
  analitik: HasilAnalitikBeranda;
  pengajuanTerbaru: ItemPengajuanBeranda[];
  dokumenTerbaru: ItemDokumenBeranda[];
  hariLibur: ItemHariLiburBeranda[];
  menunggu: number | null;
  sedangCuti: number | null;
}

export interface DataBerandaAdmin {
  mode: "admin";
  hariIni: Date;
  tahun: number;
  tahunSekarang: number;
  tahunTersedia: number[];
  menunggu: number;
  sedangCuti: number;
  totalPegawaiAktif: number | null;
  totalAkunAktif: number | null;
  analitikDinas: HasilAnalitikDinas;
  pengajuanTerbaruDinas: ItemPengajuanBeranda[];
  hariLibur: ItemHariLiburBeranda[];
  izin: {
    prosesCuti: boolean;
    kelolaSaldo: boolean;
    kelolaPegawai: boolean;
    pengaturanAdmin: boolean;
  };
}

export type DataBeranda = DataBerandaPegawai | DataBerandaAdmin;

async function ambilAgendaLibur(tahun: number, tahunSekarang: number, hariIni: Date): Promise<ItemHariLiburBeranda[]> {
  if (tahun === tahunSekarang) {
    return db.hariLibur.findMany({
      where: { tanggal: { gte: hariIni } },
      orderBy: { tanggal: "asc" },
      take: 5,
      select: { id: true, tanggal: true, nama: true, jenis: true },
    });
  }
  const awalTahun = new Date(Date.UTC(tahun, 0, 1));
  const akhirTahun = new Date(Date.UTC(tahun, 11, 31));
  return db.hariLibur.findMany({
    where: { tanggal: { gte: awalTahun, lte: akhirTahun } },
    orderBy: { tanggal: "asc" },
    take: 5,
    select: { id: true, tanggal: true, nama: true, jenis: true },
  });
}

function keInputAnalitik(
  baris: readonly {
    tanggalMulai: Date;
    tanggalSelesai: Date;
    jumlahHari: number;
    status: StatusCuti;
    tahunSaldo: number | null;
    jenisCuti: {
      kode: string;
      nama: string;
      satuanHitung: PengajuanAnalitikInput["satuanHitung"];
      potongSaldoTahunan: boolean;
    };
  }[],
): PengajuanAnalitikInput[] {
  return baris.map((p) => ({
    tanggalMulai: p.tanggalMulai,
    tanggalSelesai: p.tanggalSelesai,
    jumlahHari: p.jumlahHari,
    status: p.status,
    tahunSaldo: p.tahunSaldo,
    potongSaldoTahunan: p.jenisCuti.potongSaldoTahunan,
    satuanHitung: p.jenisCuti.satuanHitung,
    namaJenis: p.jenisCuti.nama,
    kodeJenis: p.jenisCuti.kode,
  }));
}

export async function dataBeranda(u: PenggunaSaatIni, tahunDiminta?: string | number): Promise<DataBeranda> {
  const hariIni = hariIniWita();
  const tahunSekarang = hariIni.getUTCFullYear();
  const daftarHariKerja = await hariKerja();

  // ── Mode Pegawai: seluruh data pribadi 100% terisolasi ke u.pegawai.id dari sesi ──
  if (u.pegawai) {
    const pegawaiId = u.pegawai.id;

    const [tahunSaldoDb, tahunPengajuanDb] = await Promise.all([
      db.saldoCuti.findMany({ where: { pegawaiId }, select: { tahun: true } }),
      db.pengajuanCuti.findMany({
        where: { pegawaiId },
        select: { tahunSaldo: true, tanggalMulai: true, tanggalSelesai: true },
      }),
    ]);

    const daftarTahunDb: number[] = [];
    for (const s of tahunSaldoDb) daftarTahunDb.push(s.tahun);
    for (const p of tahunPengajuanDb) {
      if (p.tahunSaldo !== null) daftarTahunDb.push(p.tahunSaldo);
      daftarTahunDb.push(p.tanggalMulai.getUTCFullYear());
      daftarTahunDb.push(p.tanggalSelesai.getUTCFullYear());
    }

    const { tahun, tahunTersedia } = pilihTahunBeranda(tahunDiminta, tahunSekarang, daftarTahunDb);
    const awalTahun = new Date(Date.UTC(tahun, 0, 1));
    const akhirTahun = new Date(Date.UTC(tahun, 11, 31));

    const bolehPantauCuti = punyaHakAkses(u, "KELOLA_SALDO_CUTI", "PROSES_CUTI");

    const [
      saldo,
      dipesan,
      pengajuanTahun,
      pengajuanTerbaru,
      dokumenTerbaru,
      liburSet,
      hariLibur,
      antreanDaftar,
      sedangCuti,
    ] = await Promise.all([
      db.saldoCuti.findUnique({
        where: { pegawaiId_tahun: { pegawaiId, tahun } },
        select: { hakTahunIni: true, sisaN1: true, sisaN2: true, penyesuaian: true, terpakai: true },
      }),
      hariDipesan(pegawaiId, tahun),
      db.pengajuanCuti.findMany({
        where: {
          pegawaiId,
          OR: [
            { tahunSaldo: tahun },
            { tanggalMulai: { lte: akhirTahun }, tanggalSelesai: { gte: awalTahun } },
          ],
        },
        select: {
          tanggalMulai: true,
          tanggalSelesai: true,
          jumlahHari: true,
          status: true,
          tahunSaldo: true,
          jenisCuti: {
            select: { kode: true, nama: true, satuanHitung: true, potongSaldoTahunan: true },
          },
        },
      }),
      db.pengajuanCuti.findMany({
        where: { pegawaiId },
        select: {
          id: true,
          status: true,
          tanggalMulai: true,
          tanggalSelesai: true,
          jumlahHari: true,
          jenisCuti: { select: { nama: true } },
        },
        orderBy: { dibuatPada: "desc" },
        take: 5,
      }),
      db.dokumen.findMany({
        where: { pemilikPegawaiId: pegawaiId, ruang: "PRIBADI", dihapusPada: null },
        select: { id: true, namaTampilan: true, diunggahPada: true },
        orderBy: { diunggahPada: "desc" },
        take: 3,
      }),
      setLibur(awalTahun, akhirTahun),
      ambilAgendaLibur(tahun, tahunSekarang, hariIni),
      antreanSaya(u),
      bolehPantauCuti
        ? db.pengajuanCuti.count({
            where: {
              status: { in: ["DISETUJUI", "SURAT_TERBIT"] },
              tanggalMulai: { lte: hariIni },
              tanggalSelesai: { gte: hariIni },
            },
          })
        : Promise.resolve(null),
    ]);

    const antrean = antreanDaftar.length;
    const menunggu =
      antrean > 0 || punyaHakAkses(u, "PROSES_CUTI") || punyaPeran(u, "ATASAN") ? antrean : null;

    const analitik = susunAnalitikBeranda({
      tahun,
      saldo,
      dipesan,
      pengajuan: keInputAnalitik(pengajuanTahun),
      libur: liburSet,
      hariKerja: daftarHariKerja,
    });

    return {
      mode: "pegawai",
      hariIni,
      tahun,
      tahunSekarang,
      tahunTersedia,
      saldo,
      dipesan,
      analitik,
      pengajuanTerbaru,
      dokumenTerbaru,
      hariLibur,
      menunggu,
      sedangCuti,
    };
  }

  // ── Mode Admin / Superadmin tanpa data pegawai: 0 kueri pribadi, hanya ringkasan dinas berizin ──
  const izin = {
    prosesCuti: punyaHakAkses(u, "PROSES_CUTI"),
    kelolaSaldo: punyaHakAkses(u, "KELOLA_SALDO_CUTI"),
    kelolaPegawai: punyaHakAkses(u, "KELOLA_PEGAWAI"),
    pengaturanAdmin: punyaHakAkses(u, "PENGATURAN_ADMIN"),
  };
  const bolehLihatCuti = izin.prosesCuti || izin.kelolaSaldo;

  const [tahunSaldoDinas, tahunPengajuanDinas] = bolehLihatCuti
    ? await Promise.all([
        db.saldoCuti.findMany({ distinct: ["tahun"], select: { tahun: true } }),
        db.pengajuanCuti.findMany({
          select: { tahunSaldo: true, tanggalMulai: true, tanggalSelesai: true },
        }),
      ])
    : [[], []];

  const daftarTahunDinas: number[] = [];
  for (const s of tahunSaldoDinas) daftarTahunDinas.push(s.tahun);
  for (const p of tahunPengajuanDinas) {
    if (p.tahunSaldo !== null) daftarTahunDinas.push(p.tahunSaldo);
    daftarTahunDinas.push(p.tanggalMulai.getUTCFullYear());
    daftarTahunDinas.push(p.tanggalSelesai.getUTCFullYear());
  }

  const { tahun, tahunTersedia } = pilihTahunBeranda(tahunDiminta, tahunSekarang, daftarTahunDinas);
  const awalTahun = new Date(Date.UTC(tahun, 0, 1));
  const akhirTahun = new Date(Date.UTC(tahun, 11, 31));

  const [
    antreanDaftar,
    sedangCuti,
    totalPegawaiAktif,
    totalAkunAktif,
    pengajuanTahunDinas,
    pengajuanTerbaruDinasRaw,
    liburSet,
    hariLibur,
  ] = await Promise.all([
    antreanSaya(u),
    bolehLihatCuti
      ? db.pengajuanCuti.count({
          where: {
            status: { in: ["DISETUJUI", "SURAT_TERBIT"] },
            tanggalMulai: { lte: hariIni },
            tanggalSelesai: { gte: hariIni },
          },
        })
      : Promise.resolve(0),
    izin.kelolaPegawai || izin.pengaturanAdmin
      ? db.pegawai.count({ where: { aktif: true } })
      : Promise.resolve(null),
    izin.pengaturanAdmin ? db.user.count({ where: { aktif: true } }) : Promise.resolve(null),
    bolehLihatCuti
      ? db.pengajuanCuti.findMany({
          where: {
            OR: [
              { tahunSaldo: tahun },
              { tanggalMulai: { lte: akhirTahun }, tanggalSelesai: { gte: awalTahun } },
            ],
          },
          select: {
            tanggalMulai: true,
            tanggalSelesai: true,
            jumlahHari: true,
            status: true,
            tahunSaldo: true,
            jenisCuti: {
              select: { kode: true, nama: true, satuanHitung: true, potongSaldoTahunan: true },
            },
          },
        })
      : Promise.resolve([]),
    bolehLihatCuti
      ? db.pengajuanCuti.findMany({
          select: {
            id: true,
            status: true,
            tanggalMulai: true,
            tanggalSelesai: true,
            jumlahHari: true,
            jenisCuti: { select: { nama: true } },
            pegawai: { select: { nama: true, gelarDepan: true, gelarBelakang: true } },
          },
          orderBy: { dibuatPada: "desc" },
          take: 5,
        })
      : Promise.resolve([]),
    setLibur(awalTahun, akhirTahun),
    ambilAgendaLibur(tahun, tahunSekarang, hariIni),
  ]);

  const analitikDinas = susunAnalitikDinas({
    tahun,
    pengajuan: keInputAnalitik(pengajuanTahunDinas),
    libur: liburSet,
    hariKerja: daftarHariKerja,
  });

  const pengajuanTerbaruDinas: ItemPengajuanBeranda[] = pengajuanTerbaruDinasRaw.map((p) => ({
    id: p.id,
    status: p.status,
    tanggalMulai: p.tanggalMulai,
    tanggalSelesai: p.tanggalSelesai,
    jumlahHari: p.jumlahHari,
    jenisCuti: p.jenisCuti,
    namaPegawai: namaLengkap(p.pegawai),
  }));

  return {
    mode: "admin",
    hariIni,
    tahun,
    tahunSekarang,
    tahunTersedia,
    menunggu: antreanDaftar.length,
    sedangCuti,
    totalPegawaiAktif,
    totalAkunAktif,
    analitikDinas,
    pengajuanTerbaruDinas,
    hariLibur,
    izin,
  };
}
