import { redirect } from "next/navigation";
import { catatAudit } from "@/server/audit";
import { catatPercobaan } from "@/server/auth/batas-login";
import { googleAktif, izinkanAturPassword, selesaikanGoogle, simpanIdentitasTertunda } from "@/server/auth/google";
import { penggunaSaatIni } from "@/server/auth/pengguna";
import { buatSesi } from "@/server/auth/sesi";
import { db } from "@/server/db";

/** Kembali dari Google: masuk, hubungkan ke akun yang sedang login, atau lanjut verifikasi NIP. */
export async function GET(req: Request) {
  if (!googleAktif()) redirect("/login?google=nonaktif");
  const g = await selesaikanGoogle(new URL(req.url).searchParams);
  if (!g.ok) redirect("/login?google=gagal");
  const pemilik = await db.user.findUnique({ where: { googleSub: g.sub } });

  if (g.mode === "hubungkan") {
    const u = await penggunaSaatIni();
    if (!u) redirect("/login");
    if (pemilik && pemilik.id !== u.userId) redirect("/profil?google=dipakai");
    await db.user.update({ where: { id: u.userId }, data: { googleSub: g.sub, googleEmail: g.email } });
    await catatAudit({ userId: u.userId, aksi: "HUBUNGKAN_GOOGLE", entitas: "users", entitasId: u.userId, sesudah: { googleEmail: g.email } });
    redirect("/profil?google=terhubung");
  }

  // Belum terhubung: verifikasi NIP + NIK/kode (akun baru) atau NIP + password (akun lama) dulu.
  if (!pemilik) {
    await simpanIdentitasTertunda({ sub: g.sub, email: g.email });
    redirect(g.mode === "reset" ? "/daftar/google?lupa=1" : "/daftar/google");
  }
  if (!pemilik.aktif) {
    await catatPercobaan(pemilik.loginId, false, "GOOGLE_AKUN_NONAKTIF", pemilik.id);
    redirect("/login?google=nonaktif-akun");
  }

  // Google membuktikan pemilik akun: kunci akibat salah password ikut dibuka.
  await db.user.update({ where: { id: pemilik.id }, data: { gagalBerturut: 0, terkunciSampai: null, terakhirLogin: new Date(), googleEmail: g.email } });
  await catatPercobaan(pemilik.loginId, true, "GOOGLE", pemilik.id);
  await catatAudit({ userId: pemilik.id, aksi: "LOGIN", entitas: "users", entitasId: pemilik.id, sesudah: { via: "google" } });
  await buatSesi(pemilik.id);
  if (g.mode === "reset") {
    await izinkanAturPassword(pemilik.id);
    redirect("/profil?atur=1");
  }
  redirect(pemilik.wajibGantiPassword ? "/profil?wajib=1" : "/beranda");
}
