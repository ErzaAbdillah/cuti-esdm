# Absensi & Cuti ESDM Kalsel

Aplikasi web internal Dinas Energi dan Sumber Daya Mineral Provinsi Kalimantan Selatan untuk daftar hadir masuk kerja, pengajuan cuti, surat cuti per eselon, dan ruang dokumen pegawai.

Rancangan lengkap (struktur, skema, halaman, alur): [docs/RANCANGAN.md](docs/RANCANGAN.md).

> Status: **tahap 3 selesai** — login NIP & aktivasi akun, RBAC, dashboard, serta database pegawai (cari, filter, detail, tambah/ubah, impor/ekspor Excel, cetak). Modul absen, cuti, surat, dan dokumen menyusul di tahap 4–7.

## Prasyarat

- Node.js 24
- Docker Desktop (untuk PostgreSQL dan Gotenberg)

## Menjalankan di komputer lokal

```bash
cp .env.example .env          # lalu isi BERKAS_KUNCI (perintahnya ada di .env.example)
npm install                   # juga menjalankan prisma generate
npm run db:up                 # PostgreSQL 17 di Docker
npm run db:migrate            # menerapkan migrasi
npm run db:seed               # data master + data dummy fiktif
npm run dev                   # http://localhost:3000 → login dengan akun demo
```

## Data seed

`npm run db:seed` membuat:

- **Master** (aman untuk production, `npm run db:seed:master`): 25 unit kerja dan 115 formasi dari Peta Jabatan (Kepgub 100.3.3.1/01105/KUM/2025 hlm. 345–347), pangkat/golongan PNS & PPPK, mapping eselon, 6 jenis cuti PP 11/2017 beserta aturan per status kepegawaian, alur persetujuan, hari libur & cuti bersama 2026 (SKB 3 Menteri), pengaturan, folder dokumen, dan 5 template surat.
- **Dummy** (ditolak bila `APP_ENV=production`): 102 ASN + 4 PJLP **fiktif**. Nama acak, NIP berformat sah dengan nomor urut 8xx/9xx, NIK berawalan `9999`, HP berawalan `0800`, email `example.com`.

Akun demo memakai password `SEED_PASSWORD_DEV` dari `.env`. Daftar NIP-nya ada di `AKUN_DEMO` pada [prisma/seed/dummy/pegawai.ts](prisma/seed/dummy/pegawai.ts) (admin, Kepala Dinas, Kepegawaian, Kepala Bidang, Kepala Seksi, staf PNS, staf PPPK, dan satu pegawai tanpa akun untuk menguji aktivasi).

`npm run db:reset` **menghapus seluruh isi database dev** lalu membuat ulang dari migrasi dan seed. Jangan dijalankan terhadap database production.

## Perintah lain

| Perintah | Fungsi |
|---|---|
| `npm test` | Unit test (Vitest) |
| `npm run typecheck` | Pemeriksaan TypeScript |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate ulang Prisma Client setelah skema berubah |

## Mengimpor data pegawai (Excel)

1. Masuk sebagai Kepegawaian atau Admin → **Data Pegawai → Impor Excel**.
2. Klik **Unduh template**. Sheet `Pegawai` berisi judul kolom; sheet `Referensi` berisi daftar kode/nama unit kerja, jabatan (beserta nama singkat dan kelas), serta golongan PNS dan PPPK; sheet `Petunjuk` menjelaskan tiap kolom.
3. Isi satu baris per pegawai. Kolom **NIP, NIK, dan Nomor HP harus berformat Teks** — bila tersimpan sebagai angka, Excel membulatkan digit terakhir (sistem akan menolaknya).
   - Status kepegawaian boleh dikosongkan: dibaca dari NIP (kode `21` → PPPK). Non-ASN diisi `ID Non-ASN`, bukan NIP.
   - Golongan: `III/d` untuk PNS, `IX` atau `Golongan IX` untuk PPPK, `-` bila tidak ada.
   - Jabatan dan unit kerja ditulis sesuai sheet Referensi (nama singkat seperti `Kasie …` juga diterima).
   - NIP atasan boleh kosong: atasan langsung diisi otomatis dari struktur organisasi.
4. Unggah lalu **Periksa berkas**. Setiap baris divalidasi (format NIP PNS/PPPK, kecocokan tanggal lahir & jenis kelamin dengan NIP, referensi master, duplikat). Baris bermasalah ditampilkan dengan alasannya.
5. **Simpan baris valid**. Pegawai dengan NIP/ID yang sudah ada diperbarui; kolom yang tidak ada di berkas tidak mengubah data lama. Semua baris divalidasi ulang di server dan impor dicatat di audit log.

Hasil **Ekspor Excel** memakai kolom yang sama, jadi bisa diedit lalu diimpor kembali. Kolom NIK/alamat/HP hanya ikut diekspor lewat tombol **Ekspor + data pribadi** (khusus Kepegawaian, tercatat di audit).

## Data asli

Data pegawai asli **tidak boleh di-commit**. File `*.xlsx`, `*.csv`, folder `data-impor/`, `.data/`, dan `backups/` sudah dikecualikan di `.gitignore`. Data asli masuk ke production hanya lewat fitur impor Excel (tahap 3).
