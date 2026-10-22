import "server-only";
import nodemailer from "nodemailer";
import type { Prisma } from "@/lib/generated/prisma/client";
import { db } from "./db";

export function smtpAktif(): boolean {
  return !!process.env.SMTP_HOST;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/**
 * Notifikasi dashboard untuk sekumpulan akun, plus antrean email bila SMTP
 * dikonfigurasi dan pegawai punya alamat email. Email dikirim oleh tugas terjadwal.
 */
export async function kirimNotifikasi(
  userIds: (string | null | undefined)[],
  isi: { judul: string; isi: string; tautan?: string },
  tx: Prisma.TransactionClient = db,
) {
  const unik = [...new Set(userIds.filter((x): x is string => !!x))];
  if (unik.length === 0) return;
  await tx.notifikasi.createMany({ data: unik.map((userId) => ({ userId, judul: isi.judul, isi: isi.isi, tautan: isi.tautan })) });

  if (!smtpAktif()) return;
  const penerima = await tx.user.findMany({ where: { id: { in: unik }, aktif: true }, select: { pegawai: { select: { email: true } } } });
  const url = isi.tautan && process.env.APP_URL ? `${process.env.APP_URL.replace(/\/$/, "")}${isi.tautan}` : null;
  const html = `<p>${escapeHtml(isi.isi)}</p>${url ? `<p><a href="${escapeHtml(url)}">Buka di aplikasi</a></p>` : ""}<p style="color:#64748b;font-size:12px">Absensi &amp; Cuti ESDM Kalsel</p>`;
  const email = penerima.map((p) => p.pegawai?.email).filter((e): e is string => !!e);
  if (email.length) {
    await tx.emailKeluar.createMany({ data: email.map((kepada) => ({ kepada, subjek: isi.judul, isiHtml: html })) });
  }
}

/** Akun aktif dengan peran tertentu. */
export async function userDenganPeran(peran: "KEPEGAWAIAN" | "ADMIN", tx: Prisma.TransactionClient = db): Promise<string[]> {
  const u = await tx.user.findMany({ where: { aktif: true, peran: { some: { peran } } }, select: { id: true } });
  return u.map((x) => x.id);
}

export async function userDariPegawai(pegawaiId: string | null | undefined, tx: Prisma.TransactionClient = db): Promise<string | null> {
  if (!pegawaiId) return null;
  return (await tx.user.findUnique({ where: { pegawaiId }, select: { id: true, aktif: true } }))?.id ?? null;
}

/** Kirim antrean email (dipanggil tugas terjadwal). Gagal → dicoba lagi maks. 5 kali. */
export async function kirimAntreanEmail(maks = 50): Promise<{ terkirim: number; gagal: number }> {
  if (!smtpAktif()) return { terkirim: 0, gagal: 0 };
  const antre = await db.emailKeluar.findMany({ where: { status: "ANTRI", percobaan: { lt: 5 } }, orderBy: { dibuatPada: "asc" }, take: maks });
  if (antre.length === 0) return { terkirim: 0, gagal: 0 };

  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });
  let terkirim = 0;
  let gagal = 0;
  for (const e of antre) {
    try {
      await transport.sendMail({ from: process.env.SMTP_FROM, to: e.kepada, subject: e.subjek, html: e.isiHtml });
      await db.emailKeluar.update({ where: { id: e.id }, data: { status: "TERKIRIM", dikirimPada: new Date(), percobaan: { increment: 1 } } });
      terkirim++;
    } catch (err) {
      const percobaan = e.percobaan + 1;
      await db.emailKeluar.update({
        where: { id: e.id },
        data: { percobaan, galatTerakhir: String(err).slice(0, 500), status: percobaan >= 5 ? "GAGAL" : "ANTRI" },
      });
      gagal++;
    }
  }
  return { terkirim, gagal };
}
