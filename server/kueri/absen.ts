import "server-only";
import { adalahHariKerja, daftarTanggal, kunciTanggal } from "@/lib/domain/hari-kerja";
import { lewatBatasAlpa, statusHarian, wajibAbsenPada } from "@/lib/domain/status-absen";
import type { StatusAbsen } from "@/lib/generated/prisma/enums";
import { hariIniWita } from "@/lib/tanggal";
import { db } from "../db";
import { STATUS_CUTI_BERLAKU } from "../layanan/absen";
import { aturanAbsen, setLibur } from "../pengaturan";

export interface HariAbsen {
  tanggal: Date;
  status: StatusAbsen | null;
  jamMasuk: Date | null;
  keterangan: string | null;
}

/**
 * Status per hari kerja untuk satu pegawai dalam rentang. Hari tanpa catatan
 * dihitung dari cuti/keterangan, atau Alpa bila batas lewat dan akun sudah ada.
 * @param akunSejak waktu akun aktif dibuat; null = tanda tangan kertas (tidak dihitung Alpa otomatis)
 */
export async function statusRentang(pegawaiId: string, dari: Date, sampai: Date, akunSejak: Date | null): Promise<HariAbsen[]> {
  const sekarang = new Date();
  const [aturan, libur, absensi, cuti, ket] = await Promise.all([
    aturanAbsen(),
    setLibur(dari, sampai),
    db.absensi.findMany({ where: { pegawaiId, tanggal: { gte: dari, lte: sampai } } }),
    db.pengajuanCuti.findMany({ where: { pegawaiId, status: { in: STATUS_CUTI_BERLAKU }, tanggalMulai: { lte: sampai }, tanggalSelesai: { gte: dari } } }),
    db.keteranganKehadiran.findMany({ where: { pegawaiId, tanggalMulai: { lte: sampai }, tanggalSelesai: { gte: dari } } }),
  ]);
  const perTanggal = new Map(absensi.map((a) => [kunciTanggal(a.tanggal), a]));

  return daftarTanggal(dari, sampai)
    .filter((t) => adalahHariKerja(t, libur, aturan.hariKerja))
    .map((t) => {
      const a = perTanggal.get(kunciTanggal(t));
      if (a) return { tanggal: t, status: a.status, jamMasuk: a.jamMasuk, keterangan: a.keterangan };
      const k = ket.find((x) => x.tanggalMulai <= t && x.tanggalSelesai >= t);
      return {
        tanggal: t,
        status: statusHarian({
          cuti: cuti.some((c) => c.tanggalMulai <= t && c.tanggalSelesai >= t),
          keterangan: k?.jenis ?? null,
          mandiri: null,
          lewatBatas: lewatBatasAlpa(t, sekarang, aturan),
          wajibAbsenOnline: wajibAbsenPada(t, akunSejak, aturan.batasAlpa),
        }),
        jamMasuk: null,
        keterangan: k?.keterangan ?? null,
      };
    });
}

export async function dataHalamanAbsen(pegawaiId: string) {
  const hariIni = hariIniWita();
  const awalBulan = new Date(Date.UTC(hariIni.getUTCFullYear(), hariIni.getUTCMonth(), 1));
  const [aturan, libur, user] = await Promise.all([
    aturanAbsen(),
    db.hariLibur.findUnique({ where: { tanggal: hariIni } }),
    db.user.findUnique({ where: { pegawaiId }, select: { aktif: true, dibuatPada: true } }),
  ]);
  const riwayat = await statusRentang(pegawaiId, awalBulan, hariIni, user?.aktif ? user.dibuatPada : null);
  const hariKerja = adalahHariKerja(hariIni, new Set(libur ? [kunciTanggal(hariIni)] : []), aturan.hariKerja);
  const hariIniData = riwayat.find((r) => r.tanggal.getTime() === hariIni.getTime()) ?? null;
  return { hariIni, aturan, libur, hariKerja, hariIniData, riwayat: riwayat.reverse() };
}
