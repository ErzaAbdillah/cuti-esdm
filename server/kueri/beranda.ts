import "server-only";
import { hariIniWita } from "@/lib/tanggal";
import { type PenggunaSaatIni, punyaHakAkses, punyaPeran } from "../auth/pengguna";
import { db } from "../db";
import { hariDipesan } from "../layanan/cuti";
import { antreanSaya } from "./cuti";

export async function dataBeranda(u: PenggunaSaatIni) {
  const hariIni = hariIniWita();
  const tahun = hariIni.getUTCFullYear();
  const pegawaiId = u.pegawai?.id;

  const [saldo, dipesan, pengajuan, dokumen] = await Promise.all([
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
    pegawaiId
      ? db.dokumen.findMany({
          where: { pemilikPegawaiId: pegawaiId, ruang: "PRIBADI", dihapusPada: null },
          orderBy: { diunggahPada: "desc" },
          take: 4,
        })
      : [],
  ]);

  // Antrean persetujuan: atasan, Kepegawaian, dan pejabat penyetuju (mis. Kepala Dinas).
  const antrean = (await antreanSaya(u)).length;
  const menunggu = antrean > 0 || punyaHakAkses(u, "PROSES_CUTI") || punyaPeran(u, "ATASAN", "KEPEGAWAIAN") ? antrean : null;

  // Kepegawaian: jumlah pegawai yang sedang menjalani cuti hari ini.
  const sedangCuti = punyaHakAkses(u, "KELOLA_SALDO_CUTI", "PROSES_CUTI") || punyaPeran(u, "KEPEGAWAIAN")
    ? await db.pengajuanCuti.count({ where: { status: { in: ["DISETUJUI", "SURAT_TERBIT"] }, tanggalMulai: { lte: hariIni }, tanggalSelesai: { gte: hariIni } } })
    : null;

  return {
    hariIni,
    tahun,
    saldo,
    dipesan,
    pengajuan,
    dokumen,
    menunggu,
    sedangCuti,
  };
}
