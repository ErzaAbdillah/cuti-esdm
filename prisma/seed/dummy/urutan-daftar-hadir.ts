import { bandingkanBarisDaftarHadir, type BarisUrut, unitDaftarHadir } from "../../../lib/domain/daftar-hadir";
import type { Db } from "../klien";

/**
 * Mengisi pegawai.urutan_daftar_hadir untuk data dummy. Idempoten (hanya
 * update), sehingga aman dijalankan ulang tanpa reset database.
 * Kepala Dinas tidak masuk daftar hadir; pegawai tingkat Dinas lainnya
 * ikut daftar Sekretariat; PJLP punya daftar sendiri.
 */
export async function aturUrutanDaftarHadir(db: Db) {
  const units = await db.unitKerja.findMany();
  const pohon = new Map(units.map((u) => [u.id, u]));
  const sekretariat = units.find((u) => u.kode === "SEKRETARIAT")!;

  const pegawai = await db.pegawai.findMany({
    where: { aktif: true },
    include: { jabatan: true, pangkatGolongan: true },
  });

  const grup = new Map<string, (BarisUrut & { id: string })[]>();
  for (const p of pegawai) {
    const kepalaDinas = p.jabatan?.memimpinUnitId != null && !pohon.get(p.jabatan.memimpinUnitId)?.parentId;
    if (kepalaDinas) {
      await db.pegawai.update({ where: { id: p.id }, data: { urutanDaftarHadir: null } });
      continue;
    }
    const kunci = p.statusKepegawaian === "NON_ASN" ? "PJLP" : (unitDaftarHadir(p.unitKerjaId, pohon) ?? sekretariat.id);
    grup.set(kunci, [
      ...(grup.get(kunci) ?? []),
      {
        id: p.id,
        pimpinan: p.jabatan?.memimpinUnitId != null,
        status: p.statusKepegawaian,
        urutanGolongan: p.pangkatGolongan?.urutan ?? 0,
        kelas: p.jabatan?.kelasJabatan ?? 0,
        nama: p.nama,
      },
    ]);
  }

  let n = 0;
  for (const anggota of grup.values()) {
    anggota.sort(bandingkanBarisDaftarHadir);
    for (const [i, a] of anggota.entries()) {
      await db.pegawai.update({ where: { id: a.id }, data: { urutanDaftarHadir: i + 1 } });
      n++;
    }
  }
  return n;
}
