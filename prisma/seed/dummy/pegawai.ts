/**
 * Data pegawai FIKTIF untuk development. Nama dibuat acak dari daftar nama
 * umum; NIP berformat sah dengan nomor urut 8xx/9xx; NIK berawalan 9999
 * (kode provinsi yang tidak ada); nomor HP berawalan 0800; email example.com.
 * Jumlah pegawai per jabatan mengikuti kolom B (bezetting) Peta Jabatan.
 */
import { tentukanAtasanLangsung, type UnitStruktur } from "../../../lib/domain/atasan";
import { namaLengkap } from "../../../lib/domain/pegawai";
import type { Peran, StatusKepegawaian } from "../../../lib/generated/prisma/enums";
import { hashPassword } from "../../../lib/password";
import type { Db } from "../klien";

/** Akun demo dengan NIP tetap (dipakai README & tes E2E). Password: SEED_PASSWORD_DEV. */
export const AKUN_DEMO = {
  admin: { loginId: "admin" },
  kepalaDinas: { nip: "197001151995031901", unit: "DINAS", jabatan: "Kepala Dinas Energi dan Sumber Daya Mineral" },
  kepegawaian: { nip: "198205122006042902", unit: "SUBBAG_UK", jabatan: "Kepala Sub Bagian Umum dan Kepegawaian" },
  kepalaBidang: { nip: "197608212003121903", unit: "BIDANG_KETENAGALISTRIKAN", jabatan: "Kepala Bidang Ketenagalistrikan" },
  kepalaSeksi: { nip: "198103172005011904", unit: "SEKSI_WASDAL_GTL", jabatan: "Kepala Seksi Pengawas dan Pengendalian Ketenagalistrikan" },
  staf: { nip: "199002202015031905", unit: "SEKSI_WASDAL_GTL", jabatan: "Penelaah Teknis Kebijakan" },
  pppk: { nip: "199508082024212906", unit: "SEKSI_WASDAL_GTL", jabatan: "Pengadministrasi Perkantoran" },
  /** Belum punya akun — untuk menguji aktivasi dengan NIP + NIK. */
  tanpaAkun: { nip: "199206062019031907", nik: "9999000000000907", unit: "SEKSI_PENGUSAHAAN_GTL", jabatan: "Pengolah Data dan Informasi" },
} as const;

const DEMO_PER_POSISI = new Map<string, { nip: string; nik?: string }>(
  Object.values(AKUN_DEMO)
    .filter((d): d is Extract<typeof d, { nip: string }> => "nip" in d)
    .map((d) => [`${d.unit}|${d.jabatan}`, { nip: d.nip, nik: "nik" in d ? d.nik : undefined }]),
);

// ─── PRNG deterministik agar hasil seed selalu sama ───
function mulberry32(benih: number) {
  let a = benih;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const acak = mulberry32(20261022);
const antara = (min: number, max: number) => min + Math.floor(acak() * (max - min + 1));
const pilih = <T,>(arr: readonly T[]): T => arr[Math.floor(acak() * arr.length)];
const pad = (n: number, w: number) => String(n).padStart(w, "0");

const NAMA_L = ["Ahmad", "Muhammad", "Rizky", "Fajar", "Hendra", "Agus", "Budi", "Dedi", "Eko", "Fikri", "Galih", "Hadi", "Irfan", "Joko", "Khairul", "Lukman", "Syahrul", "Taufik", "Wahyu", "Yusuf", "Zainal", "Arif", "Bayu", "Dimas", "Firman", "Haris", "Ilham", "Reza", "Akbar", "Rudi"];
const NAMA_P = ["Siti", "Nur", "Dewi", "Rina", "Fitri", "Ayu", "Maya", "Novi", "Putri", "Ratna", "Sari", "Wulan", "Yuni", "Indah", "Mega", "Nadia", "Rahmah", "Aulia", "Hana", "Laila"];
const NAMA_BELAKANG = ["Pratama", "Saputra", "Hidayat", "Rahman", "Wijaya", "Santoso", "Kurniawan", "Setiawan", "Nugroho", "Firdaus", "Hakim", "Maulana", "Ramadhan", "Anwar", "Fauzi", "Hasanah", "Rahmawati", "Susanti", "Wulandari", "Fitriani", "Handayani", "Permata", "Amalia", "Kusuma", "Hamdani"];
const TEMPAT_LAHIR = ["Banjarmasin", "Banjarbaru", "Martapura", "Kandangan", "Barabai", "Amuntai", "Tanjung", "Pelaihari", "Kotabaru", "Rantau", "Marabahan", "Batulicin"];
const GELAR_S1 = ["S.T.", "S.E.", "S.Kom.", "S.Sos.", "S.H.", "S.Si."];
const GELAR_S2 = ["M.T.", "M.M.", "M.Si."];

type Pendidikan = "SMA" | "D3" | "S1" | "S2";

function pendidikanUntuk(jabatan: string, struktural: boolean, kelas: number): Pendidikan {
  if (struktural) return kelas >= 11 ? "S2" : pilih(["S1", "S2"] as const);
  if (/Ahli|Penelaah|Penata Layanan/.test(jabatan)) return kelas >= 10 ? "S2" : "S1";
  if (/Pengolah|Pengelola|Mahir|Terampil|Operator Laboratorium/.test(jabatan)) return pilih(["D3", "S1"] as const);
  if (/Pengadministrasi/.test(jabatan)) return pilih(["SMA", "D3"] as const);
  return "SMA";
}

function gelarUntuk(p: Pendidikan): string | null {
  if (p === "SMA") return null;
  if (p === "D3") return "A.Md.";
  if (p === "S1") return pilih(GELAR_S1);
  return `${pilih(GELAR_S1)}, ${pilih(GELAR_S2)}`;
}

/** Golongan PNS menurut kelas jabatan. */
function golonganPns(kelas: number, struktural: boolean, jabatan: string): string {
  if (jabatan === "Operator Layanan Operasional") return pilih(["II/a", "II/b", "II/c", "II/d"]);
  if (struktural) {
    if (kelas >= 15) return "IV/c";
    if (kelas >= 12) return "IV/b";
    if (kelas >= 11) return pilih(["IV/a", "IV/b"]);
    return pilih(["III/d", "IV/a"]);
  }
  if (kelas >= 10) return "III/d";
  if (kelas >= 8) return pilih(["III/b", "III/c"]);
  if (kelas === 7) return pilih(["III/b", "III/c", "III/d"]);
  if (kelas === 6) return pilih(["III/a", "III/b", "III/c"]);
  return pilih(["II/c", "II/d", "III/a", "III/b"]);
}

/** Status & golongan PPPK untuk jabatan yang di daftar hadir umumnya diisi PPPK. */
function statusUntuk(jabatan: string, kelas: number, urutKe: number): { status: StatusKepegawaian; golonganPppk?: string } {
  if (jabatan === "Operator Layanan Operasional") {
    if (kelas <= 3 || urutKe >= 2) return { status: "PPPK_PARUH_WAKTU" };
    return { status: "PNS" };
  }
  if (jabatan === "Penata Layanan Operasional" || jabatan === "Pranata Komputer Ahli Pertama") return { status: "PPPK", golonganPppk: "IX" };
  if (jabatan === "Pengelola Layanan Operasional") return { status: "PPPK", golonganPppk: "VII" };
  if (jabatan === "Operator Laboratorium") return { status: "PPPK", golonganPppk: "V" };
  return { status: "PNS" };
}

let nomorUrutBerikut = 801;
let nikBerikut = 1;
const nipTerpakai = new Set<string>(Object.values(AKUN_DEMO).flatMap((d) => ("nip" in d ? [d.nip] : [])));

function buatNip(lahir: Date, status: StatusKepegawaian, jk: "L" | "P"): string {
  const tglLahir = `${lahir.getUTCFullYear()}${pad(lahir.getUTCMonth() + 1, 2)}${pad(lahir.getUTCDate(), 2)}`;
  const tmt =
    status === "PNS"
      ? `${Math.min(lahir.getUTCFullYear() + antara(23, 33), 2023)}${pad(antara(1, 12), 2)}`
      : `${pilih([2024, 2025])}21`;
  let nip: string;
  do {
    nip = `${tglLahir}${tmt}${jk === "L" ? 1 : 2}${pad(nomorUrutBerikut++, 3)}`;
  } while (nipTerpakai.has(nip));
  nipTerpakai.add(nip);
  return nip;
}

function infoDariNip(nip: string) {
  const lahir = new Date(Date.UTC(+nip.slice(0, 4), +nip.slice(4, 6) - 1, +nip.slice(6, 8)));
  const jk: "L" | "P" = nip[14] === "1" ? "L" : "P";
  const pppk = nip.slice(12, 14) === "21";
  const tmt = new Date(Date.UTC(+nip.slice(8, 12), pppk ? 0 : +nip.slice(12, 14) - 1, 1));
  return { lahir, jk, tmt };
}

function namaAcak(jk: "L" | "P"): string {
  const depan = jk === "L" ? pilih(NAMA_L) : pilih(NAMA_P);
  return acak() < 0.25 ? depan : `${depan} ${pilih(NAMA_BELAKANG)}`;
}

interface Posisi {
  unitId: string;
  unitKode: string;
  jabatanId: string;
  jabatanNama: string;
  struktural: boolean;
  kelas: number;
  urutKe: number;
}

export async function seedPegawaiDummy(db: Db) {
  if ((await db.pegawai.count()) > 0) {
    console.log("  • pegawai sudah ada — seed dummy pegawai dilewati (pakai `npm run db:reset` untuk mengulang)");
    return null;
  }

  const units = await db.unitKerja.findMany({ orderBy: { urutan: "asc" } });
  const formasi = await db.formasiJabatan.findMany({ include: { jabatan: true } });
  const pangkat = await db.pangkatGolongan.findMany();
  const pangkatPns = new Map(pangkat.filter((p) => p.untuk === "PNS").map((p) => [p.golongan, p]));
  const pangkatPppk = new Map(pangkat.filter((p) => p.untuk === "PPPK").map((p) => [p.golongan, p]));

  const petaUnit = new Map(units.map((u) => [u.id, u]));
  const struktur = new Map<string, UnitStruktur>(units.map((u) => [u.id, { id: u.id, parentId: u.parentId }]));

  // Urutkan unit menurut pohon (DFS) supaya urutan pembuatan rapi.
  const urutanUnit: string[] = [];
  (function dfs(parentId: string | null) {
    for (const u of units.filter((x) => x.parentId === parentId).sort((a, b) => a.urutan - b.urutan)) {
      urutanUnit.push(u.id);
      dfs(u.id);
    }
  })(null);

  const posisi: Posisi[] = [];
  for (const unitId of urutanUnit) {
    const unit = petaUnit.get(unitId)!;
    const fs = formasi
      .filter((f) => f.unitKerjaId === unitId)
      .sort((a, b) => Number(b.jabatan.jenis === "STRUKTURAL") - Number(a.jabatan.jenis === "STRUKTURAL") || b.kelas - a.kelas);
    for (const f of fs) {
      const struktural = f.jabatan.jenis === "STRUKTURAL";
      // Semua jabatan pimpinan diisi agar alur persetujuan bisa dicoba penuh.
      const jumlah = struktural ? 1 : (f.bezetting ?? 0);
      for (let i = 0; i < jumlah; i++) {
        posisi.push({
          unitId,
          unitKode: unit.kode,
          jabatanId: f.jabatanId,
          jabatanNama: f.jabatan.nama,
          struktural,
          kelas: f.kelas,
          urutKe: i,
        });
      }
    }
  }

  const kepalaUnit = new Map<string, string>();
  const dibuat: { id: string; unitId: string; struktural: boolean; nip: string | null }[] = [];

  for (const p of posisi) {
    const demo = p.urutKe === 0 ? DEMO_PER_POSISI.get(`${p.unitKode}|${p.jabatanNama}`) : undefined;
    let { status, golonganPppk } = statusUntuk(p.jabatanNama, p.kelas, p.urutKe);
    let nip: string;
    let jk: "L" | "P";
    let lahir: Date;
    let tmt: Date;

    if (demo) {
      nip = demo.nip;
      ({ lahir, jk, tmt } = infoDariNip(nip));
      if (nip.slice(12, 14) === "21") {
        status = "PPPK";
        golonganPppk ??= "V";
      } else {
        status = "PNS";
        golonganPppk = undefined;
      }
    } else {
      jk = acak() < 0.55 ? "L" : "P";
      const tahunLahir = p.struktural ? antara(1968, 1983) : antara(1970, 1999);
      lahir = new Date(Date.UTC(tahunLahir, antara(0, 11), antara(1, 28)));
      nip = buatNip(lahir, status, jk);
      ({ tmt } = infoDariNip(nip));
    }

    const pendidikan = pendidikanUntuk(p.jabatanNama, p.struktural, p.kelas);
    const pg =
      status === "PNS"
        ? pangkatPns.get(golonganPns(p.kelas, p.struktural, p.jabatanNama))
        : golonganPppk
          ? pangkatPppk.get(golonganPppk)
          : undefined;

    const nama = namaAcak(jk);
    const gelarDepan = acak() < 0.12 && lahir.getUTCFullYear() < 1985 ? (jk === "L" ? "H." : "Hj.") : null;
    const nik = demo?.nik ?? `9999${pad(nikBerikut++, 12)}`;
    const slug = nama.toLowerCase().replace(/[^a-z]+/g, ".");

    const pegawai = await db.pegawai.create({
      data: {
        nip,
        statusKepegawaian: status,
        gelarDepan,
        nama,
        gelarBelakang: gelarUntuk(pendidikan),
        nik,
        tempatLahir: pilih(TEMPAT_LAHIR),
        tanggalLahir: lahir,
        jenisKelamin: jk,
        pendidikanTerakhir: pendidikan,
        alamatDomisili: `Jl. Contoh Fiktif No. ${antara(1, 120)}, Banjarbaru`,
        noHp: `0800${pad(antara(0, 99999999), 8)}`,
        email: `${slug}.${nip.slice(-3)}@example.com`,
        pangkatGolonganId: pg?.id,
        tmtPangkat: pg ? new Date(Date.UTC(antara(2018, 2025), pilih([3, 9]), 1)) : null,
        jabatanId: p.jabatanId,
        tmtJabatan: new Date(Date.UTC(antara(2019, 2025), antara(0, 11), 1)),
        unitKerjaId: p.unitId,
        tanggalMasuk: tmt,
      },
    });
    if (p.struktural) kepalaUnit.set(p.unitId, pegawai.id);
    dibuat.push({ id: pegawai.id, unitId: p.unitId, struktural: p.struktural, nip });
  }

  // PJLP (Non-ASN tanpa NIP) — daftar hadirnya dicetak terpisah.
  const satpam = await db.jabatan.findUniqueOrThrow({ where: { nama: "Tenaga Keamanan Kantor" } });
  const subbagUmum = units.find((u) => u.kode === "SUBBAG_UK")!;
  for (let i = 1; i <= 4; i++) {
    const jk: "L" | "P" = i === 4 ? "P" : "L";
    const pj = await db.pegawai.create({
      data: {
        idNonAsn: `PJLP-${pad(i, 3)}`,
        statusKepegawaian: "NON_ASN",
        nama: namaAcak(jk),
        nik: `9999${pad(nikBerikut++, 12)}`,
        jenisKelamin: jk,
        pendidikanTerakhir: "SMA",
        jabatanId: satpam.id,
        unitKerjaId: subbagUmum.id,
        tanggalMasuk: new Date(Date.UTC(2025, 0, 2)),
      },
    });
    dibuat.push({ id: pj.id, unitId: subbagUmum.id, struktural: false, nip: null });
  }

  for (const d of dibuat) {
    await db.pegawai.update({
      where: { id: d.id },
      data: { atasanLangsungId: tentukanAtasanLangsung(d.id, d.unitId, struktur, kepalaUnit) },
    });
  }

  // Akun: admin + semua ASN kecuali AKUN_DEMO.tanpaAkun dan tiap pegawai ke-7 (untuk uji aktivasi).
  const password = process.env.SEED_PASSWORD_DEV;
  if (!password) throw new Error("SEED_PASSWORD_DEV belum diisi di .env");
  const hash = await hashPassword(password);

  await db.user.create({ data: { loginId: "admin", passwordHash: hash, peran: { create: [{ peran: "ADMIN" }] } } });

  let akun = 1;
  for (const [i, d] of dibuat.entries()) {
    if (!d.nip || d.nip === AKUN_DEMO.tanpaAkun.nip) continue;
    const demo = Object.values(AKUN_DEMO).some((x) => "nip" in x && x.nip === d.nip);
    if (!demo && !d.struktural && i % 7 === 3) continue;
    const peran: Peran[] = d.nip === AKUN_DEMO.kepegawaian.nip ? ["KEPEGAWAIAN"] : [];
    await db.user.create({
      data: { loginId: d.nip, pegawaiId: d.id, passwordHash: hash, peran: { create: peran.map((p) => ({ peran: p })) } },
    });
    akun++;
  }

  // Saldo cuti tahunan 2026 (ASN).
  for (const d of await db.pegawai.findMany({ where: { statusKepegawaian: { not: "NON_ASN" } } })) {
    const pnsLama = d.statusKepegawaian === "PNS";
    const sisaN1 = pnsLama ? antara(0, 6) : 0;
    const sisaN2 = pnsLama && acak() < 0.2 ? antara(1, 6) : 0;
    const saldo = await db.saldoCuti.create({
      data: { pegawaiId: d.id, tahun: 2026, hakTahunIni: 12, sisaN1, sisaN2 },
    });
    await db.mutasiSaldoCuti.create({
      data: { saldoId: saldo.id, jenis: "SALDO_AWAL", jumlah: 12 + sisaN1 + sisaN2, catatan: "Saldo awal 2026 (data dummy)" },
    });
  }

  // Pejabat penandatangan default: Kepala Dinas (fiktif).
  const kadis = await db.pegawai.findUniqueOrThrow({
    where: { nip: AKUN_DEMO.kepalaDinas.nip },
    include: { pangkatGolongan: true },
  });
  await db.pejabatPenandatangan.create({
    data: {
      jabatanTeks: "Kepala Dinas Energi dan Sumber Daya Mineral Provinsi Kalimantan Selatan",
      pegawaiId: kadis.id,
      nama: namaLengkap(kadis),
      pangkat: kadis.pangkatGolongan?.namaPangkat ?? null,
      nip: kadis.nip,
      berlakuMulai: new Date(Date.UTC(2026, 0, 1)),
    },
  });

  return { pegawai: dibuat.length, akun };
}
