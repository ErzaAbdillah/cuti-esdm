import "server-only";
import type { DataPengajuanFormulir, IsianFormulir } from "@/lib/formulir/isian";
import { atasNamaNota, halNotaDinas, isiNotaDinas, namaJenisCuti, perluNotaDinas } from "@/lib/formulir/nota-dinas";
import type { Prisma } from "@/lib/generated/prisma/client";
import { formatTanggal } from "@/lib/tanggal";
import { bawaanFormulir } from "./bawaan";

type Pengajuan = Prisma.PengajuanCutiGetPayload<{ include: { jenisCuti: true } }>;

/**
 * Isian tersimpan, atau nilai awal untuk pengajuan lama yang belum punya
 * formulir / nota dinas (Eselon II & III). Hal & isi nota dinas yang kosong
 * disusun dari data pengajuan.
 */
export async function isianFormulir(p: Pengajuan): Promise<IsianFormulir> {
  let f = p.formulir as unknown as IsianFormulir | null;
  if (!f || (perluNotaDinas(p.levelSurat) && !f.notaDinas)) {
    const awal = await bawaanFormulir(p.pegawaiId, p.levelSurat, p.tahunSaldo ?? undefined);
    f = f ? { ...f, notaDinas: awal.notaDinas } : { ...awal, telp: p.noHpSelamaCuti, lamanya: `${p.jumlahHari} hari` };
  }
  const n = f.notaDinas;
  if (!n || !perluNotaDinas(p.levelSurat) || (n.hal && n.isi)) return f;
  const namaJenis = namaJenisCuti(p.jenisCuti.kode, p.jenisCuti.nama);
  return {
    ...f,
    notaDinas: {
      ...n,
      hal: n.hal || halNotaDinas(namaJenis),
      isi:
        n.isi ||
        isiNotaDinas({ namaJenis, atasNama: atasNamaNota(p.levelSurat, { dari: n.dari, nama: f.nama, nip: f.nip }), alasan: p.alasan, lamanya: f.lamanya, mulai: formatTanggal(p.tanggalMulai), selesai: formatTanggal(p.tanggalSelesai) }),
    },
  };
}

export function dataPengajuanFormulir(p: Pengajuan): DataPengajuanFormulir {
  return { jenisKode: p.jenisCuti.kode, tanggalMulai: formatTanggal(p.tanggalMulai), tanggalSelesai: formatTanggal(p.tanggalSelesai), alasan: p.alasan, alamat: p.alamatSelamaCuti };
}
