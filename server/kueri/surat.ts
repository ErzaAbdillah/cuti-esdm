import "server-only";
import { suratTersedia } from "@/lib/domain/alur-cuti";
import { namaLengkap } from "@/lib/domain/pegawai";
import type { StatusCuti } from "@/lib/generated/prisma/enums";
import { db } from "../db";
import { type SnapshotVersi, templateUntuk } from "../surat/data";

/** Ringkasan surat per dokumen untuk halaman detail cuti. */
export async function daftarSuratPengajuan(p: { id: string; levelSurat: Parameters<typeof templateUntuk>[0]["levelSurat"]; jenisCutiId: string; status: StatusCuti }) {
  const [template, surat] = await Promise.all([
    templateUntuk(p),
    db.suratCuti.findMany({ where: { pengajuanId: p.id }, include: { versi: { select: { id: true, versi: true, dikunciPada: true, _count: { select: { printLog: true } } }, orderBy: { versi: "desc" } } } }),
  ]);
  return template.map((t) => {
    const s = surat.find((x) => x.kodeDokumen === t.kodeDokumen);
    const terkunci = s?.versi.find((v) => v.dikunciPada);
    return {
      kode: t.kodeDokumen,
      nama: t.nama,
      sejak: t.dapatDicetakSejak,
      tersedia: suratTersedia(p.status, t.dapatDicetakSejak),
      nomor: s?.nomorLengkap ?? null,
      versiTerakhir: s?.versi[0] ?? null,
      versiTerkunci: terkunci ?? null,
      jumlahCetak: s?.versi.reduce((n, v) => n + v._count.printLog, 0) ?? 0,
    };
  });
}

export async function riwayatSurat(suratId: string) {
  const versi = await db.suratCutiVersi.findMany({
    where: { suratId },
    orderBy: { versi: "desc" },
    include: {
      dibuatOleh: { include: { pegawai: true } },
      printLog: { orderBy: { waktu: "desc" }, include: { oleh: { include: { pegawai: true } } } },
    },
  });
  const nama = (u: { loginId: string; pegawai: Parameters<typeof namaLengkap>[0] | null }) => (u.pegawai ? namaLengkap(u.pegawai) : u.loginId);
  return versi.map((v) => ({
    id: v.id,
    versi: v.versi,
    dibuatOleh: nama(v.dibuatOleh),
    dibuatPada: v.dibuatPada,
    dikunciPada: v.dikunciPada,
    cetak: v.printLog.map((l) => ({ id: l.id, jenis: l.jenis, oleh: nama(l.oleh), waktu: l.waktu })),
  }));
}

/** Versi terkunci beserta pengajuannya (untuk cetak ulang & PDF). */
export async function versiTerkunci(versiId: string) {
  const v = await db.suratCutiVersi.findUnique({
    where: { id: versiId },
    include: { surat: { include: { pengajuan: true, template: { select: { nama: true } } } } },
  });
  const beku = (v?.dataSnapshot as unknown as SnapshotVersi | undefined)?.beku;
  if (!v || !v.dikunciPada || !beku) return null;
  return { versi: v, surat: v.surat, pengajuan: v.surat.pengajuan, beku };
}
