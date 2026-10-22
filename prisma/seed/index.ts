/**
 * Seeder.
 *   npm run db:seed          → master + data dummy (hanya APP_ENV ≠ production)
 *   npm run db:seed:master   → master saja (aman untuk production)
 */
import { seedPegawaiDummy } from "./dummy/pegawai";
import { aturUrutanDaftarHadir } from "./dummy/urutan-daftar-hadir";
import { buatKlien } from "./klien";
import { seedOrganisasi } from "./master/organisasi";
import { seedFolderDokumen, seedPengaturan } from "./master/pengaturan";
import { seedAlurPersetujuan, seedHariLibur, seedJenisCuti, seedMappingEselon, seedPangkat } from "./master/referensi";
import { seedTemplateSurat } from "./master/template-surat";

async function main() {
  const masterSaja = process.argv.includes("--master");
  const produksi = process.env.APP_ENV === "production";
  const db = buatKlien();

  try {
    console.log("Seed master:");
    const org = await seedOrganisasi(db);
    console.log(`  • unit kerja ${org.unit}, formasi ${org.formasi}`);
    console.log(`  • pangkat/golongan ${await seedPangkat(db)}`);
    console.log(`  • mapping eselon ${await seedMappingEselon(db)} (baru)`);
    console.log(`  • jenis cuti ${await seedJenisCuti(db)}`);
    console.log(`  • alur persetujuan ${await seedAlurPersetujuan(db)}`);
    console.log(`  • hari libur 2026 ${await seedHariLibur(db)}`);
    console.log(`  • pengaturan ${await seedPengaturan(db)}`);
    console.log(`  • folder dokumen ${await seedFolderDokumen(db)}`);
    console.log(`  • template surat ${await seedTemplateSurat(db)}`);

    if (masterSaja) return;
    if (produksi) {
      console.log("APP_ENV=production → data dummy TIDAK dibuat. Data asli masuk lewat impor Excel.");
      return;
    }

    console.log("Seed dummy (fiktif):");
    const hasil = await seedPegawaiDummy(db);
    if (hasil) console.log(`  • pegawai ${hasil.pegawai}, akun ${hasil.akun}`);
    console.log(`  • urutan daftar hadir ${await aturUrutanDaftarHadir(db)}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
