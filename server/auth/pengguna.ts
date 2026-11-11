import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { namaLengkap } from "@/lib/domain/pegawai";
import { formatNip } from "@/lib/domain/nip";
import type { HakAkses, Peran } from "@/lib/generated/prisma/enums";
import { HAK_AKSES_BAWAAN_KEPEGAWAIAN, SEMUA_HAK_AKSES } from "@/lib/hak-akses";
import type { PeranEfektif } from "@/lib/peran";
import { db } from "../db";
import { bacaSesi } from "./sesi";

export type { HakAkses, PeranEfektif };

export interface PenggunaSaatIni {
  userId: string;
  sesiId: string;
  loginId: string;
  wajibGantiPassword: boolean;
  peran: ReadonlySet<PeranEfektif>;
  hakAkses: ReadonlySet<HakAkses>;
  pegawai: {
    id: string;
    namaLengkap: string;
    nip: string | null;
    jabatan: string | null;
    unitId: string;
    unit: string;
  } | null;
}

/** Data Access Layer: satu-satunya pintu membaca pengguna yang sedang login. */
export const penggunaSaatIni = cache(async (): Promise<PenggunaSaatIni | null> => {
  const sesi = await bacaSesi();
  if (!sesi) return null;

  const peran = new Set<PeranEfektif>(sesi.user.peran.map((p) => p.peran as Peran));
  const superadmin = peran.has("ADMIN") || sesi.user.loginId.toLowerCase() === "admin";
  // Superadmin / Admin mendapat semua akses peran yang bisa diberikan (termasuk Admin & Kepegawaian).
  if (superadmin) {
    peran.add("ADMIN");
    peran.add("KEPEGAWAIAN");
  }

  const hakAkses = new Set<HakAkses>(sesi.user.hakAkses.map((h) => h.hakAkses));
  if (superadmin) {
    for (const h of SEMUA_HAK_AKSES) hakAkses.add(h);
  } else if (peran.has("KEPEGAWAIAN")) {
    for (const h of HAK_AKSES_BAWAAN_KEPEGAWAIAN) hakAkses.add(h);
  }

  let pegawai: PenggunaSaatIni["pegawai"] = null;

  if (sesi.user.pegawaiId) {
    const p = await db.pegawai.findUnique({
      where: { id: sesi.user.pegawaiId },
      include: { jabatan: true, unitKerja: true, _count: { select: { bawahan: { where: { aktif: true } } } } },
    });
    if (p) {
      peran.add("PEGAWAI");
      if (p._count.bawahan > 0) peran.add("ATASAN");
      pegawai = {
        id: p.id,
        namaLengkap: namaLengkap(p),
        nip: p.nip ? formatNip(p.nip) : p.idNonAsn,
        jabatan: p.jabatan?.nama ?? null,
        unitId: p.unitKerjaId,
        unit: p.unitKerja.nama,
      };
    }
  }

  return {
    userId: sesi.user.id,
    sesiId: sesi.id,
    loginId: sesi.user.loginId,
    wajibGantiPassword: sesi.user.wajibGantiPassword,
    peran,
    hakAkses,
    pegawai,
  };
});

export function adalahSuperadmin(u: Pick<PenggunaSaatIni, "peran" | "loginId">): boolean {
  return u.peran.has("ADMIN") || u.loginId.toLowerCase() === "admin";
}

export function punyaPeran(u: PenggunaSaatIni, ...peran: PeranEfektif[]): boolean {
  if (adalahSuperadmin(u) && peran.includes("ADMIN")) return true;
  return peran.some((p) => u.peran.has(p));
}

export function punyaHakAkses(u: PenggunaSaatIni, ...hak: HakAkses[]): boolean {
  if (u.peran.has("ADMIN") || u.loginId.toLowerCase() === "admin") return true;
  return hak.some((h) => u.hakAkses.has(h));
}

/**
 * Untuk halaman & aksi: arahkan ke /login bila belum masuk, dan ke /profil
 * bila password wajib diganti (setelah reset oleh Admin).
 */
export async function wajibLogin(opsi?: { lewatiWajibGanti?: boolean }): Promise<PenggunaSaatIni> {
  const u = await penggunaSaatIni();
  if (!u) redirect("/login");
  if (u.wajibGantiPassword && !opsi?.lewatiWajibGanti) redirect("/profil?wajib=1");
  return u;
}

/** Untuk halaman: tolak bila tidak punya salah satu peran. */
export async function wajibPeran(...peran: PeranEfektif[]): Promise<PenggunaSaatIni> {
  const u = await wajibLogin();
  if (!punyaPeran(u, ...peran)) redirect("/akses-ditolak");
  return u;
}

/** Untuk halaman: tolak bila tidak punya salah satu hak akses. */
export async function wajibHakAkses(...hak: HakAkses[]): Promise<PenggunaSaatIni> {
  const u = await wajibLogin();
  if (!punyaHakAkses(u, ...hak)) redirect("/akses-ditolak");
  return u;
}
