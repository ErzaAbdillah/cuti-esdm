import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { namaLengkap } from "@/lib/domain/pegawai";
import { formatNip } from "@/lib/domain/nip";
import type { Peran } from "@/lib/generated/prisma/enums";
import type { PeranEfektif } from "@/lib/peran";
import { db } from "../db";
import { bacaSesi } from "./sesi";

export type { PeranEfektif };

export interface PenggunaSaatIni {
  userId: string;
  sesiId: string;
  loginId: string;
  wajibGantiPassword: boolean;
  peran: ReadonlySet<PeranEfektif>;
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
  // Admin mendapat semua akses peran yang bisa diberikan (termasuk Kepegawaian).
  if (peran.has("ADMIN")) peran.add("KEPEGAWAIAN");
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
    pegawai,
  };
});

export function punyaPeran(u: PenggunaSaatIni, ...peran: PeranEfektif[]): boolean {
  return peran.some((p) => u.peran.has(p));
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
