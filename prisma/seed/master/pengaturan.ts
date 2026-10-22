import { DEF_PENGATURAN } from "../../../lib/pengaturan";
import type { PeranAkses } from "../../../lib/generated/prisma/enums";
import type { Db } from "../klien";

/** Hanya membuat kunci yang belum ada; nilai yang sudah diubah Admin dibiarkan. */
export async function seedPengaturan(db: Db) {
  for (const d of DEF_PENGATURAN) {
    await db.pengaturan.upsert({
      where: { kunci: d.kunci },
      update: { deskripsi: d.deskripsi || d.label },
      create: { kunci: d.kunci, nilai: d.nilaiAwal as never, deskripsi: d.deskripsi || d.label },
    });
  }
  return DEF_PENGATURAN.length;
}

const FOLDER: { nama: string; akses: [PeranAkses, boolean, boolean][] }[] = [
  { nama: "Surat Keputusan (SK)", akses: [["PEGAWAI", true, false], ["KEPEGAWAIAN", true, true], ["ADMIN", true, true]] },
  { nama: "Peta Jabatan", akses: [["PEGAWAI", true, false], ["KEPEGAWAIAN", true, true], ["ADMIN", true, true]] },
  { nama: "Notulen", akses: [["PEGAWAI", true, false], ["KEPEGAWAIAN", true, true], ["ADMIN", true, true]] },
  { nama: "Template Surat", akses: [["KEPEGAWAIAN", true, true], ["ADMIN", true, true]] },
];

export async function seedFolderDokumen(db: Db) {
  for (const [i, f] of FOLDER.entries()) {
    const ada = await db.folderDokumen.findFirst({ where: { nama: f.nama, parentId: null } });
    if (ada) continue;
    await db.folderDokumen.create({
      data: {
        nama: f.nama,
        urutan: i + 1,
        akses: { create: f.akses.map(([peran, bolehLihat, bolehKelola]) => ({ peran, bolehLihat, bolehKelola })) },
      },
    });
  }
  return FOLDER.length;
}
