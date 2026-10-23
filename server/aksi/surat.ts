"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { suratTersedia } from "@/lib/domain/alur-cuti";
import { Prisma } from "@/lib/generated/prisma/client";
import { hitungBlokIdentitas } from "@/lib/surat/render";
import { formatTanggal } from "@/lib/tanggal";
import { catatAudit } from "../audit";
import { wajibLogin } from "../auth/pengguna";
import { db } from "../db";
import { bolehAturNomorSurat, bolehLihatPengajuan, bolehUbahSurat } from "../layanan/akses-cuti";
import { kirimNotifikasi, userDariPegawai } from "../notifikasi";
import { semuaPengaturan } from "../pengaturan";
import { type IsianSurat, type SnapshotVersi, susunLembar, templateUntuk } from "../surat/data";
import { sanitasiIsiSurat } from "../surat/sanitasi";

export type NiatSurat = "simpan" | "cetak" | "pdf";

export interface HasilSurat {
  galat?: string;
  sukses?: string;
  /** Tujuan setelah dikunci: halaman cetak atau unduhan PDF. */
  arahkan?: string;
}

const skema = z.object({
  pengajuanId: z.uuid(),
  kode: z.string().regex(/^[A-Z_]{3,40}$/),
  niat: z.enum(["simpan", "cetak", "pdf"]),
  isiHtml: z.string().max(100_000, "Isi surat terlalu panjang."),
  hal: z.string().trim().min(3, "Isi hal surat.").max(300),
  tembusan: z.array(z.string().trim().max(200)).max(15, "Tembusan paling banyak 15 baris."),
  tanggal: z.iso.date("Tanggal surat tidak valid."),
  hariKosong: z.boolean().default(true),
  /** undefined = tidak diubah; null = dikosongkan. */
  nomorUrut: z.number().int().min(1).max(99_999).nullable().optional(),
});

/** Nomor urut otomatis saat dicetak (bawaan) atau dibiarkan kosong untuk diisi tangan. */
async function nomorOtomatis(): Promise<boolean> {
  return (await semuaPengaturan()).get("surat.nomor_otomatis") !== false;
}

/**
 * Simpan draft surat; dengan niat "cetak"/"pdf" versi dikunci (tidak bisa diubah
 * lagi), nomor diberikan, dan surat izin staf menandai pengajuan "Surat Terbit".
 * Menyimpan perubahan atas versi terkunci selalu membuat versi baru.
 */
export async function simpanSurat(masukan: z.input<typeof skema>): Promise<HasilSurat> {
  const u = await wajibLogin();
  const v = skema.safeParse(masukan);
  if (!v.success) return { galat: v.error.issues[0]?.message ?? "Data surat tidak valid." };
  const m = v.data;

  const p = await db.pengajuanCuti.findUnique({ where: { id: m.pengajuanId }, include: { jenisCuti: true } });
  if (!p || !(await bolehLihatPengajuan(u, p)) || !bolehUbahSurat(u, p)) return { galat: "Anda tidak berhak mengubah surat ini." };
  const t = (await templateUntuk(p)).find((x) => x.kodeDokumen === m.kode);
  if (!t) return { galat: "Template surat tidak ditemukan untuk pengajuan ini." };
  if (!suratTersedia(p.status, t.dapatDicetakSejak)) return { galat: "Surat belum bisa disiapkan pada status pengajuan ini." };

  const isiHtml = sanitasiIsiSurat(m.isiHtml);
  // Kepegawaian/Admin boleh membuka kunci data (memperbaiki salah tulis); pemohon tidak.
  if (!bolehAturNomorSurat(u) && hitungBlokIdentitas(isiHtml) !== hitungBlokIdentitas(t.isiHtml)) return { galat: "Blok identitas pemohon tidak boleh dihapus atau digandakan." };
  if (!isiHtml.replace(/<[^>]*>/g, "").trim()) return { galat: "Isi surat kosong." };
  const isian: IsianSurat = { hal: m.hal, tembusan: m.tembusan.filter(Boolean), tanggal: m.tanggal, hariKosong: m.hariKosong };
  const tahun = Number(m.tanggal.slice(0, 4));
  const ubahNomor = m.nomorUrut !== undefined && bolehAturNomorSurat(u);

  try {
    const hasil = await db.$transaction(async (tx) => {
      let surat =
        (await tx.suratCuti.findUnique({ where: { pengajuanId_kodeDokumen: { pengajuanId: p.id, kodeDokumen: t.kodeDokumen } } })) ??
        (await tx.suratCuti.create({ data: { pengajuanId: p.id, templateId: t.id, kodeDokumen: t.kodeDokumen, tahun, versiTerakhir: 0 } }));
      if (ubahNomor && (surat.nomorUrut !== m.nomorUrut || surat.tahun !== tahun)) {
        surat = await tx.suratCuti.update({ where: { id: surat.id }, data: { nomorUrut: m.nomorUrut, tahun } });
      }

      const terakhir = await tx.suratCutiVersi.findFirst({ where: { suratId: surat.id }, orderBy: { versi: "desc" } });
      const isianLama = (terakhir?.dataSnapshot as unknown as SnapshotVersi | undefined)?.isian;
      const sama = !!terakhir && terakhir.isiHtml === isiHtml && JSON.stringify(isianLama) === JSON.stringify(isian);
      const snapshot = { isian } satisfies SnapshotVersi;

      let versi;
      if (terakhir && !terakhir.dikunciPada) {
        versi = await tx.suratCutiVersi.update({ where: { id: terakhir.id }, data: { isiHtml, dataSnapshot: snapshot as unknown as Prisma.InputJsonValue, dibuatOlehId: u.userId } });
      } else if (terakhir && sama) {
        versi = terakhir;
      } else {
        versi = await tx.suratCutiVersi.create({ data: { suratId: surat.id, versi: (terakhir?.versi ?? 0) + 1, isiHtml, dataSnapshot: snapshot as unknown as Prisma.InputJsonValue, dibuatOlehId: u.userId } });
      }

      if (!sama) {
        await tx.suratCuti.update({ where: { id: surat.id }, data: { versiTerakhir: versi.versi, status: "DRAFT" } });
        await catatAudit({ userId: u.userId, aksi: "UBAH_SURAT", entitas: "surat_cuti", entitasId: surat.id, sesudah: { kode: t.kodeDokumen, versi: versi.versi } }, tx);
      }
      if (m.niat === "simpan" || versi.dikunciPada) return { versi, baru: false, sama };

      // Kunci: beri nomor, bekukan lembar, catat audit.
      if (surat.nomorUrut == null && !ubahNomor && (await nomorOtomatis())) {
        const maks = await tx.suratCuti.aggregate({ _max: { nomorUrut: true }, where: { tahun } });
        surat = await tx.suratCuti.update({ where: { id: surat.id }, data: { nomorUrut: (maks._max.nomorUrut ?? 0) + 1, tahun } });
      }
      const beku = await susunLembar({ template: t, pengajuan: p, isiHtml, isian, nomorUrut: surat.nomorUrut });
      versi = await tx.suratCutiVersi.update({
        where: { id: versi.id },
        data: { dikunciPada: new Date(), dataSnapshot: { isian, beku } as unknown as Prisma.InputJsonValue },
      });
      await tx.suratCuti.update({ where: { id: surat.id }, data: { status: "TERKUNCI", versiTerakhir: versi.versi, nomorLengkap: beku.nomor } });
      await catatAudit({ userId: u.userId, aksi: "KUNCI_SURAT", entitas: "surat_cuti", entitasId: surat.id, sesudah: { kode: t.kodeDokumen, versi: versi.versi, nomor: beku.nomor } }, tx);

      // Surat izin staf adalah keputusan Kepala Dinas: cetak pertama = surat terbit.
      if (t.kodeDokumen === "SURAT_IZIN" && p.status === "DISETUJUI") {
        const r = await tx.pengajuanCuti.updateMany({ where: { id: p.id, status: "DISETUJUI" }, data: { status: "SURAT_TERBIT" } });
        if (r.count > 0) {
          await tx.riwayatStatusCuti.create({ data: { pengajuanId: p.id, dariStatus: "DISETUJUI", keStatus: "SURAT_TERBIT", olehUserId: u.userId, catatan: `Surat izin ${beku.nomor} dicetak` } });
          await kirimNotifikasi([await userDariPegawai(p.pegawaiId, tx)], { judul: "Surat izin cuti terbit", isi: `Surat izin ${p.jenisCuti.nama} ${formatTanggal(p.tanggalMulai)} sudah dicetak (nomor ${beku.nomor}).`, tautan: `/cuti/${p.id}` }, tx);
        }
      }
      return { versi, baru: true, sama };
    });

    revalidatePath(`/cuti/${p.id}`);
    if (m.niat === "simpan") return { sukses: hasil.sama ? "Tidak ada perubahan." : `Draft tersimpan (versi ${hasil.versi.versi}).` };
    const tujuan = m.niat === "cetak" ? `/cetak/surat/${hasil.versi.id}?otomatis=1` : `/api/surat/${hasil.versi.id}/pdf`;
    return { sukses: hasil.baru ? `Versi ${hasil.versi.versi} dikunci.` : `Versi ${hasil.versi.versi} dicetak ulang.`, arahkan: tujuan };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { galat: `Nomor urut sudah dipakai surat lain di tahun ${tahun}. Pilih nomor lain atau kosongkan.` };
    }
    throw e;
  }
}
