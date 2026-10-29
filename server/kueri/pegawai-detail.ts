import "server-only";
import { tentukanLevelSurat } from "@/lib/domain/level-surat";
import { formatNip } from "@/lib/domain/nip";
import { namaLengkap, pangkatTampil } from "@/lib/domain/pegawai";
import { samarkanAlamat, samarkanHp, samarkanNik } from "@/lib/samaran";
import { hariIniWita } from "@/lib/tanggal";
import { type PenggunaSaatIni, punyaPeran } from "../auth/pengguna";
import { db } from "../db";

export function bolehLihatPegawai(u: PenggunaSaatIni, pegawaiId: string): boolean {
  return punyaPeran(u, "KEPEGAWAIAN", "ADMIN") || u.pegawai?.id === pegawaiId;
}

export async function detailPegawai(id: string) {
  const hariIni = hariIniWita();
  const tahun = hariIni.getUTCFullYear();

  const p = await db.pegawai.findUnique({
    where: { id },
    include: {
      jabatan: true,
      unitKerja: true,
      pangkatGolongan: true,
      atasanLangsung: { include: { jabatan: true } },
      user: { include: { peran: true } },
      saldoCuti: { where: { tahun } },
      pengajuanCuti: { include: { jenisCuti: true }, orderBy: { dibuatPada: "desc" }, take: 20 },
      kodeAktivasi: { where: { dipakaiPada: null, kedaluwarsaPada: { gt: new Date() } }, orderBy: { dibuatPada: "desc" }, take: 1 },
    },
  });
  if (!p) return null;

  const [mapping, jumlahDokumen] = await Promise.all([
    db.mappingEselon.findMany({ where: { jenisJabatan: "STRUKTURAL" } }),
    db.dokumen.count({ where: { pemilikPegawaiId: id, ruang: "PRIBADI", dihapusPada: null } }),
  ]);

  return {
    id: p.id,
    namaLengkap: namaLengkap(p),
    gelarDepan: p.gelarDepan,
    nama: p.nama,
    gelarBelakang: p.gelarBelakang,
    nip: p.nip ? formatNip(p.nip) : null,
    idNonAsn: p.idNonAsn,
    statusKepegawaian: p.statusKepegawaian,
    tempatLahir: p.tempatLahir,
    tanggalLahir: p.tanggalLahir,
    jenisKelamin: p.jenisKelamin,
    pendidikanTerakhir: p.pendidikanTerakhir,
    email: p.email,
    // Data sensitif hanya dikirim dalam bentuk samaran; nilai asli lewat aksi teraudit.
    samaran: { nik: samarkanNik(p.nik), alamatDomisili: samarkanAlamat(p.alamatDomisili), noHp: samarkanHp(p.noHp) },
    pangkat: pangkatTampil(p.pangkatGolongan),
    tmtPangkat: p.tmtPangkat,
    jabatan: p.jabatan?.nama ?? null,
    jenisJabatan: p.jabatan?.jenis ?? null,
    kelas: p.jabatan?.kelasJabatan ?? null,
    tmtJabatan: p.tmtJabatan,
    level: tentukanLevelSurat(
      { jenisJabatan: p.jabatan?.jenis ?? null, kelas: p.jabatan?.kelasJabatan ?? null, override: p.levelSuratOverride },
      mapping,
    ),
    levelOverride: p.levelSuratOverride,
    unit: p.unitKerja.nama,
    atasan: p.atasanLangsung ? { id: p.atasanLangsung.id, nama: namaLengkap(p.atasanLangsung), jabatan: p.atasanLangsung.jabatan?.nama ?? null } : null,
    tanggalMasuk: p.tanggalMasuk,
    aktif: p.aktif,
    tahun,
    saldo: p.saldoCuti[0] ?? null,
    pengajuan: p.pengajuanCuti,
    jumlahDokumen,
    akun: p.user
      ? {
          id: p.user.id,
          loginId: p.user.loginId,
          aktif: p.user.aktif,
          terkunciSampai: p.user.terkunciSampai && p.user.terkunciSampai > new Date() ? p.user.terkunciSampai : null,
          terakhirLogin: p.user.terakhirLogin,
          wajibGantiPassword: p.user.wajibGantiPassword,
          googleEmail: p.user.googleEmail,
          peran: p.user.peran.map((r) => r.peran),
        }
      : null,
    kodeAktivasiAktifSampai: p.kodeAktivasi[0]?.kedaluwarsaPada ?? null,
  };
}
export type DetailPegawai = NonNullable<Awaited<ReturnType<typeof detailPegawai>>>;
