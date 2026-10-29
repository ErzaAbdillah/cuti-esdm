"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { normalisasiNip, parseNip } from "@/lib/domain/nip";
import { cocokPassword, hashPassword } from "@/lib/password";
import {
  galatPerField,
  type HasilForm,
  skemaAktivasi,
  skemaGantiPassword,
  skemaGoogleBaru,
  skemaGoogleLama,
  skemaMasuk,
  skemaPasswordBaru,
  tujuanAman,
} from "@/lib/validasi/auth";
import { catatAudit } from "../audit";
import { catatPercobaan, gagalTerakhir, ipTerlaluBanyakGagal, LAMA_KUNCI_MS, MAKS_GAGAL_AKUN } from "../auth/batas-login";
import { bacaIdentitasTertunda, bolehAturPassword, hapusIdentitasTertunda, hapusIzinAturPassword, izinkanAturPassword } from "../auth/google";
import { wajibLogin } from "../auth/pengguna";
import { buatSesi, hapusSesi, hapusSesiLain } from "../auth/sesi";
import { db } from "../db";

const GALAT_KREDENSIAL = "NIP/ID atau password salah.";
const GALAT_IP = "Terlalu banyak percobaan gagal dari jaringan ini. Coba lagi dalam 15 menit.";
const GALAT_AKTIVASI =
  "Aktivasi gagal: NIP, NIK, atau kode aktivasi tidak cocok, atau akun sudah pernah diaktifkan. Bila akun sudah aktif, silakan masuk; bila belum, minta kode aktivasi ke Kepegawaian.";
const GALAT_PEMULIHAN =
  "Verifikasi gagal: NIP atau NIK tidak cocok, atau akun ini sudah terhubung ke akun Google lain. Jika NIK Anda belum tercatat, hubungi Kepegawaian.";
const MAKS_GAGAL_AKTIVASI = 3;
const JENDELA_AKTIVASI_MS = 24 * 60 * 60 * 1000;

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
  const cek = await periksaKredensial(data.loginId, data.password);
  if (!("user" in cek)) return cek;
  const { user } = cek;
  await catatAudit({ userId: user.id, aksi: "LOGIN", entitas: "users", entitasId: user.id });
  await buatSesi(user.id);
  redirect(user.wajibGantiPassword ? "/profil?wajib=1" : tujuanAman(data.lanjut));
}

/** NIP/ID + password dengan pembatasan percobaan & kunci akun; dipakai login dan menghubungkan Google. */
async function periksaKredensial(loginIdMentah: string, password: string): Promise<HasilForm | { user: { id: string; wajibGantiPassword: boolean } }> {
  const loginId = normalisasiLoginId(loginIdMentah);

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
  return { user };
}

const GALAT_GOOGLE_KEDALUWARSA = "Waktu verifikasi Google habis. Klik “Masuk dengan Google” lagi.";

/** Akun baru dari Google: NIP + NIK/kode aktivasi, tanpa password (bisa dibuat nanti lewat Lupa password). */
export async function aktivasiDenganGoogle(_: HasilForm, formData: FormData): Promise<HasilForm> {
  const nilai = { loginId: String(formData.get("loginId") ?? ""), verifikasi: String(formData.get("verifikasi") ?? "") };
  const g = await bacaIdentitasTertunda();
  if (!g) return { galat: GALAT_GOOGLE_KEDALUWARSA, nilai };
  const parsed = skemaGoogleBaru.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { galatField: galatPerField(parsed.error), nilai };
  if (await db.user.findUnique({ where: { googleSub: g.sub } })) return { galat: "Akun Google ini sudah terhubung. Silakan masuk dengan Google.", nilai };

  const cek = await verifikasiAktivasi(parsed.data.loginId, parsed.data.verifikasi);
  if (!cek.ok) return { ...cek.hasil, nilai };
  // Password acak yang tidak diketahui siapa pun; pegawai bisa membuat password lewat "Lupa password".
  await buatAkun(cek, { passwordHash: await hashPassword(randomBytes(32).toString("base64url")), googleSub: g.sub, googleEmail: g.email });
  await hapusIdentitasTertunda();
  redirect("/beranda");
}

/** Akun yang sudah ada: hubungkan Google setelah NIP + password terbukti benar. */
export async function hubungkanGoogleAkunLama(_: HasilForm, formData: FormData): Promise<HasilForm> {
  const nilai = { loginId: String(formData.get("loginId") ?? "") };
  const g = await bacaIdentitasTertunda();
  if (!g) return { galat: GALAT_GOOGLE_KEDALUWARSA, nilai };
  const parsed = skemaGoogleLama.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { galatField: galatPerField(parsed.error), nilai };
  if (await db.user.findUnique({ where: { googleSub: g.sub } })) return { galat: "Akun Google ini sudah terhubung. Silakan masuk dengan Google.", nilai };

  const cek = await periksaKredensial(parsed.data.loginId, parsed.data.password);
  if (!("user" in cek)) return { ...cek, nilai };
  const { user } = cek;
  await db.user.update({ where: { id: user.id }, data: { googleSub: g.sub, googleEmail: g.email } });
  await catatAudit({ userId: user.id, aksi: "HUBUNGKAN_GOOGLE", entitas: "users", entitasId: user.id, sesudah: { googleEmail: g.email } });
  await catatAudit({ userId: user.id, aksi: "LOGIN", entitas: "users", entitasId: user.id, sesudah: { via: "google" } });
  await hapusIdentitasTertunda();
  await buatSesi(user.id);
  redirect(user.wajibGantiPassword ? "/profil?wajib=1" : "/beranda");
}

/**
 * Akun lama yang lupa password: buktikan dengan NIP + NIK (atau kode dari
 * Kepegawaian), hubungkan Google, lalu langsung ke form password baru.
 * Tanpa campur tangan admin.
 */
export async function pulihkanDenganGoogle(_: HasilForm, formData: FormData): Promise<HasilForm> {
  const nilai = { loginId: String(formData.get("loginId") ?? ""), verifikasi: String(formData.get("verifikasi") ?? "") };
  const g = await bacaIdentitasTertunda();
  if (!g) return { galat: GALAT_GOOGLE_KEDALUWARSA, nilai };
  const parsed = skemaGoogleBaru.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { galatField: galatPerField(parsed.error), nilai };
  if (await db.user.findUnique({ where: { googleSub: g.sub } })) return { galat: "Akun Google ini sudah terhubung. Silakan masuk dengan Google.", nilai };

  const cek = await verifikasiAktivasi(parsed.data.loginId, parsed.data.verifikasi, "pemulihan");
  if (!cek.ok) return { ...cek.hasil, nilai };
  const userId = cek.pegawai.user!.id;
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { googleSub: g.sub, googleEmail: g.email, gagalBerturut: 0, terkunciSampai: null, terakhirLogin: new Date() },
    });
    if (cek.kodeDipakaiId) await tx.kodeAktivasi.update({ where: { id: cek.kodeDipakaiId }, data: { dipakaiPada: new Date() } });
    await catatAudit(
      { userId, aksi: "PULIHKAN_AKUN_GOOGLE", entitas: "users", entitasId: userId, sesudah: { googleEmail: g.email, via: cek.kodeDipakaiId ? "kode" : "nik" } },
      tx,
    );
  });
  await catatPercobaan(cek.kunciBatas, true, "PEMULIHAN_BERHASIL", userId);
  await hapusIdentitasTertunda();
  await buatSesi(userId);
  await izinkanAturPassword(userId);
  redirect("/profil?atur=1");
}

/** Putuskan Google dari akun sendiri (masuk tetap bisa dengan NIP + password). */
export async function putuskanGoogle(): Promise<void> {
  const u = await wajibLogin({ lewatiWajibGanti: true });
  await db.user.update({ where: { id: u.userId }, data: { googleSub: null, googleEmail: null } });
  await catatAudit({ userId: u.userId, aksi: "PUTUSKAN_GOOGLE", entitas: "users", entitasId: u.userId });
  redirect("/profil?google=diputus");
}

/** Lupa password: setelah masuk lewat Google (mode reset), buat password baru tanpa password lama. */
export async function aturPasswordBaru(_: HasilForm, formData: FormData): Promise<HasilForm> {
  const u = await wajibLogin({ lewatiWajibGanti: true });
  if (!(await bolehAturPassword(u.userId))) return { galat: "Waktu atur ulang habis. Klik “Lupa password” dan masuk dengan Google lagi." };
  const parsed = skemaPasswordBaru.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { galatField: galatPerField(parsed.error) };
  await db.user.update({ where: { id: u.userId }, data: { passwordHash: await hashPassword(parsed.data.password), wajibGantiPassword: false, gagalBerturut: 0, terkunciSampai: null } });
  await hapusIzinAturPassword();
  await hapusSesiLain(u.userId, u.sesiId);
  await catatAudit({ userId: u.userId, aksi: "ATUR_ULANG_PASSWORD_GOOGLE", entitas: "users", entitasId: u.userId });
  return { sukses: "Password baru tersimpan. Sesi di perangkat lain sudah dikeluarkan." };
}

export async function aktivasiAkun(_: HasilForm, formData: FormData): Promise<HasilForm> {
  const parsed = skemaAktivasi.safeParse(Object.fromEntries(formData));
  const nilai = { loginId: String(formData.get("loginId") ?? ""), verifikasi: String(formData.get("verifikasi") ?? "") };
  if (!parsed.success) return { galatField: galatPerField(parsed.error), nilai };
  return { ...(await prosesAktivasi(parsed.data)), nilai };
}

async function prosesAktivasi(data: { loginId: string; verifikasi: string; password: string }): Promise<HasilForm> {
  const cek = await verifikasiAktivasi(data.loginId, data.verifikasi);
  if (!cek.ok) return cek.hasil;
  await buatAkun(cek, { passwordHash: await hashPassword(data.password) });
  redirect("/beranda");
}

type HasilVerifikasi =
  | {
      ok: true;
      pegawai: { id: string; nip: string | null; idNonAsn: string | null; user: { id: string } | null };
      kodeDipakaiId: string | null;
      kunciBatas: string;
    }
  | { ok: false; hasil: HasilForm };

/**
 * Pemeriksaan NIP/ID + faktor kedua (NIK tercatat atau kode aktivasi dari
 * Kepegawaian), bersama untuk aktivasi (pegawai belum punya akun) dan
 * pemulihan lupa password (akun aktif yang belum terhubung Google). Keduanya
 * berbagi batas 3 gagal per NIP per 24 jam agar NIK tidak bisa ditebak dua kali lipat.
 */
async function verifikasiAktivasi(loginIdMentah: string, verifikasi: string, untuk: "aktivasi" | "pemulihan" = "aktivasi"): Promise<HasilVerifikasi> {
  const pemulihan = untuk === "pemulihan";
  const GALAT = pemulihan ? GALAT_PEMULIHAN : GALAT_AKTIVASI;
  const gagal = (hasil: HasilForm): HasilVerifikasi => ({ ok: false, hasil });
  const loginId = normalisasiLoginId(loginIdMentah);
  const kunciBatas = `aktivasi:${loginId}`;

  if (await ipTerlaluBanyakGagal()) return gagal({ galat: GALAT_IP });
  // NIK sebagian bisa ditebak dari NIP (tanggal lahir, jenis kelamin): batas ketat 3 gagal per 24 jam per NIP.
  if ((await gagalTerakhir(kunciBatas, JENDELA_AKTIVASI_MS)) >= MAKS_GAGAL_AKTIVASI) {
    return gagal({ galat: "Terlalu banyak percobaan aktivasi untuk NIP ini. Coba lagi besok atau minta kode aktivasi ke Kepegawaian." });
  }

  const nipDiketik = /^\d+$/.test(loginId);
  if (nipDiketik) {
    const cek = parseNip(loginId);
    if (!cek.ok) return gagal({ galatField: { loginId: cek.galat } });
  }

  const pegawai = await db.pegawai.findFirst({
    where: nipDiketik ? { nip: loginId, aktif: true } : { idNonAsn: { equals: loginId, mode: "insensitive" }, aktif: true },
    include: { user: true, kodeAktivasi: { where: { dipakaiPada: null, kedaluwarsaPada: { gt: new Date() } } } },
  });
  // Satu pesan untuk NIP tak terdaftar, status akun yang tidak sesuai, dan verifikasi salah: tidak membocorkan NIP mana yang terdaftar.
  if (!pegawai) {
    await catatPercobaan(kunciBatas, false, "AKTIVASI_TIDAK_TERDAFTAR");
    return gagal({ galat: GALAT });
  }
  if (!pemulihan && pegawai.user) {
    await catatPercobaan(kunciBatas, false, "AKTIVASI_AKUN_SUDAH_ADA", pegawai.user.id);
    return gagal({ galat: GALAT });
  }
  // Pemulihan hanya untuk akun aktif yang belum terhubung Google; yang sudah terhubung memakai Google-nya sendiri.
  if (pemulihan && (!pegawai.user || !pegawai.user.aktif || pegawai.user.googleSub)) {
    await catatPercobaan(kunciBatas, false, "PEMULIHAN_AKUN_TIDAK_SESUAI", pegawai.user?.id);
    return gagal({ galat: GALAT });
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
    return gagal({ galat: GALAT });
  }
  return { ok: true, pegawai, kodeDipakaiId, kunciBatas };
}

/** Membuat akun untuk pegawai yang lolos verifikasi aktivasi, lalu langsung masuk. */
async function buatAkun(cek: Extract<HasilVerifikasi, { ok: true }>, akun: { passwordHash: string; googleSub?: string; googleEmail?: string }) {
  const { pegawai, kodeDipakaiId } = cek;
  const user = await db.$transaction(async (tx) => {
    const u = await tx.user.create({ data: { loginId: pegawai.nip ?? pegawai.idNonAsn!, pegawaiId: pegawai.id, ...akun } });
    if (kodeDipakaiId) await tx.kodeAktivasi.update({ where: { id: kodeDipakaiId }, data: { dipakaiPada: new Date() } });
    const via = `${kodeDipakaiId ? "kode" : "nik"}${akun.googleSub ? "+google" : ""}`;
    await catatAudit({ userId: u.id, aksi: "AKTIVASI_AKUN", entitas: "users", entitasId: u.id, sesudah: { loginId: u.loginId, via } }, tx);
    return u;
  });
  await catatPercobaan(cek.kunciBatas, true, "AKTIVASI_BERHASIL", user.id);
  await buatSesi(user.id);
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
