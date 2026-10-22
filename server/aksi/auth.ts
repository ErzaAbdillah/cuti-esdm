"use server";

import { redirect } from "next/navigation";
import { normalisasiNip, parseNip } from "@/lib/domain/nip";
import { cocokPassword, hashPassword } from "@/lib/password";
import {
  galatPerField,
  type HasilForm,
  skemaAktivasi,
  skemaGantiPassword,
  skemaMasuk,
  tujuanAman,
} from "@/lib/validasi/auth";
import { catatAudit } from "../audit";
import { catatPercobaan, gagalTerakhir, ipTerlaluBanyakGagal, LAMA_KUNCI_MS, MAKS_GAGAL_AKUN } from "../auth/batas-login";
import { wajibLogin } from "../auth/pengguna";
import { buatSesi, hapusSesi, hapusSesiLain } from "../auth/sesi";
import { db } from "../db";

const GALAT_KREDENSIAL = "NIP/ID atau password salah.";
const GALAT_IP = "Terlalu banyak percobaan gagal dari jaringan ini. Coba lagi dalam 15 menit.";

/** NIP diketik dengan/ tanpa spasi → 18 digit; ID lain (PJLP-001, admin) apa adanya. */
function normalisasiLoginId(input: string): string {
  const n = normalisasiNip(input);
  return /^\d+$/.test(n) ? n : input.trim();
}

let hashPengecoh: Promise<string> | undefined;
/** Verifikasi tiruan agar waktu respons sama saat akun tidak ditemukan. */
async function samakanWaktu(password: string) {
  hashPengecoh ??= hashPassword("pengecoh-waktu-0000");
  await cocokPassword(await hashPengecoh, password);
}

export async function masuk(_: HasilForm, formData: FormData): Promise<HasilForm> {
  const parsed = skemaMasuk.safeParse(Object.fromEntries(formData));
  const nilai = { loginId: String(formData.get("loginId") ?? "") };
  if (!parsed.success) return { galatField: galatPerField(parsed.error), nilai };
  const hasil = await prosesMasuk(parsed.data);
  return { ...hasil, nilai };
}

async function prosesMasuk(data: { loginId: string; password: string; lanjut?: string }): Promise<HasilForm> {
  const { password, lanjut } = data;
  const loginId = normalisasiLoginId(data.loginId);

  if (await ipTerlaluBanyakGagal()) {
    await catatPercobaan(loginId, false, "IP_DIBATASI");
    return { galat: GALAT_IP };
  }

  const user = await db.user.findFirst({ where: { loginId: { equals: loginId, mode: "insensitive" } } });
  if (!user) {
    await samakanWaktu(password);
    await catatPercobaan(loginId, false, "AKUN_TIDAK_ADA");
    return { galat: GALAT_KREDENSIAL };
  }

  if (user.terkunciSampai && user.terkunciSampai > new Date()) {
    await catatPercobaan(loginId, false, "TERKUNCI", user.id);
    const jam = user.terkunciSampai.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Makassar" });
    return { galat: `Akun terkunci sampai pukul ${jam} WITA karena ${MAKS_GAGAL_AKUN} kali gagal login. Coba lagi nanti atau hubungi Admin.` };
  }

  if (!(await cocokPassword(user.passwordHash, password))) {
    const gagal = user.gagalBerturut + 1;
    const kunci = gagal >= MAKS_GAGAL_AKUN;
    await db.user.update({
      where: { id: user.id },
      data: kunci ? { gagalBerturut: 0, terkunciSampai: new Date(Date.now() + LAMA_KUNCI_MS) } : { gagalBerturut: gagal },
    });
    await catatPercobaan(loginId, false, kunci ? "PASSWORD_SALAH_DIKUNCI" : "PASSWORD_SALAH", user.id);
    if (kunci) return { galat: `${GALAT_KREDENSIAL} Akun dikunci 15 menit karena ${MAKS_GAGAL_AKUN} kali gagal berturut-turut.` };
    const sisa = MAKS_GAGAL_AKUN - gagal;
    return { galat: sisa <= 2 ? `${GALAT_KREDENSIAL} Sisa ${sisa} percobaan sebelum akun dikunci 15 menit.` : GALAT_KREDENSIAL };
  }

  if (!user.aktif) {
    await catatPercobaan(loginId, false, "AKUN_NONAKTIF", user.id);
    return { galat: "Akun tidak aktif. Hubungi Admin." };
  }

  await db.user.update({
    where: { id: user.id },
    data: { gagalBerturut: 0, terkunciSampai: null, terakhirLogin: new Date() },
  });
  await catatPercobaan(loginId, true, null, user.id);
  await catatAudit({ userId: user.id, aksi: "LOGIN", entitas: "users", entitasId: user.id });
  await buatSesi(user.id);

  redirect(user.wajibGantiPassword ? "/profil?wajib=1" : tujuanAman(lanjut));
}

export async function aktivasiAkun(_: HasilForm, formData: FormData): Promise<HasilForm> {
  const parsed = skemaAktivasi.safeParse(Object.fromEntries(formData));
  const nilai = { loginId: String(formData.get("loginId") ?? ""), verifikasi: String(formData.get("verifikasi") ?? "") };
  if (!parsed.success) return { galatField: galatPerField(parsed.error), nilai };
  return { ...(await prosesAktivasi(parsed.data)), nilai };
}

async function prosesAktivasi(data: { loginId: string; verifikasi: string; password: string }): Promise<HasilForm> {
  const { password, verifikasi } = data;
  const loginId = normalisasiLoginId(data.loginId);
  const kunciBatas = `aktivasi:${loginId}`;

  if (await ipTerlaluBanyakGagal()) return { galat: GALAT_IP };
  if ((await gagalTerakhir(kunciBatas)) >= MAKS_GAGAL_AKUN) {
    return { galat: "Terlalu banyak percobaan aktivasi untuk NIP ini. Coba lagi dalam 15 menit." };
  }

  const nipDiketik = /^\d+$/.test(loginId);
  if (nipDiketik) {
    const cek = parseNip(loginId);
    if (!cek.ok) return { galatField: { loginId: cek.galat } };
  }

  const pegawai = await db.pegawai.findFirst({
    where: nipDiketik ? { nip: loginId, aktif: true } : { idNonAsn: { equals: loginId, mode: "insensitive" }, aktif: true },
    include: { user: true, kodeAktivasi: { where: { dipakaiPada: null, kedaluwarsaPada: { gt: new Date() } } } },
  });
  if (!pegawai) {
    await catatPercobaan(kunciBatas, false, "AKTIVASI_TIDAK_TERDAFTAR");
    return { galatField: { loginId: "NIP belum terdaftar, hubungi Kepegawaian." } };
  }
  if (pegawai.user) {
    return { galat: "Akun untuk NIP ini sudah ada. Silakan masuk, atau minta reset password ke Admin." };
  }

  // Faktor kedua: NIK yang tercatat, atau kode aktivasi dari Kepegawaian.
  let kodeDipakaiId: string | null = null;
  let cocok = false;
  if (/^\d{16}$/.test(verifikasi) && pegawai.nik) {
    cocok = pegawai.nik === verifikasi;
  } else {
    for (const k of pegawai.kodeAktivasi) {
      if (await cocokPassword(k.kodeHash, verifikasi.toUpperCase())) {
        cocok = true;
        kodeDipakaiId = k.id;
        break;
      }
    }
  }
  if (!cocok) {
    await catatPercobaan(kunciBatas, false, "AKTIVASI_VERIFIKASI_SALAH");
    const tanpaNik = !pegawai.nik && pegawai.kodeAktivasi.length === 0;
    return {
      galatField: {
        verifikasi: tanpaNik
          ? "NIK Anda belum tercatat. Minta kode aktivasi ke Kepegawaian."
          : "NIK atau kode aktivasi tidak cocok dengan data kepegawaian.",
      },
    };
  }

  const user = await db.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: { loginId: pegawai.nip ?? pegawai.idNonAsn!, pegawaiId: pegawai.id, passwordHash: await hashPassword(password) },
    });
    if (kodeDipakaiId) await tx.kodeAktivasi.update({ where: { id: kodeDipakaiId }, data: { dipakaiPada: new Date() } });
    await catatAudit({ userId: u.id, aksi: "AKTIVASI_AKUN", entitas: "users", entitasId: u.id, sesudah: { loginId: u.loginId, via: kodeDipakaiId ? "kode" : "nik" } }, tx);
    return u;
  });
  await catatPercobaan(kunciBatas, true, "AKTIVASI_BERHASIL", user.id);
  await buatSesi(user.id);
  redirect("/beranda");
}

export async function keluar(): Promise<void> {
  const u = await wajibLogin({ lewatiWajibGanti: true });
  await catatAudit({ userId: u.userId, aksi: "LOGOUT", entitas: "users", entitasId: u.userId });
  await hapusSesi();
  redirect("/login");
}

export async function gantiPassword(_: HasilForm, formData: FormData): Promise<HasilForm> {
  const u = await wajibLogin({ lewatiWajibGanti: true });
  const parsed = skemaGantiPassword.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { galatField: galatPerField(parsed.error) };

  const user = await db.user.findUniqueOrThrow({ where: { id: u.userId } });
  if (!(await cocokPassword(user.passwordHash, parsed.data.passwordLama))) {
    return { galatField: { passwordLama: "Password lama salah." } };
  }
  await db.user.update({
    where: { id: u.userId },
    data: { passwordHash: await hashPassword(parsed.data.password), wajibGantiPassword: false },
  });
  await hapusSesiLain(u.userId, u.sesiId);
  await catatAudit({ userId: u.userId, aksi: "GANTI_PASSWORD", entitas: "users", entitasId: u.userId });
  return { sukses: "Password berhasil diganti. Sesi di perangkat lain sudah dikeluarkan." };
}
