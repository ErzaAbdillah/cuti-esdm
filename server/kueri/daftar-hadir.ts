import "server-only";
import { bandingkanBarisDaftarHadir, unitDaftarHadir } from "@/lib/domain/daftar-hadir";
import { adalahHariKerja, kunciTanggal } from "@/lib/domain/hari-kerja";
import { formatNip } from "@/lib/domain/nip";
import { namaLengkap, pangkatTampil } from "@/lib/domain/pegawai";
import { lewatBatasAlpa, statusHarian, wajibAbsenPada } from "@/lib/domain/status-absen";
import type { StatusAbsen, SumberAbsen } from "@/lib/generated/prisma/enums";
import { type PenggunaSaatIni, punyaPeran } from "../auth/pengguna";
import { db } from "../db";
import { STATUS_CUTI_BERLAKU } from "../layanan/absen";
import { aturanAbsen, setLibur, teksPengaturan } from "../pengaturan";

export const GRUP_PJLP = "PJLP";

export interface GrupDaftarHadir {
  id: string;
  judul: string;
}

/** Daftar hadir per unit tingkat-1 (Sekretariat, Bidang, UPTD) + lembar PJLP (Non-ASN). */
export async function semuaGrup(): Promise<GrupDaftarHadir[]> {
  const units = await db.unitKerja.findMany({ where: { aktif: true, judulDaftarHadir: { not: null } }, orderBy: { urutan: "asc" } });
  return [...units.map((u) => ({ id: u.id, judul: u.judulDaftarHadir! })), { id: GRUP_PJLP, judul: "PENYEDIA JASA LAINNYA PERORANGAN (PJLP)" }];
}

/** Kepegawaian & Kepala Dinas: semua grup. Atasan lain: grup unitnya sendiri. */
export async function grupUntuk(u: PenggunaSaatIni): Promise<GrupDaftarHadir[]> {
  const semua = await semuaGrup();
  if (punyaPeran(u, "KEPEGAWAIAN")) return semua;
  if (!punyaPeran(u, "ATASAN") || !u.pegawai) return [];
  const units = await db.unitKerja.findMany({ select: { id: true, parentId: true } });
  const grupSaya = unitDaftarHadir(u.pegawai.unitId, new Map(units.map((x) => [x.id, x])));
  if (grupSaya === null) return semua; // pimpinan tingkat Dinas
  const sekretariat = semua.find((g) => g.judul === "SEKRETARIAT");
  return semua.filter((g) => g.id === grupSaya || (g.id === GRUP_PJLP && grupSaya === sekretariat?.id));
}

export interface BarisDaftarHadir {
  pegawaiId: string;
  nama: string;
  nip: string | null;
  jabatan: string;
  pangkat: string;
  status: StatusAbsen | null;
  sumber: SumberAbsen | null;
  jamMasuk: Date | null;
  keterangan: string | null;
  /** Punya akun aktif = absen online; tanpa akun = tanda tangan di kertas. */
  online: boolean;
  atasanId: string | null;
}

/**
 * Id pegawai aktif yang masuk satu lembar daftar hadir. Kepala Dinas tidak ikut;
 * pegawai tingkat Dinas lainnya ikut Sekretariat; PJLP = semua Non-ASN.
 */
export async function anggotaGrup(grupId: string): Promise<string[]> {
  const units = await db.unitKerja.findMany({ select: { id: true, parentId: true, kode: true } });
  const pohon = new Map(units.map((x) => [x.id, x]));
  const dinas = units.find((x) => !x.parentId);
  const sekretariat = units.find((x) => x.kode === "SEKRETARIAT");
  const pjlp = grupId === GRUP_PJLP;
  const pegawai = await db.pegawai.findMany({
    where: { aktif: true, ...(pjlp ? { statusKepegawaian: "NON_ASN" } : { statusKepegawaian: { not: "NON_ASN" } }) },
    select: { id: true, unitKerjaId: true, jabatan: { select: { memimpinUnitId: true } } },
  });
  return pegawai
    .filter((p) => {
      if (pjlp) return true;
      if (dinas && p.jabatan?.memimpinUnitId === dinas.id) return false;
      return (unitDaftarHadir(p.unitKerjaId, pohon) ?? sekretariat?.id) === grupId;
    })
    .map((p) => p.id);
}

export async function dataDaftarHadir(grupId: string, tanggal: Date) {
  const [units, aturan, libur] = await Promise.all([db.unitKerja.findMany(), aturanAbsen(), setLibur(tanggal, tanggal)]);
  const pohon = new Map(units.map((x) => [x.id, x]));
  const sekretariat = units.find((x) => x.kode === "SEKRETARIAT");
  const pjlp = grupId === GRUP_PJLP;
  const unitGrup = pjlp ? sekretariat : pohon.get(grupId);
  if (!unitGrup) return null;

  const anggota = await db.pegawai.findMany({
    where: { id: { in: await anggotaGrup(grupId) } },
    include: {
      jabatan: true,
      pangkatGolongan: true,
      user: { select: { aktif: true, dibuatPada: true } },
      absensi: { where: { tanggal } },
      pengajuanCuti: { where: { status: { in: STATUS_CUTI_BERLAKU }, tanggalMulai: { lte: tanggal }, tanggalSelesai: { gte: tanggal } }, take: 1 },
      keteranganKehadiran: { where: { tanggalMulai: { lte: tanggal }, tanggalSelesai: { gte: tanggal } }, take: 1 },
    },
  });

  const lewat = lewatBatasAlpa(tanggal, new Date(), aturan);
  const baris: (BarisDaftarHadir & { urut: number | null; cmp: Parameters<typeof bandingkanBarisDaftarHadir>[0] })[] = anggota.map((p) => {
    const a = p.absensi[0];
    const k = p.keteranganKehadiran[0];
    const online = !!p.user?.aktif;
    return {
      pegawaiId: p.id,
      nama: namaLengkap(p),
      nip: p.nip ? formatNip(p.nip) : null,
      jabatan: p.jabatan?.namaSingkat ?? p.jabatan?.nama ?? "-",
      pangkat: pjlp ? "" : pangkatTampil(p.pangkatGolongan),
      status:
        a?.status ??
        statusHarian({
          cuti: p.pengajuanCuti.length > 0,
          keterangan: k?.jenis ?? null,
          mandiri: null,
          lewatBatas: lewat,
          wajibAbsenOnline: online && wajibAbsenPada(tanggal, p.user?.dibuatPada, aturan.batasAlpa),
        }),
      sumber: a?.sumber ?? null,
      jamMasuk: a?.jamMasuk ?? null,
      keterangan: a?.keterangan ?? k?.keterangan ?? null,
      online,
      atasanId: p.atasanLangsungId,
      urut: p.urutanDaftarHadir,
      cmp: {
        pimpinan: p.jabatan?.memimpinUnitId != null,
        status: p.statusKepegawaian,
        urutanGolongan: p.pangkatGolongan?.urutan ?? 0,
        kelas: p.jabatan?.kelasJabatan ?? 0,
        nama: p.nama,
      },
    };
  });
  // Urutan manual (kolom urutan_daftar_hadir) didahulukan, sisanya mengikuti aturan form fisik.
  baris.sort((a, b) => (a.urut ?? 9999) - (b.urut ?? 9999) || bandingkanBarisDaftarHadir(a.cmp, b.cmp));

  const kepala = await db.pegawai.findFirst({
    where: { aktif: true, jabatan: { memimpinUnitId: unitGrup.id } },
    include: { jabatan: true, pangkatGolongan: true },
  });

  return {
    judulUnit: pjlp ? "PENYEDIA JASA LAINNYA PERORANGAN (PJLP)" : unitGrup.judulDaftarHadir ?? unitGrup.nama.toUpperCase(),
    judulInstansi: await teksPengaturan("instansi.judul_daftar_hadir"),
    ukuranKertas: (await teksPengaturan("daftar_hadir.ukuran_kertas")) || "legal",
    hariKerja: adalahHariKerja(tanggal, libur, aturan.hariKerja),
    libur: libur.has(kunciTanggal(tanggal)),
    baris: baris.map(({ urut, cmp, ...b }) => b),
    penandatangan: kepala
      ? {
          jabatan: kepala.jabatan?.namaSingkat ?? kepala.jabatan?.nama ?? "",
          nama: namaLengkap(kepala),
          pangkat: kepala.pangkatGolongan ? pangkatTampil(kepala.pangkatGolongan) : "",
          nip: kepala.nip ? formatNip(kepala.nip) : "",
        }
      : null,
  };
}
export type DataDaftarHadir = NonNullable<Awaited<ReturnType<typeof dataDaftarHadir>>>;
