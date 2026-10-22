"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { daftarTanggal, adalahHariKerja } from "@/lib/domain/hari-kerja";
import { ipDiizinkan } from "@/lib/domain/jaringan";
import { STATUS_DARI_KETERANGAN, statusAbsenMandiri } from "@/lib/domain/status-absen";
import { Prisma } from "@/lib/generated/prisma/client";
import { formatJam, hariIniWita } from "@/lib/tanggal";
import type { HasilForm } from "@/lib/validasi/auth";
import { catatAudit } from "../audit";
import { type PenggunaSaatIni, punyaPeran, wajibLogin } from "../auth/pengguna";
import { db } from "../db";
import { cutiPadaTanggal, keteranganPadaTanggal, apakahHariKerja } from "../layanan/absen";
import { aturanAbsen, setLibur } from "../pengaturan";
import { infoPermintaan } from "../permintaan";

export async function absenMasuk(): Promise<HasilForm> {
  const u = await wajibLogin();
  if (!u.pegawai) return { galat: "Akun ini tidak terhubung dengan data pegawai." };
  const pegawaiId = u.pegawai.id;
  const sekarang = new Date();
  const tanggal = hariIniWita(sekarang);

  const { hariKerja, libur } = await apakahHariKerja(tanggal);
  if (!hariKerja) return { galat: libur ? `Hari ini libur: ${libur}.` : "Hari ini bukan hari kerja." };

  const aturan = await aturanAbsen();
  const { ip } = await infoPermintaan();
  if (!ipDiizinkan(ip, aturan.jaringanKantor)) {
    return { galat: "Absen hanya bisa dilakukan dari jaringan kantor. Sambungkan perangkat ke Wi-Fi/LAN kantor lalu coba lagi." };
  }

  const ada = await db.absensi.findUnique({ where: { pegawaiId_tanggal: { pegawaiId, tanggal } } });
  if (ada) return { galat: ada.jamMasuk ? `Anda sudah absen pukul ${formatJam(ada.jamMasuk)} WITA.` : "Kehadiran Anda hari ini sudah tercatat." };

  if (await cutiPadaTanggal(pegawaiId, tanggal)) return { galat: "Anda tercatat sedang cuti hari ini." };
  const ket = await keteranganPadaTanggal(pegawaiId, tanggal);

  try {
    const baris = await db.absensi.create({
      data: {
        pegawaiId,
        tanggal,
        jamMasuk: sekarang,
        status: ket ? STATUS_DARI_KETERANGAN[ket.jenis] : statusAbsenMandiri(sekarang, aturan),
        sumber: "MANDIRI",
        keteranganKehadiranId: ket?.id,
        ip,
      },
    });
    revalidatePath("/absen");
    revalidatePath("/beranda");
    return { sukses: `Absen tercatat pukul ${formatJam(baris.jamMasuk)} WITA.` };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { galat: "Kehadiran Anda hari ini sudah tercatat." };
    throw e;
  }
}

/** Atasan hanya untuk bawahan langsung; Kepegawaian untuk semua pegawai. */
async function bolehCatatUntuk(u: PenggunaSaatIni, pegawaiId: string): Promise<boolean> {
  if (punyaPeran(u, "KEPEGAWAIAN")) return true;
  if (!punyaPeran(u, "ATASAN") || !u.pegawai) return false;
  const p = await db.pegawai.findUnique({ where: { id: pegawaiId }, select: { atasanLangsungId: true } });
  return p?.atasanLangsungId === u.pegawai.id;
}

const skemaKeterangan = z
  .object({
    pegawaiId: z.uuid("Pilih pegawai."),
    jenis: z.enum(["DINAS_LUAR", "SAKIT", "IZIN", "TUGAS"], "Pilih jenis keterangan."),
    tanggalMulai: z.iso.date("Tanggal mulai tidak valid."),
    tanggalSelesai: z.iso.date("Tanggal selesai tidak valid."),
    keterangan: z.string().trim().min(3, "Isi keterangan, mis. tujuan dinas luar.").max(300),
    nomorSurat: z.string().trim().max(100).optional(),
  })
  .refine((d) => d.tanggalSelesai >= d.tanggalMulai, { path: ["tanggalSelesai"], message: "Tanggal selesai sebelum tanggal mulai." })
  .refine((d) => (Date.parse(d.tanggalSelesai) - Date.parse(d.tanggalMulai)) / 86_400_000 <= 92, {
    path: ["tanggalSelesai"],
    message: "Rentang maksimal 3 bulan.",
  });

export async function catatKeterangan(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const u = await wajibLogin();
  const p = skemaKeterangan.safeParse(Object.fromEntries(fd));
  if (!p.success) {
    const g: Record<string, string> = {};
    for (const i of p.error.issues) g[String(i.path[0])] ??= i.message;
    return { galat: "Periksa isian yang ditandai.", galatField: g };
  }
  const d = p.data;
  if (!(await bolehCatatUntuk(u, d.pegawaiId))) return { galat: "Anda hanya bisa mencatat keterangan untuk bawahan langsung." };

  const mulai = new Date(`${d.tanggalMulai}T00:00:00Z`);
  const selesai = new Date(`${d.tanggalSelesai}T00:00:00Z`);
  const aturan = await aturanAbsen();
  const libur = await setLibur(mulai, selesai);
  const hari = daftarTanggal(mulai, selesai).filter((t) => adalahHariKerja(t, libur, aturan.hariKerja));
  if (hari.length === 0) return { galat: "Rentang tersebut tidak berisi hari kerja." };
  const sumber = punyaPeran(u, "KEPEGAWAIAN") ? ("KEPEGAWAIAN" as const) : ("ATASAN" as const);
  const status = STATUS_DARI_KETERANGAN[d.jenis];

  let dilewati = 0;
  await db.$transaction(async (tx) => {
    const k = await tx.keteranganKehadiran.create({
      data: {
        pegawaiId: d.pegawaiId,
        jenis: d.jenis,
        tanggalMulai: mulai,
        tanggalSelesai: selesai,
        keterangan: d.keterangan,
        nomorSurat: d.nomorSurat || null,
        dicatatOlehId: u.userId,
      },
    });
    for (const t of hari) {
      if (await cutiPadaTanggal(d.pegawaiId, t, tx)) {
        dilewati++;
        continue;
      }
      await tx.absensi.upsert({
        where: { pegawaiId_tanggal: { pegawaiId: d.pegawaiId, tanggal: t } },
        update: { status, sumber, keteranganKehadiranId: k.id, keterangan: d.keterangan, dicatatOlehId: u.userId },
        create: { pegawaiId: d.pegawaiId, tanggal: t, status, sumber, keteranganKehadiranId: k.id, keterangan: d.keterangan, dicatatOlehId: u.userId },
      });
    }
    await catatAudit({ userId: u.userId, aksi: "CATAT_KETERANGAN", entitas: "keterangan_kehadiran", entitasId: k.id, sesudah: { ...d, hariKerja: hari.length } }, tx);
  });
  revalidatePath("/absen", "layout");
  return { sukses: `Keterangan dicatat untuk ${hari.length - dilewati} hari kerja${dilewati ? ` (${dilewati} hari dilewati karena cuti)` : ""}.` };
}

export async function hapusKeterangan(id: string): Promise<HasilForm> {
  const u = await wajibLogin();
  if (!z.uuid().safeParse(id).success) return { galat: "Data tidak valid." };
  const k = await db.keteranganKehadiran.findUnique({ where: { id } });
  if (!k) return { galat: "Keterangan tidak ditemukan." };
  if (!(await bolehCatatUntuk(u, k.pegawaiId))) return { galat: "Akses ditolak." };

  const aturan = await aturanAbsen();
  await db.$transaction(async (tx) => {
    const baris = await tx.absensi.findMany({ where: { keteranganKehadiranId: id } });
    for (const b of baris) {
      // Kembalikan ke absen mandiri bila pegawai sempat absen; selain itu hapus barisnya.
      if (b.jamMasuk) {
        await tx.absensi.update({
          where: { id: b.id },
          data: { status: statusAbsenMandiri(b.jamMasuk, aturan), sumber: "MANDIRI", keteranganKehadiranId: null, keterangan: null },
        });
      } else {
        await tx.absensi.delete({ where: { id: b.id } });
      }
    }
    await tx.keteranganKehadiran.delete({ where: { id } });
    await catatAudit({ userId: u.userId, aksi: "HAPUS_KETERANGAN", entitas: "keterangan_kehadiran", entitasId: id, sebelum: k }, tx);
  });
  revalidatePath("/absen", "layout");
  return { sukses: "Keterangan dihapus." };
}

const skemaStatusManual = z.object({
  pegawaiId: z.uuid(),
  tanggal: z.iso.date(),
  status: z.enum(["HADIR", "TERLAMBAT", "ALPA", "KOSONG"]),
});

/**
 * Untuk pegawai yang masih tanda tangan di kertas: atasan/Kepegawaian mencatat
 * Hadir/Terlambat/Alpa dari daftar hadir fisik. Cuti & keterangan tidak ditimpa.
 */
export async function aturStatusManual(input: { pegawaiId: string; tanggal: string; status: "HADIR" | "TERLAMBAT" | "ALPA" | "KOSONG" }): Promise<HasilForm> {
  const u = await wajibLogin();
  const p = skemaStatusManual.safeParse(input);
  if (!p.success) return { galat: "Data tidak valid." };
  const { pegawaiId, status } = p.data;
  if (!(await bolehCatatUntuk(u, pegawaiId))) return { galat: "Anda hanya bisa mengubah kehadiran bawahan langsung." };
  const tanggal = new Date(`${p.data.tanggal}T00:00:00Z`);
  if (tanggal > hariIniWita()) return { galat: "Tidak bisa mencatat kehadiran untuk tanggal yang akan datang." };

  const ada = await db.absensi.findUnique({ where: { pegawaiId_tanggal: { pegawaiId, tanggal } } });
  if (ada && (ada.status === "CUTI" || ada.keteranganKehadiranId)) return { galat: "Hari ini tercatat cuti/keterangan; ubah lewat menu Keterangan." };
  if (ada?.sumber === "MANDIRI") return { galat: "Pegawai sudah absen online; status mandiri tidak diubah manual." };

  const sumber = punyaPeran(u, "KEPEGAWAIAN") ? ("KEPEGAWAIAN" as const) : ("ATASAN" as const);
  if (status === "KOSONG") {
    if (ada) await db.absensi.delete({ where: { id: ada.id } });
  } else {
    await db.absensi.upsert({
      where: { pegawaiId_tanggal: { pegawaiId, tanggal } },
      update: { status, sumber, dicatatOlehId: u.userId, keterangan: "Dicatat dari daftar hadir" },
      create: { pegawaiId, tanggal, status, sumber, dicatatOlehId: u.userId, keterangan: "Dicatat dari daftar hadir" },
    });
  }
  await catatAudit({ userId: u.userId, aksi: "UBAH_ABSEN", entitas: "absensi", entitasId: ada?.id ?? null, sebelum: ada ? { status: ada.status } : undefined, sesudah: { pegawaiId, tanggal: p.data.tanggal, status } });
  revalidatePath("/absen", "layout");
  return { sukses: "Kehadiran disimpan." };
}
