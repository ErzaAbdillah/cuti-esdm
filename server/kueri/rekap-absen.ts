import "server-only";
import { adalahHariKerja, daftarTanggal, kunciTanggal } from "@/lib/domain/hari-kerja";
import { formatNip } from "@/lib/domain/nip";
import { namaLengkap } from "@/lib/domain/pegawai";
import { lewatBatasAlpa, statusHarian, wajibAbsenPada } from "@/lib/domain/status-absen";
import type { StatusAbsen } from "@/lib/generated/prisma/enums";
import { hariIniWita } from "@/lib/tanggal";
import { db } from "../db";
import { STATUS_CUTI_BERLAKU } from "../layanan/absen";
import { aturanAbsen, setLibur } from "../pengaturan";

export const KOLOM_REKAP: StatusAbsen[] = ["HADIR", "TERLAMBAT", "CUTI", "DINAS_LUAR", "SAKIT", "IZIN", "TUGAS", "ALPA"];

/** "2026-10" → rentang bulan, dipotong sampai hari ini untuk bulan berjalan. */
export function rentangBulan(bulan: string | undefined) {
  const hariIni = hariIniWita();
  const m = bulan?.match(/^(\d{4})-(\d{2})$/);
  const tahun = m ? Number(m[1]) : hariIni.getUTCFullYear();
  const bln = m ? Number(m[2]) - 1 : hariIni.getUTCMonth();
  const dari = new Date(Date.UTC(tahun, bln, 1));
  const akhir = new Date(Date.UTC(tahun, bln + 1, 0));
  const sampai = akhir > hariIni ? hariIni : akhir;
  return { dari, sampai, kunci: `${tahun}-${String(bln + 1).padStart(2, "0")}`, valid: dari <= hariIni };
}

export async function rekapBulanan(pegawaiIds: string[], dari: Date, sampai: Date) {
  const sekarang = new Date();
  const [aturan, libur, pegawai] = await Promise.all([
    aturanAbsen(),
    setLibur(dari, sampai),
    db.pegawai.findMany({
      where: { id: { in: pegawaiIds } },
      include: {
        jabatan: true,
        unitKerja: true,
        user: { select: { aktif: true, dibuatPada: true } },
        absensi: { where: { tanggal: { gte: dari, lte: sampai } } },
        pengajuanCuti: { where: { status: { in: STATUS_CUTI_BERLAKU }, tanggalMulai: { lte: sampai }, tanggalSelesai: { gte: dari } } },
        keteranganKehadiran: { where: { tanggalMulai: { lte: sampai }, tanggalSelesai: { gte: dari } } },
      },
      orderBy: [{ urutanDaftarHadir: { sort: "asc", nulls: "last" } }, { nama: "asc" }],
    }),
  ]);
  const hari = dari <= sampai ? daftarTanggal(dari, sampai).filter((t) => adalahHariKerja(t, libur, aturan.hariKerja)) : [];

  const baris = pegawai.map((p) => {
    const perTanggal = new Map(p.absensi.map((a) => [kunciTanggal(a.tanggal), a.status]));
    const jumlah = Object.fromEntries(KOLOM_REKAP.map((k) => [k, 0])) as Record<StatusAbsen, number>;
    let belum = 0;
    for (const t of hari) {
      const s =
        perTanggal.get(kunciTanggal(t)) ??
        statusHarian({
          cuti: p.pengajuanCuti.some((c) => c.tanggalMulai <= t && c.tanggalSelesai >= t),
          keterangan: p.keteranganKehadiran.find((k) => k.tanggalMulai <= t && k.tanggalSelesai >= t)?.jenis ?? null,
          mandiri: null,
          lewatBatas: lewatBatasAlpa(t, sekarang, aturan),
          wajibAbsenOnline: !!p.user?.aktif && wajibAbsenPada(t, p.user.dibuatPada, aturan.batasAlpa),
        });
      if (s) jumlah[s]++;
      else belum++;
    }
    return {
      id: p.id,
      nama: namaLengkap(p),
      nip: p.nip ? formatNip(p.nip) : p.idNonAsn,
      jabatan: p.jabatan?.namaSingkat ?? p.jabatan?.nama ?? "-",
      unit: p.unitKerja.nama,
      jumlah,
      belum,
    };
  });
  return { hariKerja: hari.length, baris };
}
