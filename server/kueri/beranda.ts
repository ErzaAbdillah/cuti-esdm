import "server-only";
import { DEF_PENGATURAN } from "@/lib/pengaturan";
import { hariIniWita } from "@/lib/tanggal";
import { type PenggunaSaatIni, punyaPeran } from "../auth/pengguna";
import { db } from "../db";
import { hariDipesan } from "../layanan/cuti";
import { antreanSaya } from "./cuti";

export async function dataBeranda(u: PenggunaSaatIni) {
  const hariIni = hariIniWita();
  const tahun = hariIni.getUTCFullYear();
  const pegawaiId = u.pegawai?.id;

  const [saldo, dipesan, pengajuan, absen, dokumen, libur] = await Promise.all([
    pegawaiId ? db.saldoCuti.findUnique({ where: { pegawaiId_tahun: { pegawaiId, tahun } } }) : null,
    pegawaiId ? hariDipesan(pegawaiId, tahun) : 0,
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

  // Antrean persetujuan: atasan, Kepegawaian, dan pejabat penyetuju (mis. Kepala Dinas).
  const antrean = (await antreanSaya(u)).length;
  const menunggu = antrean > 0 || punyaPeran(u, "ATASAN", "KEPEGAWAIAN") ? antrean : null;

  let kepegawaian: { hadir: number; jumlahPegawai: number } | null = null;
  if (punyaPeran(u, "KEPEGAWAIAN")) {
    const [hadir, jumlahPegawai] = await Promise.all([
      db.absensi.count({ where: { tanggal: hariIni, status: { in: ["HADIR", "TERLAMBAT"] } } }),
      db.pegawai.count({ where: { aktif: true } }),
    ]);
    kepegawaian = { hadir, jumlahPegawai };
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
    dipesan,
    pengajuan,
    absen,
    dokumen,
    libur,
    menunggu,
    kepegawaian,
    pengaturanKosong,
  };
}
