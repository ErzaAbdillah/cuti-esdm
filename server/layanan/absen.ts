import "server-only";
import { adalahHariKerja, daftarTanggal, kunciTanggal } from "@/lib/domain/hari-kerja";
import { lewatBatasAlpa, wajibAbsenPada } from "@/lib/domain/status-absen";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { StatusCuti } from "@/lib/generated/prisma/enums";
import { db } from "../db";
import { aturanAbsen, setLibur } from "../pengaturan";

/** Status pengajuan yang berarti pegawai benar-benar cuti pada tanggalnya. */
export const STATUS_CUTI_BERLAKU: StatusCuti[] = ["DISETUJUI", "SURAT_TERBIT", "SELESAI"];

export async function cutiPadaTanggal(pegawaiId: string, tanggal: Date, tx: Prisma.TransactionClient = db) {
  return tx.pengajuanCuti.findFirst({
    where: { pegawaiId, status: { in: STATUS_CUTI_BERLAKU }, tanggalMulai: { lte: tanggal }, tanggalSelesai: { gte: tanggal } },
    include: { jenisCuti: true },
  });
}

export async function keteranganPadaTanggal(pegawaiId: string, tanggal: Date, tx: Prisma.TransactionClient = db) {
  return tx.keteranganKehadiran.findFirst({
    where: { pegawaiId, tanggalMulai: { lte: tanggal }, tanggalSelesai: { gte: tanggal } },
    orderBy: { dibuatPada: "desc" },
  });
}

export async function apakahHariKerja(tanggal: Date): Promise<{ hariKerja: boolean; libur: string | null }> {
  const [aturan, libur] = await Promise.all([aturanAbsen(), db.hariLibur.findUnique({ where: { tanggal } })]);
  const set = new Set(libur ? [kunciTanggal(libur.tanggal)] : []);
  return { hariKerja: adalahHariKerja(tanggal, set, aturan.hariKerja), libur: libur?.nama ?? null };
}

/**
 * Menandai ALPA (sumber SISTEM) pada hari kerja yang batas alpanya sudah lewat,
 * untuk pegawai aktif yang punya akun aktif (wajib absen online) dan belum punya
 * catatan, cuti, maupun keterangan. Idempoten — aman dipanggil berulang.
 */
export async function tandaiAlpa(dari: Date, sampai: Date, sekarang = new Date()): Promise<number> {
  const aturan = await aturanAbsen();
  if (!aturan.batasAlpa) return 0;
  const libur = await setLibur(dari, sampai);
  const tanggal = daftarTanggal(dari, sampai).filter((t) => adalahHariKerja(t, libur, aturan.hariKerja) && lewatBatasAlpa(t, sekarang, aturan));
  let jumlah = 0;

  for (const t of tanggal) {
    const calon = await db.pegawai.findMany({
      where: {
        aktif: true,
        absensi: { none: { tanggal: t } },
        pengajuanCuti: { none: { status: { in: STATUS_CUTI_BERLAKU }, tanggalMulai: { lte: t }, tanggalSelesai: { gte: t } } },
        keteranganKehadiran: { none: { tanggalMulai: { lte: t }, tanggalSelesai: { gte: t } } },
        user: { is: { aktif: true } },
      },
      select: { id: true, user: { select: { dibuatPada: true } } },
    });
    // Akun yang dibuat setelah batas alpa hari itu belum wajib absen pada hari tersebut.
    const wajib = calon.filter((p) => wajibAbsenPada(t, p.user?.dibuatPada, aturan.batasAlpa));
    if (wajib.length === 0) continue;
    const r = await db.absensi.createMany({
      data: wajib.map((p) => ({ pegawaiId: p.id, tanggal: t, status: "ALPA" as const, sumber: "SISTEM" as const, keterangan: "Tanpa keterangan setelah batas waktu" })),
      skipDuplicates: true,
    });
    jumlah += r.count;
  }
  return jumlah;
}
