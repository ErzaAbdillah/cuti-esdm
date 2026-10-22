import "server-only";
import { formatNip } from "@/lib/domain/nip";
import { namaLengkap } from "@/lib/domain/pegawai";
import { saldoTersedia, totalHak } from "@/lib/domain/saldo-cuti";
import { db } from "../db";
import { anggotaGrup, GRUP_PJLP, semuaGrup } from "./daftar-hadir";

export interface BarisSaldo {
  pegawaiId: string;
  nama: string;
  nip: string;
  jabatan: string;
  saldo: { hakTahunIni: number; sisaN1: number; sisaN2: number; penyesuaian: number; terpakai: number } | null;
  totalHak: number | null;
  sisa: number | null;
}

async function barisUntuk(pegawaiIds: string[], tahun: number, q?: string): Promise<BarisSaldo[]> {
  const ps = await db.pegawai.findMany({
    where: {
      id: { in: pegawaiIds },
      statusKepegawaian: { not: "NON_ASN" },
      ...(q ? { OR: [{ nama: { contains: q, mode: "insensitive" } }, { nip: { contains: q.replace(/\s/g, "") } }] } : {}),
    },
    include: { jabatan: true, saldoCuti: { where: { tahun } } },
    orderBy: [{ urutanDaftarHadir: { sort: "asc", nulls: "last" } }, { nama: "asc" }],
  });
  return ps.map((p) => {
    const s = p.saldoCuti[0] ?? null;
    return {
      pegawaiId: p.id,
      nama: namaLengkap(p),
      nip: p.nip ? formatNip(p.nip) : "",
      jabatan: p.jabatan?.namaSingkat ?? p.jabatan?.nama ?? "-",
      saldo: s && { hakTahunIni: s.hakTahunIni, sisaN1: s.sisaN1, sisaN2: s.sisaN2, penyesuaian: s.penyesuaian, terpakai: s.terpakai },
      totalHak: s ? totalHak(s) : null,
      sisa: s ? saldoTersedia(s) : null,
    };
  });
}

/** Rekap per unit (Sekretariat, Bidang, UPTD) — format "REKAP CUTI TAHUNAN ASN". */
export async function rekapCutiTahunan(tahun: number, grupId?: string, q?: string) {
  const grup = (await semuaGrup()).filter((g) => g.id !== GRUP_PJLP && (!grupId || g.id === grupId));
  const hasil = [];
  for (const g of grup) hasil.push({ ...g, baris: await barisUntuk(await anggotaGrup(g.id), tahun, q) });
  return hasil;
}
