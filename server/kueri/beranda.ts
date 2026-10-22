import "server-only";
import type { StatusCuti } from "@/lib/generated/prisma/enums";
import { DEF_PENGATURAN } from "@/lib/pengaturan";
import { hariIniWita } from "@/lib/tanggal";
import { type PenggunaSaatIni, punyaPeran } from "../auth/pengguna";
import { db } from "../db";

const STATUS_PROSES: StatusCuti[] = ["DIAJUKAN", "DISETUJUI_ATASAN", "DIVERIFIKASI", "DISETUJUI"];

export async function dataBeranda(u: PenggunaSaatIni) {
  const hariIni = hariIniWita();
  const tahun = hariIni.getUTCFullYear();
  const pegawaiId = u.pegawai?.id;

  const [saldo, dipesan, pengajuan, absen, dokumen, libur] = await Promise.all([
    pegawaiId ? db.saldoCuti.findUnique({ where: { pegawaiId_tahun: { pegawaiId, tahun } } }) : null,
    pegawaiId
      ? db.pengajuanCuti.aggregate({
          _sum: { jumlahHari: true },
          where: { pegawaiId, status: { in: STATUS_PROSES }, tahunSaldo: tahun, jenisCuti: { potongSaldoTahunan: true } },
        })
      : null,
    pegawaiId
      ? db.pengajuanCuti.findMany({
          where: { pegawaiId },
          include: { jenisCuti: true },
          orderBy: { dibuatPada: "desc" },
          take: 3,
        })
      : [],
    pegawaiId ? db.absensi.findUnique({ where: { pegawaiId_tanggal: { pegawaiId, tanggal: hariIni } } }) : null,
    pegawaiId
      ? db.dokumen.findMany({
          where: { pemilikPegawaiId: pegawaiId, ruang: "PRIBADI", dihapusPada: null },
          orderBy: { diunggahPada: "desc" },
          take: 4,
        })
      : [],
    db.hariLibur.findUnique({ where: { tanggal: hariIni } }),
  ]);

  const atasan = punyaPeran(u, "ATASAN") && pegawaiId
    ? await db.pengajuanCuti.count({ where: { atasanLangsungId: pegawaiId, status: "DIAJUKAN" } })
    : null;

  let kepegawaian: { menungguVerifikasi: number; hadir: number; jumlahPegawai: number } | null = null;
  if (punyaPeran(u, "KEPEGAWAIAN")) {
    const [menungguVerifikasi, hadir, jumlahPegawai] = await Promise.all([
      db.pengajuanCuti.count({ where: { status: "DISETUJUI_ATASAN" } }),
      db.absensi.count({ where: { tanggal: hariIni, status: { in: ["HADIR", "TERLAMBAT"] } } }),
      db.pegawai.count({ where: { aktif: true } }),
    ]);
    kepegawaian = { menungguVerifikasi, hadir, jumlahPegawai };
  }

  let pengaturanKosong: string[] = [];
  if (punyaPeran(u, "ADMIN")) {
    const wajib = DEF_PENGATURAN.filter((d) => d.wajib);
    const isi = await db.pengaturan.findMany({ where: { kunci: { in: wajib.map((d) => d.kunci) } } });
    const terisi = new Set(isi.filter((p) => p.nilai !== null && p.nilai !== "").map((p) => p.kunci));
    pengaturanKosong = wajib.filter((d) => !terisi.has(d.kunci)).map((d) => d.label);
  }

  return {
    hariIni,
    tahun,
    saldo,
    dipesan: dipesan?._sum.jumlahHari ?? 0,
    pengajuan,
    absen,
    dokumen,
    libur,
    atasan,
    kepegawaian,
    pengaturanKosong,
  };
}
