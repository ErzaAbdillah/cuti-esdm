"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@/lib/generated/prisma/client";
import { catatAudit } from "../audit";
import { punyaHakAkses, punyaPeran, wajibLogin } from "../auth/pengguna";
import { db } from "../db";

/**
 * Master data (Admin). Form polos tanpa JS klien: hasil/galat dikembalikan
 * lewat parameter `pesan`/`galat` di URL tab yang sama.
 */
async function wajibAdmin() {
  const u = await wajibLogin();
  if (!punyaHakAkses(u, "PENGATURAN_ADMIN") && !punyaPeran(u, "ADMIN")) redirect("/akses-ditolak");
  return u;
}

function selesai(tab: string, hasil: { pesan?: string; galat?: string }): never {
  revalidatePath("/admin/master");
  const q = new URLSearchParams({ tab, ...(hasil.pesan ? { pesan: hasil.pesan } : {}), ...(hasil.galat ? { galat: hasil.galat } : {}) });
  redirect(`/admin/master?${q}`);
}

const angkaOpsional = z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().min(0).max(1000).nullable());
const centang = (fd: FormData, k: string) => fd.get(k) === "on";

export async function simpanJenisCuti(id: string, fd: FormData) {
  const u = await wajibAdmin();
  const maks = angkaOpsional.safeParse(fd.get("maksHari"));
  if (!maks.success) selesai("cuti", { galat: "Maks. hari harus angka 0–1000." });
  const lama = await db.jenisCuti.findUniqueOrThrow({ where: { id } });
  const data = { maksHari: maks.data, wajibLampiran: centang(fd, "wajibLampiran"), bolehTanggalLampau: centang(fd, "bolehTanggalLampau"), aktif: centang(fd, "aktif") };
  await db.jenisCuti.update({ where: { id }, data });
  await catatAudit({ userId: u.userId, aksi: "UBAH_JENIS_CUTI", entitas: "jenis_cuti", entitasId: id, sebelum: { maksHari: lama.maksHari, wajibLampiran: lama.wajibLampiran, bolehTanggalLampau: lama.bolehTanggalLampau, aktif: lama.aktif }, sesudah: data });
  selesai("cuti", { pesan: `${lama.nama} disimpan.` });
}

export async function simpanAturanCuti(id: string, fd: FormData) {
  const u = await wajibAdmin();
  const hak = angkaOpsional.safeParse(fd.get("hakPerTahun"));
  const maks = angkaOpsional.safeParse(fd.get("maksHari"));
  if (!hak.success || !maks.success) selesai("cuti", { galat: "Hak per tahun dan maks. hari harus angka." });
  const lama = await db.aturanCuti.findUniqueOrThrow({ where: { id }, include: { jenisCuti: true } });
  const data = { berlaku: centang(fd, "berlaku"), hakPerTahun: hak.data, maksHari: maks.data };
  await db.aturanCuti.update({ where: { id }, data });
  await catatAudit({ userId: u.userId, aksi: "UBAH_ATURAN_CUTI", entitas: "aturan_cuti", entitasId: id, sebelum: { berlaku: lama.berlaku, hakPerTahun: lama.hakPerTahun, maksHari: lama.maksHari }, sesudah: data });
  selesai("cuti", { pesan: `Aturan ${lama.jenisCuti.nama} (${lama.statusKepegawaian}) disimpan.` });
}

const skemaMapping = z.object({ kelasMin: z.coerce.number().int().min(1).max(17), kelasMax: z.coerce.number().int().min(1).max(17), level: z.enum(["ESELON_II", "ESELON_III", "ESELON_IV", "STAF"]) });

export async function simpanMapping(id: string, fd: FormData) {
  const u = await wajibAdmin();
  const v = skemaMapping.safeParse(Object.fromEntries(fd));
  if (!v.success || v.data.kelasMin > v.data.kelasMax) selesai("eselon", { galat: "Rentang kelas tidak valid (1–17, min ≤ maks)." });
  const lain = await db.mappingEselon.findMany({ where: { id: { not: id }, jenisJabatan: "STRUKTURAL" } });
  if (lain.some((m) => m.kelasMin <= v.data.kelasMax && v.data.kelasMin <= m.kelasMax)) selesai("eselon", { galat: "Rentang kelas bertumpang tindih dengan baris lain." });
  const lama = await db.mappingEselon.findUniqueOrThrow({ where: { id } });
  await db.mappingEselon.update({ where: { id }, data: v.data });
  await catatAudit({ userId: u.userId, aksi: "UBAH_MAPPING_ESELON", entitas: "mapping_eselon", entitasId: id, sebelum: { kelasMin: lama.kelasMin, kelasMax: lama.kelasMax, level: lama.level }, sesudah: v.data });
  selesai("eselon", { pesan: "Mapping eselon disimpan. Level surat pengajuan baru mengikuti aturan ini." });
}

const skemaUnit = z.object({
  kode: z.string().trim().regex(/^[A-Z0-9_]{2,40}$/, "Kode: huruf besar, angka, garis bawah (2–40)."),
  nama: z.string().trim().min(3, "Isi nama unit.").max(200),
  singkatan: z.string().trim().max(30),
  jenis: z.enum(["DINAS", "SEKRETARIAT", "BIDANG", "UPTD", "SUBBAG", "SEKSI"]),
  parentId: z.union([z.literal(""), z.uuid()]),
});

export async function simpanUnit(id: string | null, fd: FormData) {
  const u = await wajibAdmin();
  const v = skemaUnit.safeParse(Object.fromEntries(fd));
  if (!v.success) selesai("unit", { galat: v.error.issues[0].message });
  if (id && v.data.parentId === id) selesai("unit", { galat: "Unit tidak boleh menjadi induk dirinya sendiri." });
  const data = { kode: v.data.kode, nama: v.data.nama, singkatan: v.data.singkatan || null, jenis: v.data.jenis, parentId: v.data.parentId || null, aktif: id ? centang(fd, "aktif") : true };
  try {
    const hasil = id ? await db.unitKerja.update({ where: { id }, data }) : await db.unitKerja.create({ data });
    await catatAudit({ userId: u.userId, aksi: id ? "UBAH_UNIT" : "TAMBAH_UNIT", entitas: "unit_kerja", entitasId: hasil.id, sesudah: data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") selesai("unit", { galat: `Kode ${v.data.kode} sudah dipakai.` });
    throw e;
  }
  selesai("unit", { pesan: `Unit ${v.data.nama} disimpan.` });
}

const skemaJabatan = z.object({
  nama: z.string().trim().min(3, "Isi nama jabatan.").max(200),
  namaSingkat: z.string().trim().max(100),
  jenis: z.enum(["STRUKTURAL", "FUNGSIONAL", "PELAKSANA", "NON_ASN"]),
  kelasJabatan: z.preprocess((v) => (v === "" ? null : Number(v)), z.number().int().min(1).max(17).nullable()),
  memimpinUnitId: z.union([z.literal(""), z.uuid()]),
});

export async function simpanJabatan(id: string | null, fd: FormData) {
  const u = await wajibAdmin();
  const v = skemaJabatan.safeParse(Object.fromEntries(fd));
  if (!v.success) selesai("jabatan", { galat: v.error.issues[0].message });
  if (v.data.kelasJabatan != null) await db.kelasJabatan.upsert({ where: { nilai: v.data.kelasJabatan }, update: {}, create: { nilai: v.data.kelasJabatan } });
  const data = { nama: v.data.nama, namaSingkat: v.data.namaSingkat || null, jenis: v.data.jenis, kelasJabatan: v.data.kelasJabatan, memimpinUnitId: v.data.memimpinUnitId || null, aktif: id ? centang(fd, "aktif") : true };
  try {
    const hasil = id ? await db.jabatan.update({ where: { id }, data }) : await db.jabatan.create({ data });
    await catatAudit({ userId: u.userId, aksi: id ? "UBAH_JABATAN" : "TAMBAH_JABATAN", entitas: "jabatan", entitasId: hasil.id, sesudah: data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") selesai("jabatan", { galat: "Nama jabatan sudah ada, atau unit itu sudah punya jabatan kepala." });
    throw e;
  }
  selesai("jabatan", { pesan: `Jabatan ${v.data.nama} disimpan.` });
}
