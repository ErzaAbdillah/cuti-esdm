import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buatKlien } from "../prisma/seed/klien";

interface BarisCsv {
  no: number;
  nama: string;
  nip: string;
  bidang: string;
  hak2026: number;
  terpakai2026: number;
  sisa2026: number;
  totalSisaBerlaku: number;
  cutiDisetujui: number;
}

function parseCsv(isi: string): BarisCsv[] {
  const lines = isi.trim().split(/\r?\n/);
  const hasil: BarisCsv[] = [];
  for (let i = 1; i < lines.length; i++) {
    const baris = lines[i];
    if (!baris) continue;
    const tokens: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let c = 0; c < baris.length; c++) {
      const char = baris[c];
      if (char === '"') {
        inQuote = !inQuote;
      } else if (char === "," && !inQuote) {
        tokens.push(cur.trim());
        cur = "";
      } else {
        cur += char;
      }
    }
    tokens.push(cur.trim());

    if (tokens.length >= 8) {
      hasil.push({
        no: Number(tokens[0]),
        nama: tokens[1].replace(/^"|"$/g, ""),
        nip: tokens[2].replace(/^"|"$/g, "").trim(),
        bidang: tokens[3].replace(/^"|"$/g, ""),
        hak2026: Number(tokens[4]) || 12,
        terpakai2026: Number(tokens[5]) || 0,
        sisa2026: Number(tokens[6]) || 0,
        totalSisaBerlaku: Number(tokens[7]) || 0,
        cutiDisetujui: Number(tokens[8]) || 0,
      });
    }
  }
  return hasil;
}

async function main() {
  const db = buatKlien();
  try {
    const fileCsv = resolve(process.cwd(), "data-impor/saldo-cuti-2026.csv");
    console.log("Membaca file data:", fileCsv);
    const konten = readFileSync(fileCsv, "utf-8");
    const data = parseCsv(konten);
    console.log(`Ditemukan ${data.length} baris data pegawai.`);

    const semuaPegawai = await db.pegawai.findMany({
      select: { id: true, nama: true, nip: true, idNonAsn: true },
    });

    const nipMap = new Map<string, string>();
    for (const p of semuaPegawai) {
      if (p.nip) nipMap.set(p.nip.replace(/\s+/g, ""), p.id);
    }

    let berhasil = 0;
    const gagal: string[] = [];

    for (const row of data) {
      let pegawaiId: string | undefined;
      const nipBersih = row.nip.replace(/\s+/g, "");

      if (nipBersih) {
        pegawaiId = nipMap.get(nipBersih);
      }

      // Jika belum ketemu atau NIP kosong, cari berdasarkan nama
      if (!pegawaiId) {
        const namaBersih = row.nama.toLowerCase().replace(/[,.]/g, "").trim();
        const matched = semuaPegawai.find((p) => {
          const pNama = p.nama.toLowerCase().replace(/[,.]/g, "").trim();
          return pNama.length > 0 && (pNama.includes(namaBersih) || namaBersih.includes(pNama));
        });
        if (matched) pegawaiId = matched.id;
      }

      if (!pegawaiId) {
        gagal.push(`Baris ${row.no}: ${row.nama} (NIP: ${row.nip || "KOSONG"}) tidak ditemukan di database.`);
        continue;
      }

      // Rumus Sisa N-1 & N-2
      const sisaLalu = Math.max(0, row.totalSisaBerlaku - row.sisa2026);
      let sisaN1 = 0;
      let sisaN2 = 0;
      if (sisaLalu <= 6) {
        sisaN1 = sisaLalu;
        sisaN2 = 0;
      } else {
        sisaN1 = 6;
        sisaN2 = Math.min(6, sisaLalu - 6);
      }

      const hakTahunIni = row.hak2026 || 12;
      const terpakai = row.terpakai2026 || 0;

      const saldo = await db.saldoCuti.upsert({
        where: {
          pegawaiId_tahun: {
            pegawaiId,
            tahun: 2026,
          },
        },
        update: {
          hakTahunIni,
          sisaN1,
          sisaN2,
          terpakai,
          penyesuaian: 0,
        },
        create: {
          pegawaiId,
          tahun: 2026,
          hakTahunIni,
          sisaN1,
          sisaN2,
          terpakai,
          penyesuaian: 0,
        },
      });

      // Mutasi saldo awal
      await db.mutasiSaldoCuti.deleteMany({
        where: { saldoId: saldo.id, jenis: "SALDO_AWAL" },
      });
      await db.mutasiSaldoCuti.create({
        data: {
          saldoId: saldo.id,
          jenis: "SALDO_AWAL",
          jumlah: hakTahunIni + sisaN1 + sisaN2 - terpakai,
          catatan: `Saldo awal 2026 (terpakai ${terpakai})`,
        },
      });

      berhasil++;
    }

    console.log(`\n=== HASIL INJEKSI SALDO 2026 ===`);
    console.log(`Berhasil: ${berhasil} pegawai.`);
    if (gagal.length > 0) {
      console.log(`Gagal/Perlu dicek (${gagal.length}):`);
      gagal.forEach((g) => console.log(` - ${g}`));
    }
  } finally {
    await db.$disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
