import "server-only";
import { z } from "zod";
import { tentukanLevelSurat } from "@/lib/domain/level-surat";
import { formatNip } from "@/lib/domain/nip";
import { namaLengkap, pangkatTampil } from "@/lib/domain/pegawai";
import { idTurunan, urutkanPohon } from "@/lib/domain/unit";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { LevelSurat } from "@/lib/generated/prisma/enums";
import { LEVEL_SURAT, STATUS_KEPEGAWAIAN } from "@/lib/validasi/pegawai";
import { db } from "../db";

export const PER_HALAMAN = 25;

const KOLOM_URUT = ["nama", "nip", "unit", "jabatan", "pangkat"] as const;

export const skemaFilterPegawai = z.object({
  q: z.string().trim().max(60).optional().catch(undefined),
  unit: z.uuid().optional().catch(undefined),
  jabatan: z.uuid().optional().catch(undefined),
  level: z.enum(LEVEL_SURAT).optional().catch(undefined),
  pangkat: z.uuid().optional().catch(undefined),
  status: z.enum(STATUS_KEPEGAWAIAN).optional().catch(undefined),
  aktif: z.enum(["ya", "tidak", "semua"]).default("ya").catch("ya"),
  urut: z.enum(KOLOM_URUT).default("nama").catch("nama"),
  arah: z.enum(["asc", "desc"]).default("asc").catch("asc"),
  hal: z.coerce.number().int().min(1).default(1).catch(1),
});
export type FilterPegawai = z.infer<typeof skemaFilterPegawai>;

export function bacaFilter(sp: Record<string, string | string[] | undefined>): FilterPegawai {
  const datar = Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]).filter(([, v]) => v !== ""));
  return skemaFilterPegawai.parse(datar);
}

async function aturanEselon() {
  return db.mappingEselon.findMany({ where: { jenisJabatan: "STRUKTURAL" } });
}

/** Kondisi Prisma untuk filter eselon (level surat). */
async function kondisiLevel(level: LevelSurat): Promise<Prisma.PegawaiWhereInput> {
  const mapping = await aturanEselon();
  const rentang = (m: typeof mapping) => m.map((r) => ({ kelasJabatan: { gte: r.kelasMin, lte: r.kelasMax } }));
  if (level === "STAF") {
    return {
      OR: [
        { levelSuratOverride: "STAF" },
        { levelSuratOverride: null, NOT: { jabatan: { is: { jenis: "STRUKTURAL", OR: rentang(mapping) } } } },
      ],
    };
  }
  const cocok = mapping.filter((m) => m.level === level);
  return {
    OR: [
      { levelSuratOverride: level },
      ...(cocok.length ? [{ levelSuratOverride: null, jabatan: { is: { jenis: "STRUKTURAL" as const, OR: rentang(cocok) } } }] : []),
    ],
  };
}

export async function kondisiFilter(f: FilterPegawai): Promise<Prisma.PegawaiWhereInput> {
  const dan: Prisma.PegawaiWhereInput[] = [];
  if (f.aktif !== "semua") dan.push({ aktif: f.aktif === "ya" });
  if (f.status) dan.push({ statusKepegawaian: f.status });
  if (f.jabatan) dan.push({ jabatanId: f.jabatan });
  if (f.pangkat) dan.push({ pangkatGolonganId: f.pangkat });
  if (f.unit) {
    const units = await db.unitKerja.findMany({ select: { id: true, parentId: true, nama: true, urutan: true } });
    dan.push({ unitKerjaId: { in: [...idTurunan(f.unit, units)] } });
  }
  if (f.level) dan.push(await kondisiLevel(f.level));
  if (f.q) {
    const angka = f.q.replace(/[\s.\-]/g, "");
    dan.push({
      OR: [
        { nama: { contains: f.q, mode: "insensitive" } },
        ...(/^\d+$/.test(angka) ? [{ nip: { contains: angka } }] : []),
        { idNonAsn: { contains: f.q, mode: "insensitive" } },
      ],
    });
  }
  return { AND: dan };
}

function urutan(f: FilterPegawai): Prisma.PegawaiOrderByWithRelationInput[] {
  const a = f.arah;
  const utama: Record<(typeof KOLOM_URUT)[number], Prisma.PegawaiOrderByWithRelationInput> = {
    nama: { nama: a },
    nip: { nip: { sort: a, nulls: "last" } },
    unit: { unitKerja: { nama: a } },
    jabatan: { jabatan: { nama: a } },
    pangkat: { pangkatGolongan: { urutan: a } },
  };
  return [utama[f.urut], { nama: "asc" }, { id: "asc" }];
}

const sertakanBaris = {
  jabatan: true,
  unitKerja: true,
  pangkatGolongan: true,
  atasanLangsung: { select: { gelarDepan: true, nama: true, gelarBelakang: true } },
  user: { select: { id: true, aktif: true } },
} satisfies Prisma.PegawaiInclude;

type PegawaiBaris = Prisma.PegawaiGetPayload<{ include: typeof sertakanBaris }>;

export function bentukBaris(p: PegawaiBaris, mapping: Awaited<ReturnType<typeof aturanEselon>>) {
  return {
    id: p.id,
    nama: namaLengkap(p),
    nip: p.nip ? formatNip(p.nip) : null,
    idNonAsn: p.idNonAsn,
    status: p.statusKepegawaian,
    pangkat: pangkatTampil(p.pangkatGolongan),
    jabatan: p.jabatan?.nama ?? "-",
    kelas: p.jabatan?.kelasJabatan ?? null,
    level: tentukanLevelSurat(
      { jenisJabatan: p.jabatan?.jenis ?? null, kelas: p.jabatan?.kelasJabatan ?? null, override: p.levelSuratOverride },
      mapping,
    ),
    unit: p.unitKerja.nama,
    atasan: p.atasanLangsung ? namaLengkap(p.atasanLangsung) : null,
    aktif: p.aktif,
    punyaAkun: !!p.user,
  };
}
export type BarisPegawai = ReturnType<typeof bentukBaris>;

export async function daftarPegawai(f: FilterPegawai) {
  const where = await kondisiFilter(f);
  const [total, data, mapping] = await Promise.all([
    db.pegawai.count({ where }),
    db.pegawai.findMany({
      where,
      include: sertakanBaris,
      orderBy: urutan(f),
      skip: (f.hal - 1) * PER_HALAMAN,
      take: PER_HALAMAN,
    }),
    aturanEselon(),
  ]);
  return { total, baris: data.map((p) => bentukBaris(p, mapping)) };
}

/** Semua baris (untuk ekspor), dengan kolom lengkap. */
export async function semuaPegawaiUntukEkspor(f: FilterPegawai) {
  const where = await kondisiFilter(f);
  const [data, mapping] = await Promise.all([
    db.pegawai.findMany({ where, include: sertakanBaris, orderBy: urutan(f) }),
    aturanEselon(),
  ]);
  return data.map((p) => ({ ...bentukBaris(p, mapping), mentah: p }));
}

/** Pilihan untuk dropdown filter & form. */
export async function opsiPegawai() {
  const [units, jabatan, pangkat] = await Promise.all([
    db.unitKerja.findMany({ where: { aktif: true }, select: { id: true, parentId: true, nama: true, urutan: true, kode: true } }),
    db.jabatan.findMany({ where: { aktif: true }, orderBy: [{ jenis: "asc" }, { nama: "asc" }], select: { id: true, nama: true, jenis: true, kelasJabatan: true } }),
    db.pangkatGolongan.findMany({ orderBy: { urutan: "asc" } }),
  ]);
  return {
    unit: urutkanPohon(units).map((u) => ({ id: u.id, label: `${"  ".repeat(u.kedalaman)}${u.nama}`, kode: u.kode })),
    jabatan: jabatan.map((j) => ({ id: j.id, label: j.nama, jenis: j.jenis, kelas: j.kelasJabatan })),
    pangkat: pangkat.map((p) => ({ id: p.id, label: pangkatTampil(p), untuk: p.untuk })),
  };
}
export type OpsiPegawai = Awaited<ReturnType<typeof opsiPegawai>>;
