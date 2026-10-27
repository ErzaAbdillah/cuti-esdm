import "server-only";
import type { DataPengajuanFormulir, IsianFormulir } from "@/lib/formulir/isian";
import type { Prisma } from "@/lib/generated/prisma/client";
import { formatTanggal } from "@/lib/tanggal";
import { bawaanFormulir } from "./bawaan";

type Pengajuan = Prisma.PengajuanCutiGetPayload<{ include: { jenisCuti: true } }>;

/** Isian tersimpan, atau nilai awal untuk pengajuan lama yang belum punya formulir. */
export async function isianFormulir(p: Pengajuan): Promise<IsianFormulir> {
  if (p.formulir) return p.formulir as unknown as IsianFormulir;
  return { ...(await bawaanFormulir(p.pegawaiId, p.levelSurat, p.tahunSaldo ?? undefined)), telp: p.noHpSelamaCuti, lamanya: `${p.jumlahHari} hari` };
}

export function dataPengajuanFormulir(p: Pengajuan): DataPengajuanFormulir {
  return { jenisKode: p.jenisCuti.kode, tanggalMulai: formatTanggal(p.tanggalMulai), tanggalSelesai: formatTanggal(p.tanggalSelesai), alasan: p.alasan, alamat: p.alamatSelamaCuti };
}
