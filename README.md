# Absensi & Cuti ESDM Kalsel

Aplikasi web internal Dinas Energi dan Sumber Daya Mineral Provinsi Kalimantan Selatan untuk daftar hadir masuk kerja, pengajuan cuti, surat cuti per eselon, dan ruang dokumen pegawai.

Rancangan lengkap (struktur, skema, halaman, alur): [docs/RANCANGAN.md](docs/RANCANGAN.md).

> Status: **tahap 1–8 selesai** — login NIP & aktivasi, RBAC, dashboard, database pegawai (impor/ekspor Excel), absen & daftar hadir, cuti dengan persetujuan berjenjang & saldo, surat cuti per eselon (editor, versi, cetak & PDF), ruang dokumen dengan cetak gabungan, audit log & log login, master data, serta deployment Docker dengan backup harian.

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

Unduh PDF surat memerlukan Gotenberg (`docker compose -f docker-compose.dev.yml --profile pdf up -d`, port 3100, `GOTENBERG_URL` di `.env`). Tanpa Gotenberg, surat tetap bisa dicetak atau disimpan sebagai PDF dari dialog cetak browser.

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
| `npm run test:e2e` | E2E Playwright terhadap server dev + data seed (sekali: `npx playwright install chromium`) |
| `npm run typecheck` | Pemeriksaan TypeScript |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate ulang Prisma Client setelah skema berubah |

## Pengaturan absen yang wajib diisi Admin

Jam masuk, toleransi terlambat, dan batas alpa belum tercantum di dokumen acuan, jadi nilainya **kosong ([ISI])** setelah seed. Isi di **Admin → Pengaturan**. Selama kosong: semua absen dihitung Hadir dan Alpa tidak ditandai. Hari libur & cuti bersama dikelola di **Admin → Hari libur** (2026 sudah terisi dari SKB 3 Menteri).

Aturan Alpa: hanya pegawai yang **punya akun aktif** (absen online) yang otomatis ditandai Alpa setelah batas waktu, dan baru sejak hari akunnya dibuat. Pegawai yang masih tanda tangan di kertas (belum aktivasi, termasuk PJLP) dicatat kehadirannya oleh atasan/Kepegawaian dari halaman Daftar Hadir.

## Tugas terjadwal

`POST /api/tugas/harian` dengan header `Authorization: Bearer <TUGAS_TOKEN>` menandai Alpa untuk 7 hari kerja terakhir (idempoten). Jalankan tiap ±10 menit lewat cron, mis.:

```bash
curl -fsS -X POST -H "Authorization: Bearer $TUGAS_TOKEN" http://localhost:3000/api/tugas/harian
```

Tanpa tugas ini tampilan tetap benar (Alpa dihitung saat halaman dibuka), tetapi barisnya belum tersimpan di database.

## Alur cuti

Alur pengajuan (formulir fisik + surat dari Kepegawaian):

1. **Pegawai** membuka **Cuti Saya → Ajukan cuti** dan mengisi *Formulir Permintaan dan Pemberian Cuti* (format BKN, sama dengan "FORMULIR CUTI untuk Staf/Eselon 2–4"). Semua bagian bisa diubah: tujuan surat, data pegawai, jenis & lamanya cuti, catatan sisa cuti, alamat, serta atasan (VII) dan pejabat (VIII) — nilai awalnya disiapkan otomatis per eselon. Formulir langsung bisa **dicetak tanpa verifikasi** dan masih bisa diubah selama belum diproses.
2. Pegawai mengantar formulir bertanda tangan ke **Kepegawaian (Sekretariat)** untuk cap & tanda tangan.
3. **Kepegawaian/Admin** membuka pengajuan (Proses Cuti), menekan **Formulir diterima — buat surat cuti**: cuti dicatat disetujui, saldo dipotong, lalu langsung masuk editor surat cuti untuk diedit dan dicetak. Cetak pertama menandai status **Surat Terbit**.

Pegawai tetap bisa melihat dan mengunduh surat yang sudah dicetak, tetapi surat hanya dibuat dan diedit oleh Kepegawaian/Admin.

Saldo cuti tahunan "dipesan" selama pengajuan diproses, dipotong saat disetujui, dan dikembalikan bila dibatalkan. **Saldo & Rekap Cuti** (Kepegawaian) dipakai untuk koreksi saldo, impor saldo awal dari Excel, membuat saldo tahun berikutnya (sisa dibawa sesuai batas akumulasi di Pengaturan), serta mencetak/mengekspor Rekap Cuti Tahunan ASN.

## Surat cuti

| Level | Dokumen | Bisa dicetak sejak |
|---|---|---|
| Staf | Surat Izin Cuti (cetak pertama → status Surat Terbit) | Disetujui pejabat |
| Eselon IV | Permohonan Cuti kepada Kepala BKD | Diverifikasi Kepegawaian |
| Eselon III | Nota Dinas ke Sekretaris Daerah + Permohonan ke Kepala BKD | Diverifikasi Kepegawaian |
| Eselon II | Nota Dinas ke Gubernur (dengan kotak disposisi) | Diverifikasi Kepegawaian |

- Surat dibuka dari **Detail cuti → Surat**. Kepegawaian, Admin, dan pemohon bisa mengedit badan surat, hal, tanggal, dan tembusan; identitas pemohon, NIP, jumlah hari, dan tanggal cuti tampil sebagai isian terkunci dari data pengajuan. Nomor urut hanya diatur Kepegawaian/Admin.
- **Cetak** atau **Unduh PDF** mengunci versi itu beserta nomornya. Perubahan sesudahnya disimpan sebagai versi baru; versi lama tetap bisa dicetak ulang persis sama. Setiap cetak dan unduh PDF tercatat di riwayat cetak.
- Pratinjau, halaman cetak, dan PDF memakai HTML yang sama (A4, Times New Roman 12 pt, kop dengan lambang).
- **Admin → Template surat & penandatangan**: ubah template per level (placeholder seperti `{{nama}}`, `{{blok_identitas}}`), tambah pejabat penandatangan termasuk Plt./Plh. dengan periode berlaku (dipilih menurut tanggal surat), dan pilih nomor urut otomatis atau diisi tangan. Kode klasifikasi (`800.1.11.4`) dan kode instansi (`DESDM`) ada di Pengaturan.

## Ruang dokumen

- **Dokumen Saya**: SK, ijazah, KTP, KK, dll. per kategori. Disimpan terenkripsi (AES-256-GCM, kunci `BERKAS_KUNCI`) dengan nama UUID di luar folder publik; hanya pemilik, Kepegawaian, dan Admin yang bisa membuka (Kepegawaian lewat tab Dokumen di detail pegawai).
- **Dokumen Organisasi**: folder dengan hak *lihat*/*kelola* per peran, diatur di **Admin → Folder dokumen** (subfolder mewarisi hak induknya).
- Unggah PDF/JPG/PNG/DOCX/XLSX maks. 10 MB; isi berkas diperiksa (bukan hanya ekstensi). Hapus bersifat lunak — **Admin → Dokumen terhapus** untuk memulihkan.
- Centang beberapa dokumen lalu **Cetak gabungan** → satu PDF (gambar dipasang di halaman A4, DOCX/XLSX dikonversi Gotenberg). Setiap lihat, unduh, dan cetak tercatat di audit log.

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

## Deploy production

1. Di server (Docker + reverse proxy HTTPS, mis. Caddy/Nginx ke `127.0.0.1:3000`): salin repo, lalu `cp .env.production.example .env.production` dan isi semua nilai (password DB, `BERKAS_KUNCI`, `TUGAS_TOKEN`, `APP_URL` https).
2. Jalankan:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

   Layanan: `db` (PostgreSQL 17), `migrate` (`prisma migrate deploy` tiap deploy), `app` (Next.js standalone), `gotenberg` (PDF), `cron` (memanggil `/api/tugas/harian` tiap 10 menit), `backup`.
3. Data master (sekali, tanpa data dummy):

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm migrate npm run db:seed:master
```

4. Akun Admin pertama (password sementara dicetak sekali, wajib diganti saat login pertama):

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm migrate npm run admin:buat -- admin
```

5. Masuk sebagai Admin, isi pengaturan **[ISI]** (jam masuk, toleransi, batas alpa), periksa kop & penandatangan, lalu impor data pegawai dari Excel.

Development dan production terpisah: `APP_ENV=production` membuat seeder dummy menolak berjalan, cookie sesi memakai prefix `__Host-` bila `APP_URL` https, dan database/berkas berada di volume Docker sendiri.

## Backup & restore

- Layanan `backup` membuat `db-YYYYmmdd-HHMM.dump` (pg_dump) dan `berkas-YYYYmmdd-HHMM.tar.gz` setiap hari pukul `JAM_BACKUP` WITA di `BACKUP_DIR`, dan menghapus yang lebih tua dari `RETENSI_HARI` hari. Backup manual: `docker compose -f docker-compose.prod.yml exec backup sh /scripts/backup.sh sekali`.
- Backup berisi data pribadi: simpan di lokasi terbatas aksesnya. Berkas pribadi di dalam tar tetap terenkripsi — **simpan `BERKAS_KUNCI` terpisah dari backup**; tanpa kunci itu dokumen pribadi tidak bisa dibuka.
- Pulihkan (lihat komentar di [scripts/restore.sh](scripts/restore.sh)): hentikan `app` & `cron`, jalankan `restore.sh <db-*.dump> [berkas-*.tar.gz]` di container `backup`, lalu nyalakan lagi. Prosedur ini sudah diuji dengan memulihkan ke database terpisah dan membandingkan jumlah baris.

Alternatif lewat terminal (aturan validasi sama): `npm run impor:pegawai -- data-impor/pegawai.xlsx` untuk memeriksa, tambahkan `--simpan` untuk menyimpan.

## Data asli

Data pegawai asli **tidak boleh di-commit**. File `*.xlsx`, `*.csv`, folder `data-impor/`, `.data/`, dan `backups/` sudah dikecualikan di `.gitignore`. Data asli masuk ke production hanya lewat fitur impor Excel (tahap 3).
