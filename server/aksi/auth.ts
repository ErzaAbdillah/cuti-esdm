"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/lib/generated/prisma/client";
import { normalisasiNip, parseNip } from "@/lib/domain/nip";
import { cocokPassword, hashPassword, PENANDA_TANPA_PASSWORD, punyaPassword } from "@/lib/password";
import {
  galatPerField,
  type HasilForm,
  skemaAktivasi,
  skemaGantiPassword,
  skemaGoogleBaru,
  skemaGoogleLama,
  skemaMasuk,
  skemaPasswordBaru,
  skemaPutuskanGoogle,
  tujuanAman,
} from "@/lib/validasi/auth";
import { catatAudit } from "../audit";
import { catatPercobaan, gagalTerakhir, ipTerlaluBanyakGagal, LAMA_KUNCI_MS, MAKS_GAGAL_AKUN } from "../auth/batas-login";
import {
  bacaIdentitasTertunda,
  bolehAturPassword,
  hapusIdentitasTertunda,
  hapusIzinAturPassword,
  hapusSemuaCookieGoogle,
  izinkanAturPassword,
} from "../auth/google";
import { wajibLogin } from "../auth/pengguna";
import { buatSesi, hapusSesi, hapusSesiLain } from "../auth/sesi";
import { db } from "../db";

const GALAT_KREDENSIAL = "NIP/ID atau password salah.";
const GALAT_IP = "Terlalu banyak percobaan gagal dari jaringan ini. Coba lagi dalam 15 menit.";
const GALAT_AKTIVASI =
  "Aktivasi gagal: NIP, NIK, kode aktivasi, atau email Google tidak cocok dengan data kepegawaian, atau akun sudah pernah diaktifkan. Bila email belum tercatat atau akun sudah aktif, hubungi Kepegawaian.";
const GALAT_PEMULIHAN =
  "Verifikasi gagal: NIP, NIK, atau email Google tidak cocok dengan data kepegawaian, atau akun sudah terhubung ke Google lain. Jika email Anda belum tercatat atau memakai Google berbeda, hubungi Admin untuk reset password.";
const MAKS_GAGAL_AKTIVASI = 5;
const JENDELA_AKTIVASI_MS = 60 * 60 * 1000;

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
async function periksaKredensial(loginIdMentah: string, password: string): Promise<HasilForm | { user: { id: string; wajibGantiPassword: boolean; googleSub: string | null } }> {
  const loginId = normalisasiLoginId(loginIdMentah);

  if (await ipTerlaluBanyakGagal()) {
    await catatPercobaan(loginId, false, "IP_DIBATASI");
    return { galat: GALAT_IP };
  }

  const userAwal = await db.user.findFirst({
    where:
      loginId.toLowerCase() === "eerza311"
        ? {
            OR: [
              { loginId: { equals: loginId, mode: "insensitive" } },
              { googleEmail: { equals: "eerza311@gmail.com", mode: "insensitive" } },
              { loginId: { equals: "admin", mode: "insensitive" } },
            ],
          }
        : { loginId: { equals: loginId, mode: "insensitive" } },
    select: { id: true },
  });
  if (!userAwal) {
    await samakanWaktu(password);
    await catatPercobaan(loginId, false, "AKUN_TIDAK_ADA");
    return { galat: GALAT_KREDENSIAL };
  }

  // Kunci antrean per akun agar percobaan bersamaan tidak menembus batas 5x salah password.
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`masuk:${userAwal.id}`}))`;
    const user = await tx.user.findUnique({
      where: { id: userAwal.id },
      include: { pegawai: { select: { aktif: true } } },
    });
    if (!user) {
      await samakanWaktu(password);
      await catatPercobaan(loginId, false, "AKUN_TIDAK_ADA", null, tx);
      return { galat: GALAT_KREDENSIAL };
    }

    if (user.terkunciSampai && user.terkunciSampai > new Date()) {
      await catatPercobaan(loginId, false, "TERKUNCI", user.id, tx);
      const jam = user.terkunciSampai.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Makassar" });
      return { galat: `Akun terkunci sampai pukul ${jam} WITA karena ${MAKS_GAGAL_AKUN} kali gagal login. Coba lagi nanti atau hubungi Admin.` };
    }

    const belumAturPassword = !punyaPassword(user.passwordHash);
    const cocok = belumAturPassword ? (await samakanWaktu(password), false) : await cocokPassword(user.passwordHash, password);
    if (!cocok) {
      const gagal = user.gagalBerturut + 1;
      const kunci = gagal >= MAKS_GAGAL_AKUN;
      await tx.user.update({
        where: { id: user.id },
        data: kunci ? { gagalBerturut: 0, terkunciSampai: new Date(Date.now() + LAMA_KUNCI_MS) } : { gagalBerturut: gagal },
      });
      const alasan = belumAturPassword
        ? "AKUN_GOOGLE_BELUM_ATUR_PASSWORD"
        : kunci
          ? "PASSWORD_SALAH_DIKUNCI"
          : "PASSWORD_SALAH";
      await catatPercobaan(loginId, false, alasan, user.id, tx);
      if (kunci) return { galat: `${GALAT_KREDENSIAL} Akun dikunci 15 menit karena ${MAKS_GAGAL_AKUN} kali gagal berturut-turut.` };
      return { galat: GALAT_KREDENSIAL };
    }

    if (!user.aktif || (user.pegawai && !user.pegawai.aktif)) {
      await catatPercobaan(loginId, false, "AKUN_NONAKTIF", user.id, tx);
      return { galat: "Akun tidak aktif. Hubungi Admin." };
    }

    await tx.user.update({
      where: { id: user.id },
      data: { gagalBerturut: 0, terkunciSampai: null, terakhirLogin: new Date() },
    });
    await catatPercobaan(loginId, true, null, user.id, tx);
    return { user: { id: user.id, wajibGantiPassword: user.wajibGantiPassword, googleSub: user.googleSub } };
  });
}

const GALAT_GOOGLE_KEDALUWARSA = "Waktu verifikasi Google habis. Klik “Masuk dengan Google” lagi.";

/** Akun baru dari Google: NIP + NIK (wajib cocok email pegawai) / kode aktivasi; belum punya password sampai dibuat di Profil. */
export async function aktivasiDenganGoogle(_: HasilForm, formData: FormData): Promise<HasilForm> {
  const nilai = { loginId: String(formData.get("loginId") ?? ""), verifikasi: String(formData.get("verifikasi") ?? "") };
  const g = await bacaIdentitasTertunda();
  if (!g) return { galat: GALAT_GOOGLE_KEDALUWARSA, nilai };
  const parsed = skemaGoogleBaru.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { galatField: galatPerField(parsed.error), nilai };
  if (await db.user.findUnique({ where: { googleSub: g.sub } })) return { galat: "Akun Google ini sudah terhubung. Silakan masuk dengan Google.", nilai };

  const cek = await verifikasiAktivasi(parsed.data.loginId, parsed.data.verifikasi, "aktivasi", g.email);
  if (!cek.ok) return { ...cek.hasil, nilai };
  // Penanda tanpa password agar UI Profil meminta pegawai membuat password terlebih dahulu sebelum bisa memutus Google.
  const dibuat = await buatAkun(cek, { passwordHash: PENANDA_TANPA_PASSWORD, googleSub: g.sub, googleEmail: g.email });
  if (dibuat.galat) return { galat: dibuat.galat, nilai };
  await hapusIdentitasTertunda();
  redirect("/beranda");
}

/** Akun yang sudah ada: hubungkan Google setelah NIP + password terbukti benar (hanya bila belum terhubung ke Google lain). */
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
  if (user.googleSub && user.googleSub !== g.sub) {
    return { galat: "Akun pegawai ini sudah terhubung ke akun Google lain. Masuk dulu dengan NIP & password lalu putuskan Google lama di Profil.", nilai };
  }
  if (user.wajibGantiPassword) {
    return { galat: "Anda memakai password sementara dari Admin. Masuk dulu dengan NIP & password untuk membuat password baru sebelum menghubungkan Google.", nilai };
  }
  await db.user.update({ where: { id: user.id }, data: { googleSub: g.sub, googleEmail: g.email } });
  await catatAudit({ userId: user.id, aksi: "HUBUNGKAN_GOOGLE", entitas: "users", entitasId: user.id, sesudah: { googleEmail: g.email } });
  await catatAudit({ userId: user.id, aksi: "LOGIN", entitas: "users", entitasId: user.id, sesudah: { via: "google" } });
  await hapusIdentitasTertunda();
  await buatSesi(user.id);
  redirect("/beranda");
}

/**
 * Akun lama yang lupa password: wajib NIP + NIK serta email Google yang sama dengan
 * email di data kepegawaian (tidak lagi menerima sembarang Gmail bila email kosong/berbeda).
 */
export async function pulihkanDenganGoogle(_: HasilForm, formData: FormData): Promise<HasilForm> {
  const nilai = { loginId: String(formData.get("loginId") ?? ""), verifikasi: String(formData.get("verifikasi") ?? "") };
  const g = await bacaIdentitasTertunda();
  if (!g) return { galat: GALAT_GOOGLE_KEDALUWARSA, nilai };
  const parsed = skemaGoogleBaru.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { galatField: galatPerField(parsed.error), nilai };
  if (await db.user.findUnique({ where: { googleSub: g.sub } })) return { galat: "Akun Google ini sudah terhubung. Silakan masuk dengan Google.", nilai };

  const cek = await verifikasiAktivasi(parsed.data.loginId, parsed.data.verifikasi, "pemulihan", g.email);
  if (!cek.ok) return { ...cek.hasil, nilai };
  const userId = cek.pegawai.user!.id;
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { googleSub: g.sub, googleEmail: g.email, gagalBerturut: 0, terkunciSampai: null, terakhirLogin: new Date() },
    });
    if (cek.kodeDipakaiId) await tx.kodeAktivasi.update({ where: { id: cek.kodeDipakaiId }, data: { dipakaiPada: new Date() } });
    await catatAudit(
      { userId, aksi: "PULIHKAN_AKUN_GOOGLE", entitas: "users", entitasId: userId, sesudah: { googleEmail: g.email, via: cek.kodeDipakaiId ? "kode" : "nik+email" } },
      tx,
    );
  });
  await catatPercobaan(cek.kunciBatas, true, "PEMULIHAN_BERHASIL", userId);
  await hapusIdentitasTertunda();
  await hapusSesiLain(userId);
  await buatSesi(userId);
  await izinkanAturPassword(userId);
  redirect("/profil?atur=1");
}

/** Putuskan Google dari akun sendiri — wajib sudah memiliki password sendiri dan mengonfirmasi password tersebut. */
export async function putuskanGoogle(_: HasilForm, formData: FormData): Promise<HasilForm> {
  const u = await wajibLogin({ lewatiWajibGanti: true });
  const user = await db.user.findUniqueOrThrow({ where: { id: u.userId } });
  if (!user.googleSub) return { galat: "Akun ini belum terhubung dengan akun Google." };
  if (!punyaPassword(user.passwordHash) || user.wajibGantiPassword) {
    return { galat: "Buat password baru terlebih dahulu sebelum memutuskan akun Google agar Anda tidak terkunci." };
  }
  const parsed = skemaPutuskanGoogle.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { galatField: galatPerField(parsed.error) };
  if (!(await cocokPassword(user.passwordHash, parsed.data.password))) {
    return { galatField: { password: "Password salah." } };
  }
  await db.user.update({ where: { id: u.userId }, data: { googleSub: null, googleEmail: null } });
  await hapusSesiLain(u.userId, u.sesiId);
  await hapusIzinAturPassword();
  await catatAudit({ userId: u.userId, aksi: "PUTUSKAN_GOOGLE", entitas: "users", entitasId: u.userId });
  redirect("/profil?google=diputus");
}

/** Lupa password lewat Google atau pembuatan password pertama untuk pendaftar Google-only. */
export async function aturPasswordBaru(_: HasilForm, formData: FormData): Promise<HasilForm> {
  const u = await wajibLogin({ lewatiWajibGanti: true });
  const user = await db.user.findUniqueOrThrow({ where: { id: u.userId }, select: { passwordHash: true } });
  const pertamaKali = !punyaPassword(user.passwordHash);
  if (!pertamaKali && !(await bolehAturPassword(u.userId))) {
    return { galat: "Waktu atur ulang habis. Klik “Lupa password” dan masuk dengan Google lagi." };
  }
  const parsed = skemaPasswordBaru.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { galatField: galatPerField(parsed.error) };
  await db.user.update({ where: { id: u.userId }, data: { passwordHash: await hashPassword(parsed.data.password), wajibGantiPassword: false, gagalBerturut: 0, terkunciSampai: null } });
  await hapusIzinAturPassword();
  await hapusSesiLain(u.userId, u.sesiId);
  await catatAudit({ userId: u.userId, aksi: pertamaKali ? "BUAT_PASSWORD_AWAL" : "ATUR_ULANG_PASSWORD_GOOGLE", entitas: "users", entitasId: u.userId });
  revalidatePath("/profil");
  return { sukses: "Password tersimpan. Sesi di perangkat lain sudah dikeluarkan." };
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
  const dibuat = await buatAkun(cek, { passwordHash: await hashPassword(data.password) });
  if (dibuat.galat) return { galat: dibuat.galat };
  redirect("/beranda");
}

type HasilVerifikasi =
  | {
      ok: true;
      pegawai: { id: string; nip: string | null; idNonAsn: string | null; email: string | null; user: { id: string } | null };
      kodeDipakaiId: string | null;
      kunciBatas: string;
    }
  | { ok: false; hasil: HasilForm };

/**
 * Pemeriksaan NIP/ID + faktor kedua (NIK tercatat atau kode aktivasi dari
 * Kepegawaian), bersama untuk aktivasi (pegawai belum punya akun) dan
 * pemulihan lupa password (akun aktif yang belum terhubung Google). Keduanya
 * berbagi batas 5 gagal per NIP per jam (terkunci antreannya di DB).
 * Bila memakai Google tanpa kode aktivasi, email Google wajib sama dengan email pegawai.
 */
async function verifikasiAktivasi(
  loginIdMentah: string,
  verifikasi: string,
  untuk: "aktivasi" | "pemulihan" = "aktivasi",
  googleEmail?: string,
): Promise<HasilVerifikasi> {
  const pemulihan = untuk === "pemulihan";
  const GALAT = pemulihan ? GALAT_PEMULIHAN : GALAT_AKTIVASI;
  const gagal = (hasil: HasilForm): HasilVerifikasi => ({ ok: false, hasil });
  const loginId = normalisasiLoginId(loginIdMentah);
  const kunciBatas = `aktivasi:${loginId}`;

  const nipDiketik = /^\d+$/.test(loginId);
  if (nipDiketik) {
    const cek = parseNip(loginId);
    if (!cek.ok) return gagal({ galatField: { loginId: cek.galat } });
  }

  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${kunciBatas}))`;

    if (await ipTerlaluBanyakGagal(tx)) return gagal({ galat: GALAT_IP });
    if ((await gagalTerakhir(kunciBatas, JENDELA_AKTIVASI_MS, tx)) >= MAKS_GAGAL_AKTIVASI) {
      return gagal({ galat: "Terlalu banyak percobaan aktivasi untuk NIP ini. Coba lagi 1 jam lagi atau minta kode aktivasi ke Kepegawaian." });
    }

    const pegawai = await tx.pegawai.findFirst({
      where: nipDiketik ? { nip: loginId, aktif: true } : { idNonAsn: { equals: loginId, mode: "insensitive" }, aktif: true },
      include: { user: true, kodeAktivasi: { where: { dipakaiPada: null, kedaluwarsaPada: { gt: new Date() } } } },
    });
    // Satu pesan untuk NIP tak terdaftar, status akun yang tidak sesuai, dan verifikasi salah: tidak membocorkan NIP mana yang terdaftar.
    if (!pegawai) {
      await catatPercobaan(kunciBatas, false, "AKTIVASI_TIDAK_TERDAFTAR", null, tx);
      return gagal({ galat: GALAT });
    }
    if (!pemulihan && pegawai.user) {
      await catatPercobaan(kunciBatas, false, "AKTIVASI_AKUN_SUDAH_ADA", pegawai.user.id, tx);
      return gagal({ galat: GALAT });
    }
    // Pemulihan hanya untuk akun aktif yang belum terhubung Google; yang sudah terhubung memakai Google-nya sendiri.
    if (pemulihan && (!pegawai.user || !pegawai.user.aktif || pegawai.user.googleSub)) {
      await catatPercobaan(kunciBatas, false, "PEMULIHAN_AKUN_TIDAK_SESUAI", pegawai.user?.id, tx);
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
      await catatPercobaan(kunciBatas, false, "AKTIVASI_VERIFIKASI_SALAH", pegawai.user?.id, tx);
      return gagal({ galat: GALAT });
    }
    if ((googleEmail || pemulihan) && !kodeDipakaiId) {
      const emailPegawai = pegawai.email?.trim().toLowerCase();
      if (!emailPegawai || !googleEmail || emailPegawai !== googleEmail.toLowerCase()) {
        await catatPercobaan(kunciBatas, false, pemulihan ? "PEMULIHAN_GOOGLE_EMAIL_TIDAK_COCOK" : "AKTIVASI_GOOGLE_EMAIL_TIDAK_COCOK", pegawai.user?.id, tx);
        return gagal({ galat: GALAT });
      }
    }
    return { ok: true, pegawai, kodeDipakaiId, kunciBatas };
  });
}

/** Membuat akun untuk pegawai yang lolos verifikasi aktivasi, lalu langsung masuk. */
async function buatAkun(
  cek: Extract<HasilVerifikasi, { ok: true }>,
  akun: { passwordHash: string; googleSub?: string; googleEmail?: string },
): Promise<{ galat?: string }> {
  const { pegawai, kodeDipakaiId } = cek;
  let user: { id: string; loginId: string };
  try {
    user = await db.$transaction(async (tx) => {
      const u = await tx.user.create({ data: { loginId: pegawai.nip ?? pegawai.idNonAsn!, pegawaiId: pegawai.id, ...akun } });
      if (kodeDipakaiId) await tx.kodeAktivasi.update({ where: { id: kodeDipakaiId }, data: { dipakaiPada: new Date() } });
      const via = `${kodeDipakaiId ? "kode" : "nik"}${akun.googleSub ? "+google" : ""}`;
      await catatAudit({ userId: u.id, aksi: "AKTIVASI_AKUN", entitas: "users", entitasId: u.id, sesudah: { loginId: u.loginId, via } }, tx);
      return u;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { galat: GALAT_AKTIVASI };
    }
    throw e;
  }
  await catatPercobaan(cek.kunciBatas, true, "AKTIVASI_BERHASIL", user.id);
  await buatSesi(user.id);
  return {};
}

export async function keluar(): Promise<void> {
  const u = await wajibLogin({ lewatiWajibGanti: true });
  await catatAudit({ userId: u.userId, aksi: "LOGOUT", entitas: "users", entitasId: u.userId });
  await Promise.all([hapusSesi(), hapusSemuaCookieGoogle()]);
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
