"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Peran } from "@/lib/generated/prisma/enums";
import { hashPassword } from "@/lib/password";
import { catatAudit } from "../audit";
import { punyaPeran, wajibLogin } from "../auth/pengguna";
import { hapusSesiLain } from "../auth/sesi";
import { db } from "../db";

export type HasilAkun = { galat?: string; rahasia?: string; pesan?: string };

const HURUF = "ABCDEFGHJKMNPQRSTUVWXYZ";
const ANGKA = "23456789";
const acakDari = (abjad: string, n: number) => Array.from({ length: n }, () => abjad[randomInt(abjad.length)]).join("");

/** Kode aktivasi 8 karakter tanpa huruf/angka yang mirip (O/0, I/1, L). */
function buatKode(): string {
  return acakDari(HURUF + ANGKA, 8);
}

/** Password sementara yang selalu lolos validasi (huruf + angka, 10 karakter). */
function buatPasswordSementara(): string {
  const huruf = acakDari(HURUF + HURUF.toLowerCase(), 6);
  const angka = acakDari(ANGKA, 4);
  return `${huruf.slice(0, 3)}${angka.slice(0, 2)}${huruf.slice(3)}${angka.slice(2)}`;
}

const idSchema = z.uuid();

export async function buatKodeAktivasi(pegawaiId: string): Promise<HasilAkun> {
  const u = await wajibLogin();
  if (!punyaPeran(u, "KEPEGAWAIAN", "ADMIN")) return { galat: "Hanya Kepegawaian atau Admin." };
  if (!idSchema.safeParse(pegawaiId).success) return { galat: "Data tidak valid." };

  const p = await db.pegawai.findUnique({ where: { id: pegawaiId }, include: { user: true } });
  if (!p) return { galat: "Pegawai tidak ditemukan." };
  if (p.user) return { galat: "Pegawai ini sudah punya akun." };

  const kode = buatKode();
  await db.$transaction(async (tx) => {
    // Hanya satu kode aktif per pegawai.
    await tx.kodeAktivasi.deleteMany({ where: { pegawaiId, dipakaiPada: null } });
    await tx.kodeAktivasi.create({
      data: {
        pegawaiId,
        kodeHash: await hashPassword(kode),
        kedaluwarsaPada: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        dibuatOlehId: u.userId,
      },
    });
    await catatAudit({ userId: u.userId, aksi: "BUAT_KODE_AKTIVASI", entitas: "pegawai", entitasId: pegawaiId }, tx);
  });
  revalidatePath(`/pegawai/${pegawaiId}`);
  return { rahasia: kode, pesan: "Berikan kode ini kepada pegawai. Berlaku 7 hari dan hanya ditampilkan sekali." };
}

async function wajibAdmin() {
  const u = await wajibLogin();
  return punyaPeran(u, "ADMIN") ? u : null;
}

async function ambilUser(userId: string) {
  if (!idSchema.safeParse(userId).success) return null;
  return db.user.findUnique({ where: { id: userId } });
}

export async function resetPassword(userId: string): Promise<HasilAkun> {
  const u = await wajibAdmin();
  if (!u) return { galat: "Hanya Admin yang bisa mereset password." };
  const target = await ambilUser(userId);
  if (!target) return { galat: "Akun tidak ditemukan." };

  const sementara = buatPasswordSementara();
  await db.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(sementara), wajibGantiPassword: true, gagalBerturut: 0, terkunciSampai: null },
  });
  await hapusSesiLain(userId);
  await catatAudit({ userId: u.userId, aksi: "RESET_PASSWORD", entitas: "users", entitasId: userId });
  if (target.pegawaiId) revalidatePath(`/pegawai/${target.pegawaiId}`);
  return { rahasia: sementara, pesan: "Password sementara — wajib diganti saat login berikutnya. Hanya ditampilkan sekali." };
}

export async function bukaKunci(userId: string): Promise<HasilAkun> {
  const u = await wajibAdmin();
  if (!u) return { galat: "Hanya Admin yang bisa membuka kunci akun." };
  const target = await ambilUser(userId);
  if (!target) return { galat: "Akun tidak ditemukan." };
  await db.user.update({ where: { id: userId }, data: { gagalBerturut: 0, terkunciSampai: null } });
  await catatAudit({ userId: u.userId, aksi: "BUKA_KUNCI_AKUN", entitas: "users", entitasId: userId });
  if (target.pegawaiId) revalidatePath(`/pegawai/${target.pegawaiId}`);
  return { pesan: "Kunci akun dibuka." };
}

export async function aturAktifAkun(userId: string, aktif: boolean): Promise<HasilAkun> {
  const u = await wajibAdmin();
  if (!u) return { galat: "Hanya Admin yang bisa mengubah status akun." };
  if (userId === u.userId) return { galat: "Anda tidak bisa menonaktifkan akun sendiri." };
  const target = await ambilUser(userId);
  if (!target) return { galat: "Akun tidak ditemukan." };
  await db.user.update({ where: { id: userId }, data: { aktif } });
  if (!aktif) await hapusSesiLain(userId);
  await catatAudit({ userId: u.userId, aksi: aktif ? "AKTIFKAN_AKUN" : "NONAKTIFKAN_AKUN", entitas: "users", entitasId: userId });
  if (target.pegawaiId) revalidatePath(`/pegawai/${target.pegawaiId}`);
  return { pesan: aktif ? "Akun diaktifkan." : "Akun dinonaktifkan dan semua sesinya dikeluarkan." };
}

const skemaPeran = z.array(z.enum(["ADMIN", "KEPEGAWAIAN"]));

export async function aturPeran(userId: string, peran: Peran[]): Promise<HasilAkun> {
  const u = await wajibAdmin();
  if (!u) return { galat: "Hanya Admin yang bisa mengatur peran." };
  const parsed = skemaPeran.safeParse(peran);
  if (!parsed.success) return { galat: "Peran tidak valid." };
  if (userId === u.userId && !parsed.data.includes("ADMIN")) return { galat: "Anda tidak bisa mencabut peran Admin dari akun sendiri." };
  const target = await db.user.findUnique({ where: { id: userId }, include: { peran: true } });
  if (!target) return { galat: "Akun tidak ditemukan." };

  await db.$transaction(async (tx) => {
    await tx.userPeran.deleteMany({ where: { userId } });
    if (parsed.data.length) await tx.userPeran.createMany({ data: parsed.data.map((p) => ({ userId, peran: p })) });
    await catatAudit(
      { userId: u.userId, aksi: "UBAH_PERAN", entitas: "users", entitasId: userId, sebelum: { peran: target.peran.map((p) => p.peran) }, sesudah: { peran: parsed.data } },
      tx,
    );
  });
  if (target.pegawaiId) revalidatePath(`/pegawai/${target.pegawaiId}`);
  return { pesan: "Peran disimpan." };
}
