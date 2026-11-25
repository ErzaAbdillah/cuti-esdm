# WORKSPACE SYNC & PROJECT HUB

> **Aturan Wajib untuk Semua AI Agent:**
> 1. **Gaya Bahasa Ramah Pemula:** Selalu gunakan **Bahasa Indonesia yang sederhana, santai, mudah dipahami pemula**, dan **jangan gunakan gaya bahasa teknis yang membingungkan**. Fokus jelaskan dampak praktis bagi pegawai/admin/pemilik aplikasi.
> 2. **Wajib Menuliskan Prompt Penerus:** Jika pekerjaan pada sesi ini belum tuntas sepenuhnya atau perlu dilanjutkan/diperiksa oleh AI Agent lain, **WAJIB tuliskan kotak "Prompt untuk AI Agent Selanjutnya"** yang siap salin (*copy-paste*) di akhir jawaban Anda.
> 3. **Daftar AI Agent Proyek:** `Coder` (Conv 1), `Debugger/QA` (Conv 2), `Architect` (Conv 3), `UI/UX Stylist` (Conv 4), ditambah `Chatbot` (diskusi 100% hanya baca) dan `Kantor` (forum pendapat seluruh AI Agent) — lihat folder `ai-agents/`.

## 0. Ringkasan Proyek & Tech Stack (Referensi Semua Agent)
- **Deskripsi Singkat:** **Layanan Cuti ESDM Kalsel** — Aplikasi web internal Dinas ESDM Provinsi Kalimantan Selatan untuk pengelolaan data pegawai, pengajuan cuti berjenjang (standar formulir BKN), penerbitan surat cuti & nota dinas per eselon (editor Tiptap, versioning, cetak/PDF), serta ruang dokumen kepegawaian terenkripsi. *(Catatan: Modul absensi lama telah dinonaktifkan/deprecated, tabel di DB dipertahankan untuk histori).*
- **Tech Stack & Library:**
  - **Framework & Runtime:** Next.js 16.4.6 (App Router), React 19.3.0, TypeScript 5, Node.js 24.
  - **Database & ORM:** PostgreSQL 17 + Prisma ORM 7.10.1 (`@prisma/adapter-pg`, sesi DB wajib UTC, timezone tampilan `Asia/Makassar` - WITA). Ekstensi `pg_trgm` untuk pencarian.
  - **Styling & UI:** Tailwind CSS v4, Radix UI / shadcn/ui, Lucide Icons, Sonner (toast), Tiptap 3 (editor surat).
  - **Autentikasi & Keamanan:** Cookie sesi HttpOnly (`__Host-` pada HTTPS) + hash token sesi di database (`sesi`), argon2id (`@node-rs/argon2`), Google OAuth 2.0 (opsional), proteksi CSRF, proteksi brute-force login (`batas-login.ts`), enkripsi AES-256-GCM untuk dokumen privat.
  - **Manajemen Dokumen & PDF:** Gotenberg 8 (sidecar container HTML/DOCX/XLSX -> PDF) + `pdf-lib` untuk cetak gabungan PDF. Berkas disimpan di luar public folder (`STORAGE_DIR = ./.data/berkas`).
  - **Impor/Ekspor Excel:** SheetJS 0.20.3 (tarball resmi CDN) untuk impor & ekspor pegawai/rekap.
  - **Worker & Email:** Route Handler `POST /api/tugas/harian` (Bearer `TUGAS_TOKEN`), antrean `email_keluar` via Nodemailer.
- **Struktur Folder Utama:**
  - `app/(aplikasi)/`: Halaman terproteksi RBAC (`admin/`, `beranda/`, `cuti/`, `dokumen/`, `pegawai/`, `profil/`, `notifikasi/`).
  - `app/(publik)/`: Halaman publik autentikasi (`login/`, `daftar/` aktivasi akun, Google OAuth).
  - `app/(cetak)/`: Layout cetak khusus tanpa navigasi (`@page` CSS untuk print A4/Legal & Gotenberg).
  - `app/api/`: Route handlers (auth callback, stream berkas terenkripsi, ekspor Excel, PDF Gotenberg, cron harian).
  - `server/`: Lapisan backend terisolasi (`server-only`):
    - `server/aksi/`: Server Actions (Zod validasi -> RBAC -> Transaksi Prisma DB -> Audit Log).
    - `server/kueri/`: Fungsi query database terisolasi sesuai otorisasi pemohon.
    - `server/layanan/`: Business domain logic & policies (cuti, akses dokumen, pegawai).
    - `server/auth/`: Manajemen sesi, autentikasi Google, verifikasi password, CSRF, rate limit.
    - `server/dokumen/`, `server/surat/`, `server/excel/`: Penyimpanan file terenkripsi, template surat/sanitasi HTML, parser/generator Excel.
  - `lib/domain/`: Pure domain logic (aturan NIP PNS/PPPK, kalkulator hari kerja & libur, saldo cuti, eselon/level surat, terbilang).
  - `lib/validasi/`: Skema validasi Zod untuk form & server actions.
  - `components/`: Komponen antarmuka modular (UI shadcn, admin, auth, cuti, dokumen, pegawai, surat, tata-letak).
  - `prisma/`: Skema database (`schema.prisma`), migrasi PostgreSQL, seeder master data & data dummy dev.
- **Alur Utama / File Kunci:**
  - Database Client: `server/db.ts` (PrismaPg adapter dengan timezone UTC)
  - Otentikasi & Sesi: `server/auth/sesi.ts`, `server/auth/pengguna.ts`, `server/aksi/auth.ts`
  - Domain Cuti & Alur: `lib/domain/alur-cuti.ts`, `lib/domain/saldo-cuti.ts`, `server/layanan/cuti.ts`, `server/aksi/cuti.ts`
  - Generator Dokumen & Surat: `server/surat/data.ts`, `server/surat/pdf.ts`, `lib/surat/render.ts`, `app/api/surat/[versiId]/pdf/route.ts`
  - Dokumen Terenkripsi: `server/dokumen/penyimpanan.ts`, `server/dokumen/gabung.ts`, `app/api/dokumen/[id]/berkas/route.ts`
  - Background Worker: `app/api/tugas/harian/route.ts` (Cron pembaruan status cuti selesai & kirim antrean email)

## Status Saat Ini
- **Fase Aktif:** Sudah Di-commit & Di-push ke GitHub (`main`) — Menunggu Migrasi Tabel `dokumen_berkas` ke Neon, Pengaturan Env/Cron Vercel, & Verifikasi Akhir Produksi oleh Debugger/QA
- **Fitur/Modul Aktif:** Penyimpanan Berkas Permanen (`dokumen_berkas`), Jadwal Harian Otomatis Vercel (Cron), & Paket Perbaikan Keamanan/Logika QA Gelombang 1–4 (`2026-11-25`)
- **Penanggung Jawab Terakhir:** Coder

## 1. Cetak Biru & Skema Data (Diisi oleh Conversation 3 - Architect)
*Rancangan alur sistem, struktur tabel/database, dan daftar file yang harus dibuat/dieksekusi oleh Coder:*

### I. Penyimpanan Berkas Permanen di Vercel, Jadwal Harian Otomatis, & Urutan Perbaikan Temuan QA (`2026-11-25`)

#### Bagian I.1 — Solusi Penyimpanan Berkas Permanen di Vercel (Dokumen & Lampiran Surat Izin)
1. **Latar Belakang & Dampak bagi Pegawai/Admin:**
   - Saat ini, berkas yang diunggah di **Dokumen Saya**, **Dokumen Organisasi**, dan **Surat Izin Cuti Eksternal** masih disimpan ke folder lokal server (`./.data/berkas`). Di website online Vercel, folder seperti itu tidak bisa dipakai menyimpan file secara permanen (bisa gagal saat unggah atau hilang saat pembaruan aplikasi).
   - Kabar baiknya, hasil pengecekan QA di website online menunjukkan folder dokumen saat ini masih berisi **0 berkas**, sehingga **belum ada dokumen pegawai yang hilang** — ini saat terbaik untuk memindahkan tempat penyimpanan sebelum pegawai mulai mengunggah berkas.
   - Sebagai acuan, fitur **Foto Profil** sudah berhasil dan stabil di website online karena disimpan di tabel khusus di database Neon (`foto_profil`).

2. **Perbandingan Dua Pilihan untuk Pemilik Proyek:**
   - **Opsi 1 (Rekomendasi Utama Sekarang) — Simpan Terenkripsi di Tabel Database Terpisah (`dokumen_berkas` di Neon, seperti `foto_profil`):**
     - **Cara kerja:** Isi berkas (yang sudah diacak/dienkripsi untuk dokumen pribadi & lampiran surat izin) disimpan di satu tabel khusus bernama `dokumen_berkas`, terpisah dari daftar judul dokumen agar halaman daftar tetap ringan dan cepat dibuka.
     - **Kelebihan:** Langsung bisa dipakai hari ini tanpa daftar akun baru, tanpa kartu kredit/biaya tambahan, langsung berjalan sama persis di komputer lokal maupun website online Vercel, dan ikut tersalin otomatis saat database dicadangkan (*backup*).
     - **Batasan yang perlu diketahui:**
       - Kapasitas gratis database Neon adalah **512 MB** (cukup untuk sekitar **±300–500 berkas** PDF/foto ukuran rata-rata 1 MB untuk 93 pegawai pada tahap awal).
       - Karena unggahan dikirim melewati server Vercel yang punya batas paket data **4,5 MB**, ukuran berkas unggahan di website online perlu dibatasi jujur maksimal **4 MB per berkas** agar pegawai tidak mendapat galat kasar dari Vercel.
   - **Opsi 2 (Alternatif Jika Butuh Kapasitas Besar / File s.d. 10 MB Sejak Hari Pertama) — Simpan di Ruang Berkas Awan Privat (Cloudflare R2 / Vercel Blob):**
     - **Cara kerja:** Isi berkas dititipkan ke layanan penyimpanan awan privat (bukan publik), sedangkan database Neon hanya menyimpan nama, kategori, dan alamat berkasnya.
     - **Kelebihan:** Kapasitas jauh lebih lega (**Cloudflare R2 gratis hingga 10 GB**, muat ribuan file scan SK/KTP/KK/Peraturan) dan bisa menerima berkas hingga **10 MB** menggunakan jalur unggah langsung ke awan tanpa memakan ruang database Neon.
     - **Batasan yang perlu diketahui:** Pemilik proyek perlu mendaftar akun layanan awan tambahan (Cloudflare R2 membutuhkan verifikasi metode pembayaran meski paket 10 GB-nya gratis; sedangkan Vercel Blob gratis terbatas sekitar 1 GB), lalu mengisi 4–5 kode kunci rahasia baru di pengaturan Vercel.
   - **Strategi Arsitektur ("Aman Sekarang, Siap Tumbuh Nanti"):**
     - **Architect merekomendasikan mengeksekusi Opsi 1 sekarang** dengan membuat pintu penyimpanan yang fleksibel (`PENYIMPANAN_DOKUMEN=db` sebagai bawaan, tetap mendukung `disk` untuk server kantor mandiri, dan kelak mudah ditambah `r2` jika suatu hari total berkas mendekati 300–400 MB tanpa mengubah halaman).
     - *(Bila pemilik proyek sudah memiliki akun Cloudflare R2 / Vercel Blob dan wajib menerima scan sampai 10 MB sejak awal, cukup pilih Opsi 2 sebelum Coder memulai pengerjaan).*

3. **Rancangan Detail Opsi 1 (Skema Database, Batas Ukuran, & Anti-Error Berkas Hilang):**
   - **Perubahan Tabel Database (`prisma/schema.prisma` + file migrasi SQL baru):**
     - Tambah model baru `DokumenBerkas` (`@@map("dokumen_berkas")`) yang terhubung 1-ke-1 dengan `Dokumen`:
       - `dokumenId String @id @map("dokumen_id") @db.Uuid` (FK ke `dokumen.id`, `onDelete: Cascade`)
       - `data Bytes` (isi berkas; sudah terenkripsi AES-256-GCM bila `dokumen.terenkripsi = true`)
       - `dibuatPada DateTime @default(now()) @map("dibuat_pada") @db.Timestamptz`
     - Tambahkan relasi opsional `berkas DokumenBerkas?` pada model `Dokumen`.
     - **Simpan serentak (atomik):** Saat pegawai mengunggah berkas di mode `db`, baris `dokumen` dan isi `dokumen_berkas` wajib disimpan bersama dalam satu transaksi database agar tidak pernah ada judul dokumen tanpa isi filenya.
     - **Tetap aman untuk "Pulihkan Dokumen":** Karena tombol hapus hanya menandai `dihapusPada` (*hapus lunak*), isi di `dokumen_berkas` tetap tersimpan utuh sehingga Admin tetap bisa memulihkan dokumen yang terhapus.
   - **Batas Ukuran Unggahan yang Jujur & Konsisten:**
     - Buat helper terpusat batas ukuran dokumen: di server Vercel (`VERCEL=1`) dengan mode penyimpanan database, batas unggahan maksimal otomatis dijaga di **4 MB** (`Math.min(nilaiPengaturan, 4)`), sedangkan di server lokal/Docker tetap bisa hingga **10 MB** sesuai pengaturan `dokumen.maks_ukuran_mb`.
     - Perbarui tampilan teks batas ukuran di **Dokumen Saya**, **Dokumen Organisasi** (`components/dokumen/form-unggah.tsx`), dan **Surat Izin Eksternal** (`components/cuti/aksi-pengajuan.tsx` — yang saat ini masih tertulis tetap 10 MB), serta tambahkan pengecekan ukuran berkas langsung di browser sebelum tombol kirim bekerja agar pegawai langsung mendapat pesan ramah jika file terlalu besar.
   - **Penanganan Berkas Tidak Ditemukan & Kunci Enkripsi (Anti Error Mentah 500):**
     - Tambahkan kelas galat khusus `GalatBerkasTidakDitemukan` dan `GalatKonfigurasiBerkas` di `server/dokumen/penyimpanan.ts`.
     - Urutan baca berkas (`bacaBerkas`): (1) baca dari tabel `dokumen_berkas` berdasarkan `dokumen.id`; (2) bila tidak ada di database (misal data lama di server lokal), coba baca dari folder `STORAGE_DIR` dengan menangkap error file hilang (`ENOENT`); (3) jika tetap tidak ada, lempar `GalatBerkasTidakDitemukan`.
     - Di `app/api/dokumen/[id]/berkas/route.ts`: tangkap `GalatBerkasTidakDitemukan` lalu kembalikan status **404** dengan pesan ramah *"Berkas fisik dokumen tidak ditemukan di penyimpanan server. Hubungi Admin/Kepegawaian untuk mengunggah ulang."* (tanpa mencatat audit unduh palsu).
     - Di `server/dokumen/gabung.ts` (`gabungkanPdf`): tangkap `GalatBerkasTidakDitemukan` lalu ubah menjadi `GalatGabung` agar cetak gabungan membalas pesan ramah **422** yang menyebut nama dokumen bermasalah.
     - Di aksi unggah (`server/aksi/dokumen.ts`, `server/aksi/cuti.ts`): tangkap bila `BERKAS_KUNCI` belum dipasang dan tampilkan pesan ramah *"Kunci enkripsi dokumen belum dikonfigurasi di server. Hubungi Admin."* *(Pengingat rilis: pemilik proyek wajib memastikan `BERKAS_KUNCI` sepanjang 64 karakter hex sudah diisi di Environment Variables Vercel).*
   - **Daftar File Target Bagian I.1:**
     - `prisma/schema.prisma` & `prisma/migrations/<timestamp>_dokumen_berkas/migration.sql` *(Baru)*
     - `server/dokumen/penyimpanan.ts` *(Ubah — pisah persiapan/enkripsi berkas, simpan/baca mode `db` & fallback `disk`, tambah kelas galat khusus)*
     - `lib/dokumen.ts` & `lib/pengaturan.ts` *(Ubah — helper batas ukuran unggah 4 MB di Vercel / maks. 10 MB di lokal)*
     - `server/aksi/dokumen.ts`, `server/aksi/cuti.ts` (`catatKeputusanEksternal`) *(Ubah — simpan `Dokumen` + `DokumenBerkas` dalam 1 transaksi, pakai batas ukuran konsisten, tangkap galat kunci)*
     - `app/api/dokumen/[id]/berkas/route.ts` & `server/dokumen/gabung.ts` *(Ubah — teruskan `id` dokumen ke `bacaBerkas`, tangkap `GalatBerkasTidakDitemukan` menjadi respons ramah)*
     - `app/(aplikasi)/dokumen/page.tsx`, `app/(aplikasi)/dokumen/organisasi/page.tsx`, `components/dokumen/form-unggah.tsx`, `components/cuti/aksi-pengajuan.tsx`, `app/(aplikasi)/cuti/[id]/page.tsx` *(Ubah — tampilkan batas MB aktual + cek ukuran di browser sebelum kirim)*

---

#### Bagian I.2 — Jadwal Harian Otomatis di Vercel (`vercel.json` Cron)
1. **Latar Belakang & Dampak bagi Pegawai/Admin:**
   - Di website online saat ini terdapat **6 pengajuan cuti** yang masa cutinya sudah lewat, tetapi statusnya masih bertahan di **Surat Terbit** dan belum otomatis berubah menjadi **Selesai** karena belum ada penjadwal harian otomatis di Vercel.
2. **Alur Kerja & Hal Penting Khusus Vercel:**
   - **Wajib Mendukung Permintaan `GET` dan `CRON_SECRET`:** Layanan penjadwal bawaan Vercel (*Vercel Cron*) selalu memanggil alamat tujuan memakai metode **`GET`** dengan kata sandi rahasia **`CRON_SECRET`** di header `Authorization: Bearer <CRON_SECRET>`. Saat ini `app/api/tugas/harian/route.ts` baru melayani `POST` dengan `TUGAS_TOKEN`, sehingga perlu ditambah handler `GET` (sambil tetap mempertahankan `POST` + `TUGAS_TOKEN` agar server lokal/Docker tetap berfungsi).
   - **Jadwal Ramah Paket Gratis Vercel (Hobby):** Paket gratis Vercel mengizinkan maksimal **1 kali jalan per hari**. Jadwal terbaik untuk zona waktu Kalimantan Selatan (**WITA = UTC+8**) adalah **`0 17 * * *`** (= **setiap hari pukul 01:00 WITA**), tepat sesudah tengah malam berganti tanggal sehingga semua cuti yang berakhir kemarin langsung berstatus **Selesai** sebelum jam kerja pagi.
   - **Cegah Riwayat Status Ganda (`server/layanan/cuti.ts`):** Perbaiki `selesaikanCutiLewat` agar memeriksa hasil `updateMany` terlebih dahulu dan **hanya** menulis catatan `riwayat_status_cuti` jika status benar-benar berubah (`r.count > 0`), sehingga aman walau jadwal terpicu dua kali bersamaan.
   - **Langkah Aktivasi Saat Rilis ke Vercel:** Pemilik proyek menambahkan variabel lingkungan `CRON_SECRET` (acak minimal 32 karakter) di pengaturan **Vercel → Environment Variables** lalu melakukan deploy ulang. Setelah tayang, bisa langsung diklik tombol **Run** sekali di menu **Vercel → Settings → Cron Jobs** agar 6 pengajuan cuti lama langsung berubah menjadi **Selesai**.
3. **Daftar File Target Bagian I.2:**
   - `vercel.json` *(Baru — daftarkan cron `/api/tugas/harian` jadwal `"0 17 * * *"`)*
   - `app/api/tugas/harian/route.ts` *(Ubah — dukung metode `GET` & `POST`, terima `CRON_SECRET` atau `TUGAS_TOKEN` dengan perbandingan aman)*
   - `server/layanan/cuti.ts` *(Ubah — pastikan `selesaikanCutiLewat` hanya mencatat riwayat bila `updateMany` mengubah baris)*
   - `.env.example` *(Ubah — tambahkan keterangan `CRON_SECRET=`)*

---

#### Bagian I.3 — Urutan Eksekusi Perbaikan Temuan Keamanan & Logika QA (4 Gelombang Terstruktur)
Agar `Coder` bisa memperbaiki seluruh temuan di Bagian 4 tanpa merusak fitur yang sudah jalan, eksekusi dibagi menjadi **4 Gelombang** dari yang paling genting ke yang paling ringan:

##### **Gelombang 1 (KRITIS) — Penutupan Kebocoran Hak Akses Modular vs Peran Lama & Proteksi Superadmin**
- **Aturan Emas Baru (Satu Sumber Kebenaran):**
  1. Hanya **Superadmin (`eerza311` / `admin`)** yang memiliki **Hak Akses Mutlak** dan berwenang mengubah kotak centang hak akses serta peran pegawai lain (`aturHakAkses` & `aturPeran` dikunci **khusus `adalahSuperadmin(u)`**).
  2. Pegawai dengan centang **`PENGATURAN_ADMIN`** (non-Superadmin) hanya boleh membuka menu pengaturan sistem Admin serta membantu reset password / buka kunci / aktif-nonaktif **pegawai biasa** — **dilarang** mengubah hak akses sendiri/orang lain, **dilarang** menindak sesama Admin/Superadmin, dan **tidak otomatis** mendapat akses dokumen pribadi, saldo cuti, maupun proses cuti.
  3. Di `aturHakAkses` (`server/aksi/akun.ts`): **hapus penambahan otomatis peran lama `ADMIN`**, dan bersihkan peran lama `ADMIN` & `KEPEGAWAIAN` dari tabel `user_peran` target saat centang disimpan agar tidak ada lagi peran lama yang bocor (sekaligus mencegah akun yang dikosongkan semua centangnya kembali mendapat hak bawaan lama).
  4. Jadikan `punyaHakAkses(u, "...")` sebagai **satu-satunya acuan izin modul** (karena Superadmin otomatis lolos, dan akun lama yang belum pernah diatur tetap mendapat hak bawaan satu kali lewat `penggunaSaatIni()`). Hapus seluruh pengecekan `|| punyaPeran(u, "ADMIN")` dan `|| punyaPeran(u, "KEPEGAWAIAN")` yang masih tersisa di layanan/aksi/rute/menu (tetap pertahankan `punyaPeran(u, "ATASAN")` & `punyaPeran(u, "PEGAWAI")` untuk alur atasan langsung dan cuti/dokumen sendiri).
  5. Pisahkan izin membuka data sensitif NIK/alamat/HP (`bukaDataSensitif` di `server/aksi/pegawai.ts`) agar **hanya pemilik sendiri atau pemegang `KELOLA_PEGAWAI`/Superadmin** yang dapat membukanya (pemegang `PENGATURAN_ADMIN` saja tidak otomatis melihat NIK/KTP/KK pegawai).
  6. **Anti-Nonaktif Superadmin via Data Pegawai & Impor Excel:** Di `server/aksi/pegawai.ts` (`simpanPegawai`) dan `server/layanan/impor-pegawai.ts` (`simpanImporPegawai`), cegah penonaktifan akun login jika terhubung dengan akun Superadmin (`adalahAkunSuperadmin`).
- **Daftar File Target Gelombang 1:**
  - `server/aksi/akun.ts` *(kunci `aturHakAkses` & `aturPeran` khusus Superadmin; kunci `resetPassword`/`bukaKunci`/`aturAktifAkun` agar tidak bisa menindak sesama pemegang `PENGATURAN_ADMIN`/Admin; hapus injeksi peran `ADMIN` dan bersihkan peran lama saat simpan hak akses)*
  - `lib/menu.ts` *(hapus `peran: ["ADMIN"]` pada menu `/cuti/proses`, `/cuti/saldo`, `/pegawai`, `/admin`; pertahankan `peran: ["ATASAN"]` pada `/cuti/proses`)*
  - `server/layanan/akses-dokumen.ts`, `server/layanan/akses-cuti.ts`, `server/layanan/wewenang-cuti.ts` *(pakai `punyaHakAkses` penuh tanpa bypass peran lama `ADMIN`/`KEPEGAWAIAN`)*
  - `server/aksi/cuti.ts`, `server/aksi/saldo.ts`, `server/aksi/pegawai.ts`, `server/aksi/admin.ts`, `server/aksi/master.ts`, `server/aksi/folder.ts`, `server/aksi/surat-admin.ts`, `server/aksi/dokumen.ts`, `server/layanan/impor-pegawai.ts`
  - `server/kueri/beranda.ts`, `server/kueri/grup-pegawai.ts`, `server/kueri/lingkup-rekap.ts`, `server/kueri/pegawai-detail.ts`
  - `app/(aplikasi)/cuti/[id]/page.tsx`, `app/(aplikasi)/cuti/[id]/formulir/page.tsx`, `app/(aplikasi)/dokumen/page.tsx`, `app/(aplikasi)/admin/hak-akses/page.tsx`, `app/(aplikasi)/pegawai/[id]/page.tsx` *(atur `bolehKelola = adalahSuperadmin(u)` pada matriks & panel hak akses)*
  - `app/(cetak)/cetak/pegawai/page.tsx`, `app/(cetak)/cetak/rekap-cuti/page.tsx`, `app/api/cuti/template-saldo/route.ts`, `app/api/ekspor/rekap-cuti/route.ts`, `app/api/ekspor/pegawai/route.ts`, `app/api/pegawai/impor/route.ts`, `app/api/pegawai/template/route.ts`

##### **Gelombang 2 (TINGGI) — Privasi `pratinjauCuti`, Anti-Bentrok Ubah vs Setujui, & Batas Rentang Tanggal**
1. **Privasi `pratinjauCuti` (`server/aksi/cuti.ts`):** Saat parameter `kecualiId` dikirim, wajib pastikan pengajuan ditemukan dan pemanggil adalah pemilik pengajuan tersebut atau pemegang hak `PROSES_CUTI` (jika bukan, langsung kembalikan galat akses tanpa membocorkan sisa saldo maupun tanggal cuti rekan kerja).
2. **Integritas Transaksi & Anti-Bentrok Cuti (`server/aksi/cuti.ts`, `server/layanan/cuti.ts`):**
   - Validasi format UUID pada `id` di `simpanFormulir` sebelum menyentuh database.
   - Pasang **kunci antrean per pegawai yang sama** (`pg_advisory_xact_lock(hashtext(pegawaiId))`) di dalam transaksi pada `simpanFormulir`, `setujuiCuti`, `tolakCuti`, `batalkanCuti`, dan `catatKeputusanEksternal` supaya aksi ubah formulir dan aksi persetujuan/penolakan/pembatalan tidak pernah saling salip.
   - Pada mode ubah di `simpanFormulir`, gunakan `updateMany({ where: { id: lama.id, status: "DIAJUKAN" }, data })` di dalam transaksi; bila `count === 0`, batalkan transaksi dan kembalikan pesan ramah *"Formulir baru saja diproses dan tidak bisa diubah lagi. Muat ulang halaman."*
   - Di `terapkanPersetujuan` (`server/layanan/cuti.ts`), periksa ulang kecukupan saldo (`saldoTersedia(saldo) < p.jumlahHari`) sebelum memotong saldo; jika kurang, lempar `"SALDO_KURANG"` dan tampilkan pesan ramah di `setujuiCuti` & `catatKeputusanEksternal`.
   - Bungkus transaksi `tolakCuti` dan `batalkanCuti` dengan `try / catch` untuk menangkap `"BERUBAH"` menjadi pesan ramah *"Status pengajuan baru saja berubah. Muat ulang halaman."*
3. **Batas Rentang Tanggal & Hitung Hari Kerja Ringan (`lib/domain/hari-kerja.ts`, `server/layanan/cuti.ts`):**
   - Batasi tahun tanggal cuti yang wajar (`2000–2100`) dan batas maksimal selisih kalender (`1.100` hari / ~3 tahun untuk CLTN) di awal `validasiPengajuan` **sebelum** mengambil data libur dan menghitung hari kerja.
   - Ubah `hitungHariKerja` agar menjumlahkan langsung memakai penghitung sederhana dalam satu putaran tanpa membuat daftar jutaan objek tanggal di memori server.

##### **Gelombang 3 (SEDANG) — Notifikasi Hak Modular, Validasi Impor/Ekspor Saldo, Anti-Loop Unit, & Kunci Nomor Surat**
1. **Notifikasi untuk Pemegang Centang `PROSES_CUTI` (`server/notifikasi.ts`, `server/layanan/wewenang-cuti.ts`, `server/aksi/cuti.ts`):**
   - Tambah helper `userDenganHakAkses(hak, tx)` di `server/notifikasi.ts` yang mencakup seluruh akun aktif pemilik hak modular terkait + Superadmin (+ akun warisan yang belum punya baris `user_hak_akses`).
   - Ganti `userDenganPeran(...)` pada `penerimaTahap` dan notifikasi pembatalan di `batalkanCuti` memakai `userDenganHakAkses("PROSES_CUTI", tx)`.
2. **Validasi Impor Saldo & Nama Sheet Unik Ekspor Rekap (`server/aksi/saldo.ts`, `app/api/ekspor/rekap-cuti/route.ts`):**
   - Tambahkan validasi rentang `tahun` (`2020–2100`) dan tolak seluruh file Excel bila ada **NIP ganda** dalam satu file impor saldo (sebutkan nomor kedua barisnya).
   - Buat helper pembuat nama tab Excel unik (maks. 31 huruf, menambah akhiran ` (2)`, ` (3)`, dst. jika ada dua unit dengan awalan sama) pada `app/api/ekspor/rekap-cuti/route.ts`.
3. **Cegah Induk Unit Melingkar & Antrean Nomor Surat (`server/aksi/master.ts`, `server/layanan/cuti.ts`, `server/aksi/surat.ts`):**
   - Di `simpanUnit`: telusuri rantai induk ke atas dari `parentId` yang dipilih; tolak jika bertemu `id` unit yang sedang diubah.
   - Di `snapshotIdentitas`: pasang himpunan `Set` unit yang sudah dikunjungi agar penelusuran induk tidak pernah berputar tanpa henti.
   - Di `simpanSurat`: sebelum menghitung `max(nomorUrut) + 1` otomatis, pasang kunci antrean per tahun (`pg_advisory_xact_lock(hashtext('surat_nomor_' + tahun))`) agar dua petugas yang mencetak bersamaan selalu mendapat nomor berurutan tanpa error bentrok.

##### **Gelombang 4 (RENDAH) — Konsistensi Password Sementara di API & Polesan Matriks Hak Akses + Warna Bilah HP**
1. **Tolak Rute API Sensitif Saat `wajibGantiPassword` Aktif:**
   - Di `app/api/auth/google/route.ts` (`mode=hubungkan`) & `app/api/auth/google/callback/route.ts` (`mode=hubungkan`): bila `u.wajibGantiPassword`, arahkan kembali ke `/profil?wajib=1`.
   - Di rute API unduh/ekspor/impor/PDF (`app/api/dokumen/[id]/berkas/route.ts`, `app/api/dokumen/cetak-gabungan/route.ts`, `app/api/surat/[versiId]/pdf/route.ts`, `app/api/ekspor/pegawai/route.ts`, `app/api/ekspor/rekap-cuti/route.ts`, `app/api/cuti/template-saldo/route.ts`, `app/api/pegawai/impor/route.ts`, `app/api/pegawai/template/route.ts`): kembalikan **HTTP 403** (*"Ganti password sementara terlebih dahulu di halaman Profil."*) bila `u.wajibGantiPassword === true`. *(Biarkan `/api/profil/foto/[userId]` tetap terbuka agar avatar profil tampil normal saat pegawai mengganti password).*
2. **Perapian Matriks Hak Akses (`components/admin/matriks-hak-akses.tsx`, `app/(aplikasi)/admin/hak-akses/page.tsx`):**
   - Saat centang `PENGATURAN_ADMIN` dilepas/dipasang, langsung perbarui properti `adalahAdmin` pada state baris sehingga lencana **Admin** dan angka filter langsung berubah seketika tanpa muat ulang.
   - Bersihkan simbol/tanda kurung pada `dapatkanInisial()` agar nama `eerza311 (Superadmin)` tampil rapi **`ES`** (bukan `E(`).
3. **Opsional — Warna Bilah Browser HP Mengikuti Tema (`app/layout.tsx`):**
   - Ganti ekspor statis `viewport` menjadi fungsi `generateViewport()` yang membaca cookie tema (`KUKI_TEMA`) dan menyesuaikan `themeColor` dengan warna latar tema aktif dari `DAFTAR_TEMA` (`#0E0E10`, `#F0F9FF`, atau `#161E1A`).

#### Bagian I.4 — Skenario Pengecekan Wajib (untuk Coder & Debugger/QA)
1. **Penyimpanan Berkas:** Unggah PDF & foto di **Dokumen Saya** (terenkripsi), **Dokumen Organisasi**, dan **Surat Izin Eksternal** → pastikan berkas tersimpan di tabel `dokumen_berkas`, bisa dibuka/diunduh & dicetak gabungan, hapus-pulihkan tetap bisa dibuka, file melebihi batas (4 MB di Vercel) ditolak rapi, dan bila isi berkas dihapus paksa dari DB, endpoint membalas **404 ramah** (bukan crash 500).
2. **Jadwal Harian Otomatis:** Panggil `GET /api/tugas/harian` dengan `Bearer <CRON_SECRET>` dan `POST /api/tugas/harian` dengan `Bearer <TUGAS_TOKEN>` → pastikan keduanya mengembalikan `ok: true`, status cuti *Surat Terbit* yang tanggalnya sudah lewat berubah menjadi *Selesai*, dan pemanggilan ulang tidak membuat riwayat status ganda; token salah selalu ditolak `401`.
3. **Keamanan Hak Akses Modular:**
   - Beri akun tes **hanya** `PENGATURAN_ADMIN` → pastikan ia **tidak** bisa membuka dokumen pribadi pegawai lain, **tidak** bisa menyetujui/mengubah cuti orang lain, **tidak** bisa mengakses `/cuti/saldo` atau `/pegawai`, **tidak** bisa mencentang hak akses sendiri, dan **tidak** bisa menonaktifkan/mereset akun Superadmin atau sesama Admin.
   - Cabut `KELOLA_SALDO_CUTI` & `PROSES_CUTI` dari akun yang dulu ber-peran `KEPEGAWAIAN` → pastikan ia langsung tertolak saat mencoba ubah saldo atau setujui cuti.
4. **Privasi, Anti-Bentrok, & Rentang Tanggal:**
   - Pegawai A memanggil `pratinjauCuti` dengan `kecualiId` milik Pegawai B → ditolak tanpa membocorkan saldo/tanggal Pegawai B.
   - Masukkan tanggal selesai tahun `9026` → langsung ditolak cepat (< 50 ms) tanpa membebani memori.
   - Ubah formulir vs Setujui bersamaan / tolak ganda / batal ganda / saldo kurang saat disetujui → semua mengembalikan pesan ramah tanpa saldo minus atau galat mentah.
5. **Notifikasi, Impor/Ekspor, Unit, Nomor Surat, Password Sementara, & Matriks:**
   - Pemegang centang `PROSES_CUTI` (tanpa peran lama) menerima notifikasi saat pengajuan masuk & saat dibatalkan.
   - Impor saldo dengan NIP ganda atau tahun tidak valid ditolak bersih; ekspor rekap dengan 2 nama unit awalan kembar tetap sukses.
   - Simpan unit induk melingkar ditolak; cetak surat bersamaan tidak bentrok `P2002`; akun `wajibGantiPassword` ditolak saat mengakses API berkas/ekspor/tautkan Google; lencana **Admin** langsung berubah dan inisial `eerza311 (Superadmin)` tampil **`ES`**.
   - Jalankan `npm run typecheck`, `npm run lint`, `npm test` (tambahkan unit test untuk skenario baru), dan `npm run build` sebelum rilis.

### H. Animasi Tombol Interaktif "Abu Terbawa Angin" (Opsi A: Elegan Halus)
1. **Ringkasan & Dampak bagi Pegawai/Admin:**
   - Menambahkan efek animasi interaktif yang halus (*smooth*) dan memudar perlahan (*fading*) menyerupai kepulan abu/kabut tipis yang terbawa angin pada tombol aplikasi, kartu menu yang bisa diklik, serta sentuhan ringan pada menu navigasi samping.
   - Tampilan dirancang serasi dengan tema bawaan **Cursor Dark** (hitam arang modern dengan aksen biru), sekaligus menyesuaikan warna kabut secara otomatis agar tetap bersih dan tulisannya tajam terbaca di **Mossy Stone** (hijau teduh) dan **Langit Pagi** (biru terang).
   - Perubahan murni di sisi tampilan antarmuka (tidak ada perubahan tabel database maupun aturan cuti).

2. **Perilaku Animasi pada 4 Kondisi (Opsi A: Elegan Halus):**
   - **Kondisi 1 — Disentuh Kursor (*Hover*, Khusus Perangkat Berkursor):**
     - Lapisan kabut abu tipis perlahan muncul (*fade-in* ~**260 ms**) sambil mengalir lembut menyerong dari kiri-bawah ke kanan-atas seolah tersapu embusan angin halus, disertai pendar tepi lembut pada tombol utama dan kartu.
     - Semua aturan `:hover` wajib dibungkus di dalam `@media (hover: hover) and (pointer: fine)` (aturan agar hover hanya jalan di laptop/PC berkursor) supaya **tidak nyangkut** saat disentuh jari di layar HP.
   - **Kondisi 2 — Ditekan (*Click / Tap* Singkat):**
     - Merespons cepat (~**90–120 ms**): kabut berdenyut menyebar tipis ke arah tepi sambil memberikan rasa tombol tertekan mikro (`translate-y-px` / penyusutan sangat halus), sedangkan tombol pembuka dropdown/popover (`aria-haspopup`) tetap tenang tanpa melompat.
   - **Kondisi 3 — Ditahan (*Hold* / Tekan Lama):**
     - Selama tombol masih ditahan (`:active` berlanjut), lapisan kabut tidak berhenti kaku, melainkan terus hanyut dan "bernapas" pelan secara berulang (~**1,8–2,2 detik** per putaran lembut) sebagai tanda tombol masih aktif ditekan.
     - Tombol yang nonaktif (`disabled` atau `aria-disabled="true"`) tidak bereaksi sama sekali.
   - **Kondisi 4 — Kursor Pergi (*Leave / Fade-Out* Lambat):**
     - Ciri khas utama nuansa "abu terbawa angin": saat kursor menjauh dari tombol, efek kabut tidak padam mendadak, melainkan **memudar perlahan dan tetap hanyut menjauh** dalam durasi lebih lama (~**550–650 ms**, melambat halus di akhir gerakan).
     - Teknik implementasinya cukup memakai dua kecepatan transisi murni CSS pada lapisan kabut (kecepatan dasar lambat **~600 ms** untuk memudar pergi, dan dipersingkat menjadi **~260 ms** saat `:hover` masuk) tanpa *timer* JavaScript, sehingga tetap mulus meski kursor digerakkan bolak-balik dengan cepat.

3. **Pembagian Kelas Tombol (Efek Penuh vs Super Ringan vs Dikecualikan):**
   - **Efek Penuh ("Opsi A: Elegan Halus"):**
     - **Tombol Aplikasi Berkotak (`components/ui/button.tsx`):** Varian `default`, `penting` (aksen emas Kalsel), `outline`, `secondary`, dan `destructive` pada ukuran teks (`xs`, `sm`, `default`, `lg`), seperti tombol *Ajukan cuti*, *Simpan*, *Masuk*, *Setujui/Tolak*, dan *Cetak / Simpan PDF*.
     - **Tombol Kartu yang Bisa Diklik (`.kartu-abu`):** Kartu menu di halaman Admin (`app/(aplikasi)/admin/page.tsx`) dan kartu folder di Dokumen Organisasi (`app/(aplikasi)/dokumen/organisasi/page.tsx`). *Catatan:* Kartu biasa yang hanya berisi form atau tabel tidak diberi efek ini agar pegawai tidak terkecoh mengira kartu tersebut bisa diklik.
     - **Penyesuaian Warna Kabut per 3 Tema (`app/globals.css`):** Menggunakan variabel CSS tema (`--abu-kabut`, `--abu-aksen`): arang perak bersemu biru lembut di **Cursor Dark**, kabut sage/lumut lembut di **Mossy Stone**, serta embun biru muda / kilau putih halus di **Langit Pagi** agar tidak tampak kotor di tema terang.
   - **Efek Super Ringan (Minimalis untuk Area Padat & Navigasi):**
     - **Tombol Ikon Kecil & Varian `ghost` (`Button` dengan `size="icon" | "icon-xs" | "icon-sm" | "icon-lg"` atau `variant="ghost"`):** Seperti ikon lihat/unduh di daftar dokumen, ikon pensil ubah saldo per baris pegawai di tabel rekap, tombol tutup dialog, dan tombol menu HP. Hanya memunculkan pendar kabut bundar tipis yang memudar cepat (~**350–400 ms**) tanpa sapuan menyamping yang ramai, supaya daftar atau tabel panjang tetap nyaman dipandang.
     - **Menu Navigasi Samping (`components/tata-letak/navigasi.tsx`, kelas `.nav-abu`):** Sentuhan ringan sapuan halus dan *fade-out* lembut (~**400 ms**) saat disentuh kursor di desktop; item menu yang sedang aktif (`aria-current="page"`) tetap mempertahankan warna utama solid (`bg-primary text-primary-foreground`) agar posisi halaman tetap tegas terbaca.
   - **Dikecualikan (Bebas Efek Kabut):**
     - `Button` varian `link` (tetap tampil sebagai tautan teks biasa dengan garis bawah saat disentuh), semua tombol `disabled`/`aria-disabled`, seluruh isi lembar cetak A4/Legal (`.lembar-cetak` & `@media print`), serta pengguna yang mengaktifkan mode kurangi gerakan (`prefers-reduced-motion: reduce`).

4. **Hal Wajib Dijaga / Pencegahan Bug (Checklist dari Debugger/QA):**
   - **Aman untuk `Button` Mode Pembungkus Link (`asChild` + `Slot.Root` Radix UI):** *Dilarang keras* menambahkan tag HTML/JSX anak baru (seperti `<span ... />`) di dalam komponen `Button` (`components/ui/button.tsx`). Seluruh lapisan kabut abu **wajib** memakai lapisan semu bawaan CSS (`::before` dan `::after`) langsung pada `[data-slot="button"]`, sehingga komponen yang membungkus link atau trigger dialog (`<Button asChild><Link .../></Button>`, `<AlertDialogAction>`, dsb.) tetap memiliki tepat 1 elemen anak dan tidak pernah error.
   - **Tidak Menghalangi Klik & Tulisan Tetap Tajam di 3 Tema:** Kedua lapisan semu (`::before` dan `::after`) wajib memakai `pointer-events: none` agar klik tidak terhalang, serta diletakkan di belakang teks lewat `z-index: -1` di dalam wadah `position: relative; isolation: isolate; overflow: hidden;` (pembatas tumpukan lapisan agar kabut berada di atas warna latar tombol, tetapi persis di belakang teks dan ikon SVG).
   - **Ramah HP:** Efek `:hover` dibungkus `@media (hover: hover) and (pointer: fine)` agar sentuhan jari di HP tidak pernah nyangkut.
   - **Hormat pada Mode Kurangi Animasi (`prefers-reduced-motion: reduce`):** Matikan pergeseran gerak (*keyframes* hanyut/bernapas) dan durasi *fade-out* panjang saat pengaturan ini aktif; pertahankan perubahan warna diam yang aman.
   - **Steril di Lembar Cetak (`.lembar-cetak` & `@media print`):** Paksa mematikan `::before`, `::after`, animasi, dan transisi pada seluruh elemen di dalam `.lembar-cetak` maupun saat mencetak agar formulir BKN A4, surat cuti, dan hasil PDF Gotenberg tetap putih bersih dengan teks hitam pekat.

5. **Daftar File Target (untuk Coder & UI/UX Stylist):**
   1. **`app/globals.css`** *(Coder & UI/UX Stylist)*:
      - Tambah token variabel kabut abu untuk `:root` (Langit Pagi), `html[data-tema="cursor-dark"]`, dan `html[data-tema="mossy-stone"]`.
      - Tambah `@keyframes` gerak abu terbawa angin dan napas pelan saat ditahan (hanya menggerakkan `transform` & `opacity` agar ringan di perangkat).
      - Tambah aturan CSS untuk `[data-slot="button"]` (memilah efek penuh vs super ringan berdasarkan atribut `data-size` dan `data-variant` yang sudah ada, serta mengecualikan `data-variant="link"`), kelas `.kartu-abu`, kelas `.nav-abu`, proteksi `@media (hover: hover)`, `@media (prefers-reduced-motion: reduce)`, dan pengecualian `.lembar-cetak` / `@media print`.
   2. **`components/ui/button.tsx`** *(Coder)*:
      - Tambah `relative isolate overflow-hidden` pada kelas dasar `buttonVariants` untuk varian berkotak (serta pastikan varian `link` memakai `overflow-visible` agar tampilan link teks tidak terpotong).
      - Pastikan `transition` di `buttonVariants` tidak mengganggu kecepatan *fade-out* lambat pada `::before`/`::after`, dan **jangan menambah elemen anak baru** di dalam JSX agar `Slot.Root` (`asChild`) tetap 100% aman.
   3. **`components/tata-letak/navigasi.tsx`** *(Coder & UI/UX Stylist)*:
      - Tambahkan kelas `.nav-abu` pada komponen `<Link>` menu di `DaftarMenu` (`SidebarDesktop` & `MenuSeluler`) dengan menjaga kontras teks di 3 tema dan keterbacaan item menu yang sedang aktif.
   4. **`app/(aplikasi)/admin/page.tsx` & `app/(aplikasi)/dokumen/organisasi/page.tsx`** *(Coder / UI/UX Stylist — Tombol Kartu)*:
      - Tambahkan kelas `.kartu-abu` pada `<Card>` di dalam `<Link>` kartu menu Admin dan kartu folder Dokumen Organisasi agar tombol kartu ikut mendapat efek penuh Opsi A.
      - *(Opsional polesan UI/UX Stylist)*: Tambahkan kelas sentuhan super ringan pada tombol ikon bilah atas (`components/tata-letak/tombol-tema.tsx`, ikon notifikasi `app/(aplikasi)/layout.tsx`, pemicu `components/tata-letak/menu-pengguna.tsx`) bila ingin sensasi bilah atas ikut selaras.

### G. Sinkronisasi Angka V. Catatan Cuti Persis Sesuai Hak 2024, Hak 2025, Hak 2026
1. **Akar Masalah:**
   - Sebelumnya, pada `server/formulir/bawaan.ts` dan `server/aksi/cuti.ts`, sistem secara otomatis mengurangkan riwayat cuti lampau (`saldo.terpakai`) menggunakan fungsi `rincianPemakaian(saldo)` (`saldo.sisaN2 - pakai.dariN2`, dst.) sebelum formulir dibuka.
   - Akibatnya, pada pegawai seperti Fahriansyah yang memiliki `Hak 2024: 4` dan `Hak 2025: 5`, karena ada riwayat cuti lampau terpakai 6 hari, sistem langsung menghabiskan kuota 2024 (menjadi 0 / blank) dan sebagian kuota 2025 sebelum pegawai mengajukan cuti baru.
   - Hal ini membuat pegawai dan Admin bingung karena angka pada formulir tidak cocok dengan angka `Hak 2024 (4)`, `Hak 2025 (5)`, dan `Hak 2026 (12)` yang tertera di menu *Saldo & Rekap Cuti*.

2. **Solusi & Perubahan Logika:**
   - Pada `server/formulir/bawaan.ts`:
     - Nilai awal `catatanTahunan` harus langsung mengambil nilai murni dari saldo cuti:
       - Baris 2024 $\rightarrow$ `saldo ? angka(saldo.sisaN2) : ""` (contoh Fahriansyah: 4).
       - Baris 2025 $\rightarrow$ `saldo ? angka(saldo.sisaN1) : ""` (contoh Fahriansyah: 5).
       - Baris 2026 $\rightarrow$ `saldo ? angka(saldo.hakTahunIni + saldo.penyesuaian) : ""` (contoh Fahriansyah: 12).
       - Jika bernilai $\le 0$, tetap mengembalikan string kosong `""` (blank space).
     - Hapus pengurangan `pakai.dariN2` dan `pakai.dariN1` dari nilai awal formulir agar angka di formulir persis sama dengan tabel `/cuti/saldo`.
   - Pada `components/cuti/form-formulir.tsx`:
     - Basis perhitungan `catatanAwal` menggunakan nilai murni `Hak 2024 (saldo.sisaN2)`, `Hak 2025 (saldo.sisaN1)`, dan `Hak 2026 (saldo.hakTahunIni + penyesuaian)`.
     - Saat memilih tanggal cuti tahunan, simulasi pengurangan baru berjalan dari angka basis tersebut.
   - Pada `server/aksi/cuti.ts`:
     - Sinkronkan logika penyimpanan formulir agar `sisaN2 = saldo ? saldo.sisaN2 : 0`, `sisaN1 = saldo ? saldo.sisaN1 : 0`, dan `sisaN = saldo ? saldo.hakTahunIni + saldo.penyesuaian : 0`.
3. **Instruksi Deployment:**
   - Jalankan `npm run typecheck` dan `npm test`.
   - Lakukan commit dan `git push origin main` agar Vercel otomatis mendeploy versi terbaru ke `https://cuti-esdm.vercel.app`.

### F. Penyesuaian Label Kolom Saldo & Blank Space Sisa Saldo 0
1. **Penyesuaian Header Kolom Saldo & Rekap Cuti (`app/(aplikasi)/cuti/saldo/page.tsx`):**
   - Kolom `N-2 (${tahun - 2})` diubah menjadi `Hak ${tahun - 2}` (misal: "Hak 2024").
   - Kolom `N-1 (${tahun - 1})` diubah menjadi `Hak ${tahun - 1}` (misal: "Hak 2025").
   - Menyelaraskan dengan kolom ketiga yang sudah bernama `Hak ${tahun}` (misal: "Hak 2026").
   - Pada modal edit saldo (`components/cuti/kelola-saldo.tsx`), sesuaikan label bidang `Sisa N-1` dan `Sisa N-2` agar konsisten (`Hak ${tahun - 1}` dan `Hak ${tahun - 2}`).

2. **Otomatisasi Sisa Cuti & Blank Space Nilai 0 pada Bagian V. Catatan Cuti:**
   - Sisa cuti tahunan (baris tahun 2024, 2025, 2026) diisi dan dihitung otomatis berdasarkan sisa saldo riil pegawai di database.
   - **Aturan Nilai 0:** Jika saldo untuk tahun tersebut adalah 0 (atau sudah habis terpakai), kolom `Sisa` **wajib kosong / blank space (`""`)**, TANPA garis tanda hubung strip (`---` atau `-`). Angka hanya muncul jika saldo > 0.
   - Input `Tahun` dan `Sisa` tetap terkunci (`readOnly`) sehingga pegawai mengetahui sisa cutinya dengan pasti tanpa bisa memanipulasinya.
   - Target fungsi pemformatan:
     - `server/formulir/bawaan.ts`: Ubah helper `const angka = (n: number) => (n > 0 ? String(n) : "");` (sebelumnya mengembalikan `"---"`).
     - `components/cuti/form-formulir.tsx`: Ubah `const formatSisa = (n: number) => (n > 0 ? String(n) : "");` (sebelumnya mengembalikan `"---"`).
     - `server/aksi/cuti.ts`: Pastikan fungsi `formatSisa` saat validasi dan penyimpanan mengembalikan `""` saat nilai <= 0.

### E. Otomatisasi & Penguncian Sisa Cuti Tahunan (Bagian V. Catatan Cuti)
1. **Latar Belakang & Kebutuhan:**
   - Pada form pengajuan cuti (`/cuti/ajukan` dan `/cuti/[id]/formulir`), bagian *V. Catatan Cuti* (Tabel Cuti Tahunan N-2, N-1, N) sebelumnya dapat diedit bebas oleh pemohon, sehingga berisiko dimanipulasi secara manual.
   - Kebutuhan baru:
     - Kolom `Tahun` dan kolom `Sisa` pada tabel *V. Catatan Cuti* harus **terisi otomatis dari database saldo cuti** pegawai yang bersangkutan.
     - Saat pegawai memilih tanggal cuti (jika jenis cutinya memotong saldo tahunan / Cuti Tahunan), kolom `Sisa` harus **otomatis berkurang secara reaktif** di antarmuka & pratinjau formulir sesuai jumlah hari kerja yang diajukan (memotong berurutan mulai dari N-2, lalu N-1, lalu N).
     - Kolom `Tahun` dan `Sisa` **wajib dikunci (`readOnly` / `disabled`)** agar tidak bisa diubah oleh pegawai. Hanya kolom `Keterangan` yang dapat diisi opsional.
     - Di sisi backend (`server/aksi/cuti.ts`), nilai `catatanTahunan` divalidasi dan dihitung ulang secara independen dari database untuk mencegah manipulasi client-side.
2. **Target File yang Diubah:**
   - `components/cuti/form-formulir.tsx`: Tambahkan state reaktif sisa cuti yang otomatis berkurang saat tanggal/lamanya cuti berubah, kunci input `Tahun` dan `Sisa` dengan `readOnly` + styling disabled (`bg-slate-100 cursor-not-allowed select-none`), perbarui teks keterangan panduan.
   - `server/aksi/cuti.ts`: Pastikan pada `simpanFormulir`, nilai sisa catatan cuti tahunan disinkronkan dengan data saldo riil di database.

### A. Ringkasan Fitur
Sistem hak akses modular berbasis centang (checkbox) yang dapat dikelola oleh Admin untuk setiap pegawai yang memiliki akun, mencakup 5 hak akses:
1. `KELOLA_SALDO_CUTI`: Akses menu & fitur Saldo & Rekap Cuti (`/cuti/saldo`, `/cuti/rekap`, penyesuaian saldo, tutup tahun, ekspor rekap).
2. `PROSES_CUTI`: Akses menu & aksi Proses Cuti (`/cuti/proses`, verifikasi pengajuan, persetujuan staf/pejabat, surat cuti).
3. `KELOLA_PEGAWAI`: Akses menu & manajemen Data Pegawai (`/pegawai`, tambah, ubah, unmask data sensitif, impor/ekspor Excel).
4. `KELOLA_DOKUMEN_ORGANISASI`: Akses penuh kelola folder dan dokumen organisasi dinas (`/dokumen/organisasi`, tambah/unggah, hapus).
5. `PENGATURAN_ADMIN`: Akses menu sistem Admin (`/admin`, master data, template surat, hari libur, audit log).

#### ⚠️ Hak Akses Mutlak & Proteksi Superadmin (Akun "Admin")
- **Hak Akses Mutlak (Absolute Clearance / Bypass)**: Akun dengan peran `ADMIN` (khususnya akun utama `loginId: "admin"`) secara otomatis memiliki SELURUH hak akses di atas secara permanen dan mutlak. Seluruh pengecekan otorisasi (`punyaHakAkses`, `wajibHakAkses`, `hakFolder`, dsb.) langsung mengembalikan `true`.
- **Proteksi Anti-Lockout**:
  - Akun Admin/Superadmin tidak dapat dicabut hak adminnya, tidak dapat dikurangi hak aksesnya, dan tidak dapat dinonaktifkan.
  - Pada tampilan UI (Tab Akun Pegawai & Halaman Matriks Hak Akses), akun `ADMIN`/`admin` menampilkan semua centang dalam kondisi aktif permanen (`checked` & `disabled`) disertai badge penanda **"Superadmin (Hak Akses Mutlak)"**.
  - Hanya pengguna dengan Hak Akses Mutlak (Admin) yang berwenang mencentang dan mencabut hak akses bagi pegawai-pegawai lainnya.

### B. Skema Database (`prisma/schema.prisma`) — *Sudah Dimigrasi ke Schema*
- **Enum `HakAkses`**:
  `KELOLA_SALDO_CUTI`, `PROSES_CUTI`, `KELOLA_PEGAWAI`, `KELOLA_DOKUMEN_ORGANISASI`, `PENGATURAN_ADMIN`
- **Tabel `user_hak_akses` (`model UserHakAkses`)**:
  - `userId` (`user_id`, UUID, FK ke `users.id`, onDelete: Cascade)
  - `hakAkses` (`hak_akses`, Enum `HakAkses`)
  - Primary Key: `@@id([userId, hakAkses])`
- **Relasi `User`**:
  `hakAkses UserHakAkses[]`

### C. Alur Otorisasi & Server Logic
1. **Sesi & User DAL (`server/auth/sesi.ts`, `server/auth/pengguna.ts`)**:
   - `bacaSesi()` meng-include `hakAkses: true`.
   - `penggunaSaatIni()` memuat `hakAkses: ReadonlySet<HakAkses>`.
   - **Hak Akses Mutlak Superadmin**: Jika `u.peran.has("ADMIN")` atau `u.loginId.toLowerCase() === "admin"`, set `hakAkses` otomatis diinjeksi **SELURUH** enum `HakAkses`.
   - *Backward Compatibility*: Jika akun memiliki peran legacy `KEPEGAWAIAN`, inject `KELOLA_SALDO_CUTI`, `PROSES_CUTI`, dan `KELOLA_PEGAWAI`.
   - Helper Otorisasi Mutlak:
     - `punyaHakAkses(u: PenggunaSaatIni, ...hak: HakAkses[]): boolean`: Jika `u.peran.has("ADMIN") || u.loginId.toLowerCase() === "admin"` -> **selalu `true`**. Selain itu, periksa apakah salah satu `hak` ada di `u.hakAkses`.
     - `wajibHakAkses(...hak: HakAkses[]): Promise<PenggunaSaatIni>`: Panggil `wajibLogin()`, jika tidak `punyaHakAkses`, redirect ke `/akses-ditolak`.
2. **Server Action Akun (`server/aksi/akun.ts`)**:
   - `aturHakAkses(userId: string, hakAkses: HakAkses[]): Promise<HasilAkun>`
   - Wajib otorisasi Admin (`wajibAdmin()`).
   - **Proteksi Superadmin**: Tolak pencabutan hak dari akun "admin" / akun ber-peran `ADMIN`.
   - Eksekusi transaksi DB: `deleteMany` lalu `createMany` di `UserHakAkses`.
   - Catat `audit_log` (`aksi: "UBAH_HAK_AKSES"`).
   - Revalidasi path terkait (`/pegawai/[id]`, `/admin/hak-akses`).
3. **Menu Dinamis (`lib/menu.ts`)**:
   - Perbarui evaluasi `menuUntuk(peran, hakAkses)` agar menu ditampilkan sesuai hak akses aktif pengguna (Admin otomatis melihat semua menu).

### D. Target File & Komponen yang Harus Dikerjakan Coder
1. **`lib/hak-akses.ts`** *(Baru)*: Definisi konstanta daftar hak akses, label Bahasa Indonesia, dan deskripsi fungsinya.
2. **`server/auth/sesi.ts`** *(Ubah)*: Tambah `hakAkses: true` pada include relasi user sesi.
3. **`server/auth/pengguna.ts`** *(Ubah)*: Implementasi `hakAkses` pada `PenggunaSaatIni`, fungsi `punyaHakAkses` dan `wajibHakAkses`.
4. **`server/aksi/akun.ts`** *(Ubah)*: Tambah Server Action `aturHakAkses` dengan skema Zod dan audit log.
5. **`lib/menu.ts`** *(Ubah)*: Hubungkan `MENU` dengan hak akses dan sesuaikan fungsi filter menu.
6. **`app/(aplikasi)/layout.tsx`** *(Ubah)*: Teruskan `u.hakAkses` ke pemanggilan `menuUntuk(...)`.
7. **`components/pegawai/akun-pegawai.tsx`** *(Ubah)*: Ganti bagian "Peran tambahan" dengan 5 checkbox interaktif "Hak Akses Pegawai" + tombol simpan/feedback toast.
8. **`app/(aplikasi)/admin/hak-akses/page.tsx`** *(Baru)*: Halaman matriks daftar pegawai berakun dengan 5 kolom checkbox centang instan untuk kemudahan Admin.
9. **`app/(aplikasi)/admin/page.tsx`** *(Ubah)*: Tambahkan kartu/menu navigasi ke halaman `Hak Akses Pegawai`.
10. **Proteksi Halaman & Action Terkait** *(Ubah)*:
    - `app/(aplikasi)/cuti/saldo/page.tsx` -> `wajibHakAkses("KELOLA_SALDO_CUTI")`
    - `app/(aplikasi)/cuti/proses/page.tsx` -> `punyaHakAkses(u, "PROSES_CUTI") || punyaPeran(u, "ATASAN")`
    - `app/(aplikasi)/pegawai/page.tsx` -> `wajibHakAkses("KELOLA_PEGAWAI")`
    - `app/(aplikasi)/admin/**` -> `wajibHakAkses("PENGATURAN_ADMIN")`
    - `server/layanan/akses-dokumen.ts` -> berikan izin kelola dokumen organisasi jika memiliki `KELOLA_DOKUMEN_ORGANISASI`.

## 2. Catatan Perubahan Logika (Diisi oleh Conversation 1 - Coder)
*Daftar file yang baru dibuat/diubah dan ringkasan logika backend/sistemnya:*

### File Baru
- `prisma/migrations/20261125130000_dokumen_berkas/migration.sql`: Migrasi SQL resmi tabel baru `dokumen_berkas` (`dokumen_id` UUID PK/FK cascade ke `dokumen`, kolom `data` BYTEA, `dibuat_pada` TIMESTAMPTZ) — sudah diuji & diterapkan pada database dev lokal Docker (**belum** dijalankan ke database produksi Neon).
- `vercel.json`: Jadwal harian otomatis Vercel Cron ke `/api/tugas/harian` pada `"0 17 * * *"` (= pukul **01:00 WITA** setiap hari, sesuai batas gratis Vercel Hobby).
- `lib/excel.ts`: Helper `buatNamaSheetUnik()` untuk menjamin nama tab Excel hasil ekspor rekap maksimal 31 karakter, bersih dari simbol terlarang, dan tidak pernah bentrok jika ada 2 unit kerja berawalan sama.
- `tests/unit/dokumen-cron.test.ts`: Unit test Vitest untuk penyimpanan berkas permanen `dokumen_berkas` (enkripsi AES-256-GCM, batas 4 MB Vercel vs 10 MB lokal, galat `BERKAS_KUNCI`, respons 404 ramah tanpa audit palsu, respons 403 saat `wajibGantiPassword`, cetak gabungan `GalatGabung`) dan endpoint cron `GET` (`CRON_SECRET`) / `POST` (`TUGAS_TOKEN`) / `401`.
- `tests/unit/keamanan-cuti-qa.test.ts`: Unit test Vitest untuk isolasi ketat hak akses modular Gelombang 1, privasi `pratinjauCuti`, validasi UUID, `SALDO_KURANG`, penanganan `BERUBAH` di `tolakCuti`/`batalkanCuti`, pencegahan riwayat ganda `selesaikanCutiLewat`, impor saldo NIP ganda & tahun tak valid, nama sheet Excel unik, dan pencegahan induk unit melingkar (`simpanUnit` & `unitDaftarHadir`).
- `components/auth/form-putuskan-google.tsx`: Form khusus untuk memutus tautan Google di halaman Profil dengan syarat wajib sudah punya password dan memasukkan konfirmasi password, supaya pegawai tidak terkunci sendiri.
- `tests/unit/auth-keamanan.test.ts`: Pengujian unit keamanan alur Daftar dengan Google, Lupa Password Google, Pembuatan Password Awal, Putuskan Google, anti-penimpaan Google / pengikatan sesi OAuth, dan anti-reset password Superadmin memakai akun dummy (`pegawai.google.dummy@gmail.com` / `pegawai.aktivasi.dummy@gmail.com`).
- `scripts/impor-saldo-2026.ts`: Skrip CLI untuk membaca `data-impor/saldo-cuti-2026.csv` (91 baris pegawai), mencocokkan pegawai berdasarkan NIP tanpa spasi (dengan fallback nama), menghitung `sisaN1` dan `sisaN2` (maks 6 hari/tahun sesuai PP 11/2017 dari `totalSisaBerlaku - sisa2026`), melakukan `upsert` ke tabel `saldo_cuti` tahun `2026`, dan mencatat entri `mutasi_saldo_cuti` (`jenis: "SALDO_AWAL"`, `jumlah: hakTahunIni + sisaN1 + sisaN2 - terpakai`).
  - **Hasil Eksekusi ke DB Produksi Neon (`.env.vercel`)**:
    - **Berhasil**: **89 pegawai** (seluruh 89 ASN ber-NIP di database berhasil tersinkronisasi saldo cuti 2026 dan mutasi saldo awalnya).
    - **Belum ditemukan di tabel `pegawai` (2 baris tanpa NIP)**:
      - Baris 22: `Mahdiani` (NIP kosong di CSV, belum terdaftar di tabel `pegawai`).
      - Baris 69: `Rosriadi, S.Sos` (NIP kosong di CSV, belum terdaftar di tabel `pegawai`).
- `lib/hak-akses.ts`: Definisi konstanta `DAFTAR_HAK_AKSES`, `SEMUA_HAK_AKSES`, `LABEL_HAK_AKSES`, `DESKRIPSI_HAK_AKSES`, dan `HAK_AKSES_BAWAAN_KEPEGAWAIAN` untuk 5 hak akses granular (`KELOLA_SALDO_CUTI`, `PROSES_CUTI`, `KELOLA_PEGAWAI`, `KELOLA_DOKUMEN_ORGANISASI`, `PENGATURAN_ADMIN`).
- `components/admin/matriks-hak-akses.tsx`: Komponen client tabel matriks interaktif daftar pegawai berakun dengan 5 kolom checkbox centang instan (optimistic state + panggilan server action `aturHakAkses` + notifikasi toast Sonner + pencarian nama/NIP/login).
- `app/(aplikasi)/admin/hak-akses/page.tsx`: Halaman Admin `/admin/hak-akses` untuk melihat dan mengelola matriks hak akses seluruh pegawai berakun sekaligus.
- `tests/unit/hak-akses.test.ts`: Unit test Vitest untuk konstanta hak akses dan penyaringan menu navigasi `menuUntuk(peran, hakAkses)`.

### File Diubah (Penyimpanan Berkas Permanen, Jadwal Harian Vercel, & Perbaikan Audit QA Gelombang 1–4 — `2026-11-25`)
- **Penyimpanan Berkas Permanen (Bagian I.1):**
  - `prisma/schema.prisma`: Menambahkan model `DokumenBerkas` (`dokumen_berkas`) relasi 1-ke-1 dengan `Dokumen` (`onDelete: Cascade`).
  - `server/dokumen/penyimpanan.ts`: Menambah mode penyimpanan `PENYIMPANAN_DOKUMEN` (`db` bawaan, `disk` opsional), memisahkan `siapkanBerkas()` (validasi kunci + hash + enkripsi AES-256-GCM) dari `simpanIsiBerkas()` agar penulisan metadata & isi berkas atomik dalam 1 transaksi, urutan baca `dokumen_berkas` → fallback `STORAGE_DIR`, serta kelas galat `GalatBerkasTidakDitemukan` & `GalatKonfigurasiBerkas`.
  - `lib/dokumen.ts`, `lib/pengaturan.ts`, & `server/pengaturan.ts`: Menambah helper `batasUkuranDokumenMb()` & `maksUkuranDokumenMb()` yang menjaga batas unggah jujur maks. **4 MB di Vercel** (`VERCEL=1`) dan hingga **10 MB di lokal/Docker**.
  - `server/aksi/dokumen.ts` & `server/aksi/cuti.ts` (`catatKeputusanEksternal`): Menyimpan metadata `Dokumen` dan isi `DokumenBerkas` serentak dalam 1 transaksi, memakai batas ukuran dinamis, dan menangani `GalatKonfigurasiBerkas` dengan pesan ramah.
  - `app/api/dokumen/[id]/berkas/route.ts` & `server/dokumen/gabung.ts`: Meneruskan `id` dokumen ke `bacaBerkas()`, menangkap `GalatBerkasTidakDitemukan` menjadi HTTP **404** ramah (tanpa mencatat audit unduh palsu) atau `GalatGabung` (**422**) saat cetak gabungan.
  - `components/dokumen/form-unggah.tsx`, `components/cuti/aksi-pengajuan.tsx`, `app/(aplikasi)/dokumen/page.tsx`, `app/(aplikasi)/dokumen/organisasi/page.tsx`, & `app/(aplikasi)/cuti/[id]/page.tsx`: Menampilkan batas MB aktual sesuai lingkungan dan mengecek ukuran berkas langsung di browser sebelum diunggah.
- **Jadwal Harian Otomatis (Bagian I.2):**
  - `app/api/tugas/harian/route.ts` & `.env.example`: Mendukung metode `GET` (`CRON_SECRET`) untuk Vercel Cron sekaligus `POST` (`TUGAS_TOKEN`) untuk Docker/lokal dengan perbandingan aman `timingSafeEqual`, serta mendokumentasikan `PENYIMPANAN_DOKUMEN` dan `CRON_SECRET`.
  - `server/layanan/cuti.ts`: Memperbaiki `selesaikanCutiLewat()` menjadi transaksi interaktif yang memeriksa `updateMany.count > 0` terlebih dahulu agar tidak pernah menulis riwayat status ganda.
- **Perbaikan Keamanan & Logika Gelombang 1 (Hak Akses Modular & Anti-Nonaktif Superadmin):**
  - `server/aksi/akun.ts`: Mengunci `aturHakAkses()` & `aturPeran()` khusus Superadmin (`adalahSuperadmin`), membersihkan peran lama `ADMIN` & `KEPEGAWAIAN` di `user_peran` setiap kali hak akses disimpan, dan membatasi `resetPassword()`/`bukaKunci()`/`aturAktifAkun()` agar pemegang `PENGATURAN_ADMIN` hanya bisa membantu akun pegawai biasa (tidak bisa menindak Superadmin atau sesama Admin).
  - `lib/menu.ts`, `server/layanan/akses-dokumen.ts`, `server/layanan/akses-cuti.ts`, `server/layanan/wewenang-cuti.ts`, `server/aksi/admin.ts`, `server/aksi/cuti.ts`, `server/aksi/dokumen.ts`, `server/aksi/folder.ts`, `server/aksi/impor-pegawai.ts`, `server/aksi/master.ts`, `server/aksi/pegawai.ts`, `server/aksi/saldo.ts`, `server/aksi/surat-admin.ts`, `server/kueri/beranda.ts`, `server/kueri/grup-pegawai.ts`, `server/kueri/lingkup-rekap.ts`, `server/kueri/pegawai-detail.ts`, halaman terkait & rute cetak/API: Menjadikan `punyaHakAkses()` satu-satunya acuan izin modul (menghapus seluruh sisa bypass peran lama `ADMIN`/`KEPEGAWAIAN`), memisahkan `bolehLihatDataSensitif()` khusus pemilik & `KELOLA_PEGAWAI`/Superadmin, mengunci mode edit hak akses khusus Superadmin di `app/(aplikasi)/admin/hak-akses/page.tsx` & `app/(aplikasi)/pegawai/[id]/page.tsx` (`components/pegawai/akun-pegawai.tsx`, `components/pegawai/data-sensitif.tsx`), serta mencegah penonaktifan akun Superadmin via `simpanPegawai()` & `simpanImporPegawai()` (`server/layanan/impor-pegawai.ts`).
- **Perbaikan Gelombang 2 (Privasi, Integritas Transaksi, & Rentang Tanggal):**
  - `server/aksi/cuti.ts` & `server/layanan/cuti.ts`: Menutup kebocoran `pratinjauCuti` dengan cek kepemilikan `kecualiId`, validasi UUID `id` di `simpanFormulir`, memasang kunci antrean `pg_advisory_xact_lock(hashtext(pegawaiId))` di `simpanFormulir`/`setujuiCuti`/`tolakCuti`/`batalkanCuti`/`catatKeputusanEksternal`, memakai `updateMany` bersyarat `status: "DIAJUKAN"` saat ubah formulir, cek ulang `saldoTersedia(saldo) < p.jumlahHari` (`SALDO_KURANG`) di `terapkanPersetujuan`, serta menangkap `"BERUBAH"` menjadi pesan ramah di `tolakCuti` & `batalkanCuti`.
  - `lib/domain/hari-kerja.ts` & `server/layanan/cuti.ts`: Menambah `cekRentangTanggalCuti()` (tahun `2000–2100`, maks. `1.100` hari kalender) sebelum query libur dan mengubah `hitungHariKerja()` ke putaran `O(1)` memori tanpa alokasi array tanggal.
- **Perbaikan Gelombang 3 (Notifikasi, Impor/Ekspor Saldo, Unit, & Nomor Surat):**
  - `server/notifikasi.ts`, `server/layanan/wewenang-cuti.ts`, & `server/aksi/cuti.ts`: Menambah `userDenganHakAkses()` dan memakainya pada notifikasi tahap proses & pembatalan cuti agar pemegang centang `PROSES_CUTI` selalu menerima pemberitahuan.
  - `server/aksi/saldo.ts` & `app/api/ekspor/rekap-cuti/route.ts`: Menambah validasi tahun (`2020–2100`) & tolak NIP ganda (menyebut kedua nomor baris) pada `imporSaldo`, serta memakai `buatNamaSheetUnik()` pada ekspor rekap.
  - `server/aksi/master.ts`, `server/layanan/cuti.ts`, `lib/domain/daftar-hadir.ts`, & `server/aksi/surat.ts`: Mencegah rantai induk unit melingkar di `simpanUnit()`, menambah proteksi `Set` anti-loop di `snapshotIdentitas()` & `unitDaftarHadir()`, serta memasang kunci antrean per tahun `surat_nomor_<tahun>` saat penomoran surat otomatis di `simpanSurat()`.
- **Perbaikan Gelombang 4 (API `wajibGantiPassword`, Matriks Hak Akses, & `generateViewport`):**
  - `app/api/auth/google/route.ts`, `app/api/auth/google/callback/route.ts`, `app/api/dokumen/[id]/berkas/route.ts`, `app/api/dokumen/cetak-gabungan/route.ts`, `app/api/surat/[versiId]/pdf/route.ts`, `app/api/ekspor/pegawai/route.ts`, `app/api/ekspor/rekap-cuti/route.ts`, `app/api/cuti/template-saldo/route.ts`, `app/api/pegawai/impor/route.ts`, & `app/api/pegawai/template/route.ts`: Menolak akses saat `u.wajibGantiPassword === true` (redirect `/profil?wajib=1` untuk tautkan Google, HTTP `403` ramah untuk API berkas/ekspor/impor/PDF; foto profil tetap terbuka agar avatar tampil).
  - `lib/hak-akses.ts` & `components/admin/matriks-hak-akses.tsx`: Menambah `inisialMatriks()` (menghasilkan `ES` untuk `eerza311 (Superadmin)`) dan memperbarui state `adalahAdmin` seketika saat centang `PENGATURAN_ADMIN` berubah.
  - `app/layout.tsx`: Mengubah `viewport` statis menjadi `generateViewport()` dinamis yang membaca cookie tema untuk menyelaraskan `themeColor` bilah browser HP sejak halaman Login.
- **Polesan Pasca-QA (`2026-11-25`):**
  - `app/(aplikasi)/pegawai/page.tsx`: Membungkus seluruh deret tombol aksi kanan atas (**Ekspor Excel**, **Ekspor + data pribadi**, **Cetak / PDF**, **Impor Excel**, dan **Tambah pegawai**) di dalam `{kepegawaian && (...)}` agar tidak tampil sebagai tombol buntu bagi akun yang hanya memiliki centang `PENGATURAN_ADMIN`.
  - `server/dokumen/penyimpanan.ts` & `tests/unit/dokumen-cron.test.ts`: Membungkus proses dekripsi (`dc.final()`) di `dekripsiJikaPerlu()` dengan `try / catch` yang melempar `GalatKonfigurasiBerkas` berpesan ramah (*"Berkas terenkripsi tidak dapat dibuka karena kunci enkripsi server tidak cocok atau berkas rusak. Hubungi Admin."*, membalas HTTP **503** ramah tanpa audit palsu), serta menambahkan unit test verifikasi kunci tidak cocok.
- **Verifikasi Akhir Coder (`2026-11-25`):** `npx prisma migrate deploy` (lokal Docker `localhost:5432`, 8/8 migrasi OK), `npx prisma generate` OK, `npm run typecheck` OK, `npm run lint` OK (0 error/warning), `npm test` **136/136 lulus** (16 file test), dan `npm run build` OK (44 rute). Siap commit, push ke GitHub, migrasi Neon, dan deploy ke Vercel.

### File Diubah (Animasi Tombol Interaktif "Abu Terbawa Angin" — Opsi A: Elegan Halus)
- `app/globals.css`:
  - Menambahkan token warna kabut abu (`--abu-kabut`, `--abu-kabut-terang`, `--abu-kabut-merah`, `--abu-aksen`, `--abu-pendar`) pada 3 tema: **Cursor Dark** (arang perak bersemu biru lembut), **Mossy Stone** (kabut sage/lumut lembut), dan **Langit Pagi** (embun biru muda & kilau putih halus).
  - Menambahkan `@keyframes` ringan berbasis `transform` + `opacity` (`abu-hanyut`, `abu-sapuan`, `abu-napas`, `abu-pendar-napas`) untuk 4 kondisi: hover masuk (~260ms, khusus perangkat berkursor `@media (hover: hover) and (pointer: fine)` agar tidak nyangkut di HP), tekan singkat (~100ms), tahan/hold bernapas pelan (~2 detik), dan kursor pergi memudar lambat sambil hanyut menjauh (~600ms).
  - Memilah efek penuh untuk tombol berkotak (`default`, `penting`, `outline`, `secondary`, `destructive`) dan kartu yang bisa diklik (`.kartu-abu`), serta efek super ringan (pendar bundar/sapuan tipis ~380–400ms) untuk tombol ikon (`data-size^="icon"`), varian `ghost`, dan menu navigasi (`.nav-abu`).
  - Menjaga tombol `absolute` di `Dialog`/`Sheet` tidak bergeser (posisi diatur lewat `buttonVariants`), serta mematikan efek pada `variant="link"`, tombol `disabled`/`aria-disabled`, `@media (prefers-reduced-motion: reduce)`, `.lembar-cetak`, dan `@media print`.
- `components/ui/button.tsx`: Menambahkan `relative isolate overflow-hidden` serta transisi terukur pada `buttonVariants` dan `overflow-visible` khusus varian `link`, **tanpa menambah elemen anak JSX baru** agar mode pembungkus `asChild` (`Slot.Root` Radix UI) tetap aman 100%.
- `components/tata-letak/navigasi.tsx`: Menambahkan kelas `.nav-abu` pada tautan menu samping di `DaftarMenu` (`SidebarDesktop` dan `MenuSeluler`) dengan menjaga tampilan solid item halaman aktif (`aria-current="page"`).
- `app/(aplikasi)/admin/page.tsx` & `app/(aplikasi)/dokumen/organisasi/page.tsx`: Memasang kelas `.kartu-abu` pada kartu menu Admin dan kartu folder Dokumen Organisasi yang bisa diklik (tidak dipasang pada kartu pasif).

### File Diubah (Perbaikan Kotak Hitam Header Atas)
- `app/(aplikasi)/layout.tsx`: Menghapus latar gelap persegi panjang (`bg-background/85 pb-1 backdrop-blur-md`) pada elemen `<header>` pembungkus bilah profil atas agar kotak hitam yang memotong latar gradasi di atas halaman hilang sepenuhnya.
- `app/globals.css`: Memekatkan warna latar **hanya di dalam kapsul bilah atas** (`header > .kaca` memakai `color-mix(in srgb, var(--popover) 95%, transparent)` dengan `backdrop-filter: blur(16px) saturate(145%)` serta menghapus `background-color` ganda di `html[data-tema="cursor-dark"] .kaca` agar berlaku merata di ketiga tema) sehingga kotak hitam di luar kapsul tetap hilang sementara teks/tombol di belakang bilah tidak membayang tembus saat layar digulir.

### File Diubah (Tema Bawaan Cursor Dark)
- `lib/tema.ts`: Mendaftarkan tema baru `"cursor-dark"` (**Cursor Dark**, hitam arang `#0E0E10` – `#18181B`, teks putih jernih `#EDEDEF`, aksen biru modern `#60A5FA`), menjadikannya `TEMA_BAWAAN` (tema default), dan memperbarui `normalisasiTema()` agar fallback ke `"cursor-dark"`.
- `app/layout.tsx`: Membaca cookie `tema` langsung dari server saat halaman pertama kali dibuka lalu memasang atribut `data-tema={tema}` pada tag `<html>` (dan `themeColor: "#0E0E10"`) sehingga tidak muncul kedipan putih sesaat (*white flash*).
- `components/tata-letak/tombol-tema.tsx`: Menghapus efek reset tema saat berpindah keluar halaman aplikasi supaya pilihan tema pegawai tetap terjaga konsisten hingga halaman login/keluar.
- `app/globals.css`:
  - Menambahkan palet warna lengkap `html[data-tema="cursor-dark"]` termasuk penyesuaian skala warna teks, kartu `.kaca`, latar `.latar-langit`, kotak peringatan (*alert*), lencana status cuti, serta penyesuaian `.bg-white:not(.lembar-cetak):not(.lembar-cetak *)` dan warna teks input/dropdown (`input`, `textarea`, `select`, `option`) agar setiap kotak isian form selalu terang terbaca di latar gelap.
  - Mengisolasi `.lembar-cetak` (beserta `@media print`) agar lembar cetak formulir A4, surat cuti, rekap cuti, dan bilah cetak tetap putih bersih dengan teks hitam pekat di tema apa pun.
- `tests/unit/tema.test.ts`: Memperbarui pengujian unit untuk memastikan `TEMA_BAWAAN === "cursor-dark"`, palet warna Cursor Dark terdaftar benar, dan normalisasi nilai tidak dikenal kembali ke `"cursor-dark"`.

### File Diubah (Upgrade Keamanan Next.js 16.4.2 → 16.4.6)
- `package.json` & `package-lock.json`: Memperbarui versi `next` dan `eslint-config-next` dari `16.4.2` ke `16.4.6` untuk menutup kerentanan keamanan yang dilaporkan oleh Next.js.
- `next.config.ts`: Menambahkan `experimental.agentUpgrade: "security"` sesuai rekomendasi resmi proses upgrade keamanan Next.js tanpa mengubah pengaturan lainnya.

### File Ditambah / Diubah (Fitur Foto Profil)
- `prisma/schema.prisma` & `prisma/migrations/20261119151727_foto_profil/migration.sql`: Menambahkan tabel terpisah `foto_profil` (`FotoProfil`) untuk menyimpan gambar profil pegawai langsung di database PostgreSQL (supaya aman dan tidak hilang saat aplikasi berjalan di Vercel), tanpa memberatkan pengambilan data login harian.
- `lib/foto-profil.ts`: Menambahkan helper bersama untuk pengecekan keaslian gambar (JPG, PNG, WebP lewat pemeriksaan isi file asli/magic bytes agar file palsu atau SVG berbahaya ditolak), pembuat inisial nama `inisialNama()`, serta pembuat alamat foto berversi `urlFotoProfil()`.
- `server/aksi/profil.ts`: Menambahkan aksi server `unggahFotoProfil()` dan `hapusFotoProfil()` yang mewajibkan login sah, memvalidasi berkas foto (maks 2 MB), mencatat jejak aktivitas ke audit log, dan memperbarui tampilan seluruh halaman (`revalidatePath`).
- `app/api/profil/foto/[userId]/route.ts`: Menambahkan alamat penyaji foto profil (`/api/profil/foto/[userId]`) yang hanya dapat dibuka jika sudah login, menolak akun/pegawai nonaktif, dan mengirim header cache pribadi + anti-sniffing.
- `server/auth/sesi.ts`, `server/auth/pengguna.ts`, & `server/kueri/pegawai-detail.ts`: Menyertakan waktu pembaruan foto profil untuk menghasilkan `fotoUrl` di menu pengguna pojok kanan atas dan di halaman detail pegawai.
- `components/auth/form-foto-profil.tsx` & `app/(aplikasi)/profil/page.tsx`: Menambahkan kartu **Foto profil** di halaman **Profil & password** lengkap dengan pratinjau langsung, pemotongan persegi otomatis `512×512` di browser agar ringan, tombol pilih/ganti foto, dan konfirmasi hapus foto.
- `components/tata-letak/menu-pengguna.tsx`, `app/(aplikasi)/layout.tsx`, & `app/(aplikasi)/pegawai/[id]/page.tsx`: Menampilkan foto profil pegawai (otomatis kembali ke inisial nama jika belum ada foto) pada menu akun di pojok kanan atas dan pada judul halaman detail pegawai.
- `tests/unit/foto-profil.test.ts`: Menambahkan 8 pengujian otomatis untuk memastikan gambar asli JPG/PNG/WebP diterima, file berbahaya/palsu ditolak, akses tanpa login mendapat `401`, pegawai nonaktif ditolak (`404`), serta unggah/hapus foto mencatat audit log.

### File Diubah (Tahap 1)
- `lib/password.ts`: Menambahkan `PENANDA_TANPA_PASSWORD` dan `punyaPassword()` untuk membedakan pegawai yang daftar lewat Google dan belum membuat password sendiri.
- `lib/validasi/auth.ts`: Menambahkan `skemaPutuskanGoogle` untuk konfirmasi password sebelum memutus tautan Google.
- `server/auth/google.ts` & `app/api/auth/google/route.ts`: Mengikat `userId` dan `sesiId` pada cookie state OAuth saat `mode=hubungkan`.
- `app/api/auth/google/callback/route.ts`: Memeriksa kecocokan `userId`/`sesiId` pada `mode=hubungkan` dan menolak penimpaan akun Google yang sudah terhubung sebelumnya.
- `server/aksi/auth.ts`:
  - Mewajibkan kesesuaian email Google dengan `pegawai.email` saat aktivasi atau pemulihan memakai NIK (tanpa kode sekali pakai dari Kepegawaian), sehingga sembarang Gmail tidak lagi bisa membajak akun bermodal NIP + NIK.
  - Mengeluarkan semua sesi perangkat lain (`hapusSesiLain`) saat pemulihan atau pemutusan Google.
  - Mengizinkan pendaftar Google-only membuat password pertamanya (`aturPasswordBaru`) dari menu Profil, dan menolak `hubungkanGoogleAkunLama` apabila akun sudah terhubung Google lain atau masih memakai password sementara Admin.
  - Mewajibkan sudah punya password & konfirmasi password saat memanggil `putuskanGoogle()`.

### File Diubah (Tahap 2)
- `server/permintaan.ts`: Memperbarui `infoPermintaan()` agar membaca alamat jaringan/IP asli dari header Vercel (`x-vercel-forwarded-for`) terlebih dahulu sebelum fallback ke `x-forwarded-for` dan `x-real-ip`.
- `server/auth/batas-login.ts` & `app/(aplikasi)/admin/log-login/page.tsx`: Menaikkan batas salah login per alamat IP menjadi `60` percobaan per 15 menit (agar satu kantor yang berbagi Wi-Fi tidak mudah ikut terkunci), mengecualikan catatan `"IP_DIBATASI"` supaya percobaan yang sudah ditolak tidak terus memperpanjang waktu blokir, dan mendukung jalannya pengecekan di dalam transaksi database.
- `server/auth/csrf.ts` & `lib/validasi/auth.ts`: Memperketat `asalSah()` (validasi protokol `http:`/`https:`, kecocokan `APP_URL`, serta menolak header `host` ganda/palsu) dan memperketat `tujuanAman()` dari karakter kontrol maupun alamat tujuan palsu agar redirect setelah login selalu tetap berada di dalam aplikasi.
- `server/auth/sesi.ts`, `app/api/auth/google/callback/route.ts`, `server/aksi/pegawai.ts`, & `server/layanan/impor-pegawai.ts`: Menyinkronkan status aktif pegawai (`pegawai.aktif`) ke akun login. Jika pegawai dinonaktifkan lewat menu data pegawai atau impor Excel, akun loginnya langsung dinonaktifkan dan sesi aktifnya dihapus; pembacaan sesi (`bacaSesi()`) dan login Google juga otomatis menolak pegawai yang sudah nonaktif.
- `server/auth/google.ts`: Menambahkan verifikasi tanda tangan digital resmi (`RS256`) untuk `id_token` Google memakai daftar kunci publik Google (`https://www.googleapis.com/oauth2/v3/certs`), memberi batas waktu koneksi 8 detik (`AbortSignal.timeout(8000)`), serta menambahkan `hapusSemuaCookieGoogle()` untuk membersihkan seluruh cookie sementara Google (`g-alur`, `g-tertunda`, `g-reset`).
- `server/aksi/auth.ts`:
  - Mengantrekan pemeriksaan batas salah password (`5x`, kunci 15 menit) dan batas salah NIK aktivasi (`5x` per `1 jam`) menggunakan kunci antrean transaksi database (`pg_advisory_xact_lock`) supaya percobaan cepat yang dikirim bersamaan tidak bisa mengakali batas hitungan.
  - Menyamakan pesan error salah password pada percobaan ke-1 sampai ke-4 agar status apakah suatu NIP sudah punya akun atau belum tidak mudah ditebak.
  - Menolak login pegawai nonaktif, menangani konflik data ganda (`P2002`) saat `buatAkun`, dan memastikan semua cookie sementara Google ikut terhapus saat `keluar()`.
- `tests/unit/auth-keamanan.test.ts`: Memperbarui pengujian otomatis untuk memeriksa penguncian salah password 5x, penguncian salah NIK 5x per jam, penolakan token Google palsu, penolakan login pegawai nonaktif, penghapusan cookie saat logout, serta validasi `asalSah()` dan `tujuanAman()`.
- `server/aksi/akun.ts`: Memperketat `wajibAdmin()` hanya untuk pemilik peran `ADMIN`/`SUPERADMIN` dan memblokir `resetPassword()` maupun `bukaKunci()` atas akun Superadmin (dan akun Admin lain) dari pengguna bukan Superadmin.
- `app/(aplikasi)/profil/page.tsx`, `components/auth/form-ganti-password.tsx`, & `components/auth/form-google.tsx`: Menyesuaikan tampilan Profil agar pendaftar Google diarahkan membuat password terlebih dahulu sebelum bisa memutus Google, menampilkan pesan error Google terbaru, serta memperbarui teks petunjuk form pemulihan/aktivasi.
- `prisma/seed/dummy/pegawai.ts` & `tests/e2e/google.spec.ts`: Menambahkan akun dummy Google (`googleDummy`: NIP `199405102020121908`, NIK `9999000000000908`, email `pegawai.google.dummy@gmail.com`) serta email dummy pada `tanpaAkun` (`NIP 199206062019031907`, `NIK 9999000000000907`, `pegawai.aktivasi.dummy@gmail.com`), dan menyesuaikan skenario E2E Google agar memverifikasi proteksi baru.
- `server/formulir/bawaan.ts`:
  - Mengambil angka murni hak cuti per tahun (`saldo.sisaN2` untuk N-2/2024, `saldo.sisaN1` untuk N-1/2025, dan `saldo.hakTahunIni + saldo.penyesuaian` untuk N/2026) tanpa memotong `pakai.dariN2`/`pakai.dariN1`/`pakai.dariN` terlebih dahulu pada nilai awal formulir, sehingga angka di `V. Catatan cuti` persis sesuai dengan kolom `Hak 2024`, `Hak 2025`, dan `Hak 2026` di menu Saldo & Rekap Cuti.
  - Mengubah helper `angka` menjadi `(n: number) => (n > 0 ? String(n) : "")` agar sisa cuti bernilai 0 ditampilkan kosong (blank space) tanpa tanda hubung `---`.
- `components/cuti/form-formulir.tsx`:
  - Menggunakan `catatanAwal` berbasis angka murni `Hak 2024`, `Hak 2025`, dan `Hak 2026` untuk simulasi pengurangan reaktif saat rentang tanggal cuti tahunan dipilih, serta mengembalikan ke nilai basis murni saat tanggal belum dipilih atau bukan cuti tahunan.
  - Mengubah helper `formatSisa` pada `hitungCatatanTahunan` menjadi `(n: number) => (n > 0 ? String(n) : "")` agar kolom Sisa bernilai 0 pada form dan pratinjau lembar A4 tampil kosong tanpa strip `---`.
  - Mengunci kolom `Tahun` (`readOnly`, `tabIndex={-1}`, `className="bg-slate-100 font-medium text-slate-700 cursor-not-allowed select-none"`) dan `Sisa` (`readOnly`, `tabIndex={-1}`, `className="bg-slate-100 font-semibold text-slate-900 cursor-not-allowed select-none"`) pada bagian `V. Catatan cuti` tanpa handler `onChange`, sementara kolom `Keterangan` tetap dapat diisi.
  - Memperbarui teks panduan di atas tabel menjadi `"Sisa cuti tahunan terisi dan berkurang otomatis dari saldo cuti Anda (tidak dapat diubah manual)."`
- `server/aksi/cuti.ts`:
  - Pada `simpanFormulir`: menghitung ulang `catatanTahunan` (`tahun` dan `sisa` untuk N-2, N-1, N) secara independen dari nilai murni tabel `saldo_cuti` di database (`sisaN2 = saldo.sisaN2`, `sisaN1 = saldo.sisaN1`, `sisaN = saldo.hakTahunIni + saldo.penyesuaian` dikurangi `cek.jumlahHari` bila jenis cuti memotong saldo tahunan, dengan `formatSisa` mengembalikan `""` bila nilai `<= 0`) serta mempertahankan `keterangan` dari pemohon.
  - Pada `pratinjauCuti`: menerima parameter opsional `kecualiId` agar pratinjau pada halaman ubah formulir (`/cuti/[id]/formulir`) tidak menganggap pengajuan yang sedang diedit bertabrakan dengan dirinya sendiri.
- `app/(aplikasi)/cuti/saldo/page.tsx`: Mengubah header kolom tabel saldo cuti dari `N-2 ({tahun - 2})` dan `N-1 ({tahun - 1})` menjadi `Hak {tahun - 2}` dan `Hak {tahun - 1}` (misal `Hak 2024`, `Hak 2025`, `Hak 2026`).
- `components/cuti/kelola-saldo.tsx`: Mengubah label bidang pada dialog `UbahSaldo` dari `"Sisa N-1"` dan `"Sisa N-2"` menjadi `` `Hak ${tahun - 1}` `` dan `` `Hak ${tahun - 2}` ``.
- `app/(aplikasi)/cuti/[id]/formulir/page.tsx`: Meneruskan `catatanAwal: bawaan.catatanTahunan` (saldo murni sebelum dikurangi pengajuan aktif) ke `FormFormulir` agar pengurangan reaktif saat mengedit formulir tidak memotong saldo dua kali (double deduction).
- `server/kueri/cuti.ts`: Menyertakan properti `potongSaldoTahunan` pada daftar `jenis` di `opsiPengajuan`.
- `lib/peran.ts`: Menambahkan peran efektif `SUPERADMIN` (`"Superadmin"`) pada `PeranEfektif` dan `LABEL_PERAN` agar tampilan profil dan header menampilkan role `Superadmin` untuk akun `eerza311` (`admin`).
- `lib/hak-akses.ts`: Menambahkan fungsi `adalahAkunSuperadmin(akun)` yang membatasi status Superadmin (Hak Akses Mutlak & Anti-Lockout) hanya untuk akun `eerza311` (`loginId: "admin"`, `loginId: "eerza311"`, atau `googleEmail: "eerza311@gmail.com"`).
- `server/auth/sesi.ts`: Menambahkan `hakAkses: true` pada `include.user` di fungsi `bacaSesi()`.
- `server/auth/pengguna.ts`: Membedakan peran efektif `SUPERADMIN` (khusus akun `eerza311`/`admin`) dari peran `ADMIN` milik pegawai; `adalahSuperadmin(u)` dan bypass mutlak pada `punyaHakAkses` hanya berlaku bagi `SUPERADMIN`, sedangkan pegawai dengan peran `ADMIN` tampil sebagai `Admin` saja dan hak aksesnya mengikuti daftar centang modular.
- `server/aksi/akun.ts` & `server/aksi/auth.ts`: Proteksi Anti-Lockout dikhususkan untuk akun Superadmin (`eerza311`/`admin`) sehingga hak akses para pegawai ber-peran `Admin` dapat diatur oleh Superadmin, serta mendukung login menggunakan ID `eerza311` maupun `admin`.
- `lib/menu.ts` & `app/(aplikasi)/layout.tsx`: Memperbarui `MENU` dan `menuUntuk(peran, hakAkses)` agar mendukung peran `SUPERADMIN`, `ADMIN`, `ATASAN`, `PEGAWAI`, dan `u.hakAkses`.
- `server/kueri/pegawai-detail.ts`, `components/pegawai/akun-pegawai.tsx`, & `app/(aplikasi)/pegawai/[id]/page.tsx`: Hanya akun Superadmin (`eerza311`/`admin`) yang menampilkan lencana `Superadmin (Hak Akses Mutlak)` dengan centang terkunci; pegawai ber-peran Admin menampilkan lencana `Admin` dengan centang yang dapat diatur.
- `app/(aplikasi)/admin/hak-akses/page.tsx` & `components/admin/matriks-hak-akses.tsx`: Menampilkan `eerza311 (Superadmin)` dengan lencana `Superadmin (Hak Akses Mutlak)` (centang terkunci), sementara para pegawai yang sebelumnya tampil sebagai Superadmin kini tampil dengan lencana `Admin` dan centangnya dapat dikelola.
- `app/(aplikasi)/admin/page.tsx`: Menambahkan kartu navigasi "Hak akses pegawai" (`/admin/hak-akses`) dan memperbarui guard halaman menjadi `wajibHakAkses("PENGATURAN_ADMIN")`.
- **Proteksi Halaman & Layanan/Action Terkait**:
  - `app/(aplikasi)/cuti/saldo/page.tsx` & `server/aksi/saldo.ts`: Menggunakan `wajibHakAkses("KELOLA_SALDO_CUTI")`.
  - `app/(aplikasi)/cuti/proses/page.tsx`, `app/(aplikasi)/cuti/[id]/page.tsx`, `app/(aplikasi)/cuti/[id]/formulir/page.tsx`, `server/layanan/akses-cuti.ts`, `server/layanan/wewenang-cuti.ts`, `server/aksi/cuti.ts`, & `server/kueri/beranda.ts`: Mendukung `punyaHakAkses(u, "PROSES_CUTI")` (serta `KELOLA_SALDO_CUTI` untuk rekap cuti).
  - `app/(aplikasi)/pegawai/page.tsx`, `app/(aplikasi)/pegawai/baru/page.tsx`, `app/(aplikasi)/pegawai/[id]/ubah/page.tsx`, `app/(aplikasi)/pegawai/impor/page.tsx`, `app/(aplikasi)/dokumen/page.tsx`, `server/aksi/pegawai.ts`, & `server/aksi/impor-pegawai.ts`: Menggunakan `wajibHakAkses("KELOLA_PEGAWAI")` / `punyaHakAkses(u, "KELOLA_PEGAWAI")`.
  - `server/layanan/akses-dokumen.ts`, `server/aksi/dokumen.ts`, & `server/aksi/folder.ts`: Mendukung `KELOLA_DOKUMEN_ORGANISASI` untuk pengelolaan penuh dokumen & folder organisasi dinas.
  - Seluruh sub-halaman `app/(aplikasi)/admin/**` (`audit-log`, `dokumen-terhapus`, `folder-dokumen`, `hari-libur`, `log-login`, `master`, `pengaturan`, `surat/penandatangan`, `surat/penomoran`, `surat/template`, `surat/template/[id]`) serta `server/aksi/admin.ts`, `server/aksi/master.ts`, `server/aksi/surat-admin.ts`: Menggunakan `wajibHakAkses("PENGATURAN_ADMIN")`.

## 3. Catatan Polesan Visual (Diisi oleh Conversation 4 - UI/UX Stylist)
*Daftar komponen UI, styling, responsivitas, atau animasi yang baru diperbarui:*
- **Polesan Animasi Tombol "Abu Terbawa Angin" (Opsi A: Elegan Halus) (`2026-11-24`):**
  - `app/globals.css`:
    - **Menghilangkan loncatan gerakan saat transisi:** Menyelaraskan titik awal animasi gerak melayang (`abu-hanyut`, `abu-sapuan`) dan animasi bernapas saat ditahan (`abu-napas`, `abu-napas-ekor`, `abu-pendar-napas`) dengan posisi akhir transisi hover/klik, sehingga kabut meluncur mulus tanpa pernah mundur/melompat sesaat, lalu perlahan hanyut menjauh ke kanan-atas saat kursor pergi (~640 ms).
    - **Pendar emas khusus tombol `penting`:** Menambahkan warna kabut dan pendar tepi emas hangat (`--abu-kabut-emas`, `--abu-aksen-emas`) khusus tombol aksen emas Kalsel di ketiga tema agar tidak memancarkan pendar biru/hijau yang kurang serasi.
    - **Menjaga ketajaman tulisan tombol utama di Langit Pagi:** Menurunkan kadar kabut putih pada tombol utama (`--abu-kabut-terang`) di tema **Langit Pagi** menjadi 20% (dari 36%) supaya teks putih di atas tombol biru tua tetap tajam terbaca (tetap memenuhi kontras nyaman mata) saat kursor menyentuh tombol.
    - **Efek super ringan untuk ikon bilah atas (`.ikon-abu`) & penguncian cetak:** Menambahkan kelas `.ikon-abu` (pendar kabut bundar tipis yang memudar cepat ~380 ms) serta ikut mematikannya di mode kurangi gerak (`prefers-reduced-motion`), tombol nonaktif, `.lembar-cetak`, dan `@media print`, plus memastikan tombol di dalam `.lembar-cetak` tidak menampilkan pendar atau bayangan kabut.
  - `components/tata-letak/tombol-tema.tsx`, `app/(aplikasi)/layout.tsx`, & `components/tata-letak/menu-pengguna.tsx`:
    - Menambahkan sentuhan ringan `.ikon-abu` pada tombol **Pilih Tema** dan ikon **Notifikasi** (lencana angka merah tetap rapi di dalam kotak dan tidak terpotong), serta `.nav-abu` pada kapsul **Menu Akun** di bilah atas agar seluruh bilah navigasi terasa serasi.
  - *Verifikasi:* `npm run typecheck`, `npm run lint` (0 error/warning), dan `npm test` (115/115) lulus bersih. Pemeriksaan penggabungan kelas `cn` memastikan posisi tombol tutup `absolute` pada `Dialog` dan `Sheet` tidak bergeser. Halaman `/login` pada tema **Cursor Dark** telah dicek langsung di browser lokal (tombol utama *Masuk* menunjukkan kabut lembut dengan tulisan gelap tajam), sementara halaman setelah login (`/beranda`, `/admin`, `/dokumen/organisasi`, `/cuti/saldo`, dialog/laci, dan `/cetak/...`) belum dapat dibuka langsung dengan akun demo bawaan karena kata sandi database lokal berbeda — perlu dicek menyeluruh oleh **Debugger / QA**.
- **Polesan Tema Bawaan `Cursor Dark` & Keselarasan 3 Tema (`2026-11-23`):**
  - `app/globals.css`:
    - Melengkapi warna teks & lencana di `Cursor Dark` (menambahkan warna `rose`, `indigo`, `amber`, dan `emerald` gelap yang sebelumnya belum terdaftar sehingga beberapa label/ikon sempat gelap atau terlalu mencolok).
    - Menambahkan dukungan warna latar/teks `bg-white/90` (kotak pencarian di matriks hak akses), memperbaiki efek sentuh (*hover*) pada tombol dan kartu putih agar tidak berubah menjadi putih silau saat diarahkan kursor di tema gelap.
    - Menyelaraskan tema **Mossy Stone** agar kotak pesan sukses/error, lencana status, kotak isian, dan pilihan dropdown juga gelap rapi saat pegawai berpindah tema.
    - Memperketat penguncian lembar cetak A4 (`.lembar-cetak` dan `@media print`) supaya kertas formulir, nota dinas, surat cuti, dan rekap selalu putih bersih dengan tulisan hitam pekat.
  - `components/ui/sonner.tsx`: Membuat notifikasi melayang (*toast*) otomatis mengikuti tema aktif (tampil gelap saat **Cursor Dark** / **Mossy Stone** aktif, dan tampil terang saat **Langit Pagi** aktif).
  - `components/ui/alert.tsx`: Memperjelas kotak pesan error (`variant="destructive"`) dengan latar merah marun lembut dan garis tepi merah agar peringatan langsung terbaca jelas di tema gelap maupun terang.
  - `components/tata-letak/tombol-tema.tsx`: Memperjelas garis tepi bulatan contoh warna tema di menu dropdown agar lingkaran warna gelap tetap terlihat tegas, serta menyesuaikan warna bilah atas browser HP dengan warna latar tema gelap.
  - `components/cuti/aksi-pengajuan.tsx`: Memperbaiki tombol pilih file surat izin eksternal (`file:bg-sky-100`) agar tulisannya tidak hilang putih-di-atas-putih saat mode gelap.
  - `app/(aplikasi)/cuti/[id]/page.tsx`: Mengubah lingkaran tepi titik riwayat status cuti (`ring-background`) agar menyatu rapi dengan kartu gelap.
  - `app/(aplikasi)/admin/master/page.tsx`, `components/admin/nav-surat.tsx`, & `components/admin/matriks-hak-akses.tsx`: Mengubah warna tulisan tab/avatar aktif dari putih tetap menjadi warna teks kontras bawaan tombol utama (`text-primary-foreground`) supaya jelas terbaca di atas warna biru terang **Cursor Dark** maupun hijau **Mossy Stone**.
  - `app/(aplikasi)/layout.tsx`: Mengubah lencana angka notifikasi lonceng menjadi merah pekat (`bg-red-600 text-white`) agar angka putihnya kontras tajam di semua tema.
  - *Verifikasi:* `npm run typecheck`, `npm run lint`, dan `npm test` (115/115) lulus bersih. Tampilan `/login?google=gagal` dan `/daftar` pada `Cursor Dark` telah dicek langsung di browser (layar laptop 1280px & HP 390px) — bebas melebar ke samping dan seluruh kotak form/peringatan terbaca jelas. Halaman terproteksi (`/beranda`, `/profil`, `/cuti/ajukan`, `/cetak/formulir/...`) serta perpindahan tema lewat tombol belum dapat dibuka langsung di browser lokal karena database PostgreSQL Docker lokal sedang mati, sehingga perlu dicek akhir oleh Debugger/QA saat DB aktif.
- `components/pegawai/akun-pegawai.tsx`:
  - Menggantikan tampilan daftar peran lama dengan panel kartu interaktif 5 Hak Akses Pegawai berdesain elevated `.kaca`.
  - Menambahkan ikon unik & aksen warna untuk setiap hak akses: `WalletCardsIcon` (Saldo & Rekap), `StampIcon` (Proses Cuti), `UsersIcon` (Data Pegawai), `FolderLockIcon` (Dokumen Organisasi), dan `Settings2Icon` (Pengaturan Admin).
  - Memberikan indikator status aktif berupa ring highlight (`border-primary/50 bg-sky-50/70 ring-1 ring-primary/20`) saat dicentang, badge aktif, serta banner khusus untuk peran Admin Utama.
  - Menambahkan tombol aksi preset cepat: "Bawaan Kepegawaian", "Pilih Semua", dan "Kosongkan" untuk mempermudah konfigurasi oleh Admin.
  - Menambahkan deteksi perubahan form (dirty state) dengan badge visual "Perubahan belum disimpan", tombol "Batal", dan tombol simpan dengan spinner interaktif (`Loader2Icon`).
  - Mempercantik kartu status akun dengan status badge berindikator dot denyut (pulse) untuk status Aktif, badge Terkunci, dan penataan kredensial yang rapi.
- `app/(aplikasi)/admin/hak-akses/page.tsx`:
  - Memoles header halaman dengan breadcrumb interaktif, judul responsif, dan lencana "Kontrol Modular".
  - Merancang ulang 5 kartu ringkasan hak akses di bagian atas dengan ikon bertema warna (emerald, sky, indigo, amber, rose), border hover ring, serta tipografi yang nyaman dibaca.
- `components/admin/matriks-hak-akses.tsx`:
  - Menambahkan kontrol pencarian responsif dengan tombol pembersih (clear search `XIcon`).
  - Menambahkan bilah filter cepat berdasarkan kategori: "Semua", "Admin Utama", "Hak Khusus", dan "Pegawai Biasa".
  - Memperbarui tabel matriks dengan header lengket (*sticky header*) berlatar *backdrop-blur* dan ikon pada setiap kolom hak akses.
  - Menambahkan avatar inisial berwarna untuk setiap pegawai pada kolom nama, lencana "Admin Utama", status nonaktif, serta jumlah hak aktif.
  - Memberikan feedback visual seketika saat centang diubah berupa spinner pemuatan (`Loader2Icon`) mikro di dalam sel tabel, serta efek *heat map* lembut pada sel yang aktif.
  - Menambahkan status kosong (*empty state*) ramah pengguna dengan tombol "Bersihkan Filter".

## 4. Antrean Bug & Evaluasi QA (Diisi oleh Conversation 2 - Debugger)
*Daftar error logika, masalah tampilan, atau perbaikan yang dibutuhkan:*
- [ ] **[CATATAN DESAIN] [server/auth/pengguna.ts:~38-45 vs app/(aplikasi)/admin/hak-akses/page.tsx:34]**: Peran legacy `KEPEGAWAIAN` saat ini otomatis menginjeksi 3 hak akses (`KELOLA_SALDO_CUTI`, `PROSES_CUTI`, `KELOLA_PEGAWAI`) hanya jika baris `user_hak_akses` kosong; begitu Superadmin menyimpan centang di `/admin/hak-akses`, peran lama otomatis dibersihkan.
- [ ] **[CATATAN] [DEV_SYNC.md bagian 1.C]**: Blueprint awal menyebut route `/cuti/rekap`, namun rekap terintegrasi pada `/cuti/saldo` dan `/cetak/rekap-cuti`.

## 5. Riwayat Selesai (Resolved)
- [x] **[VERIFIKASI QA - Polesan Akhir & Cek Status Rilis Produksi] [2026-11-25]**:
  - Kedua polesan akhir (`app/(aplikasi)/pegawai/page.tsx` dan `server/dokumen/penyimpanan.ts`) telah diperiksa langsung pada kode lokal dan **136/136 unit test** lulus bersih.
  - Pengecekan langsung (100% hanya baca) pada `https://cuti-esdm.vercel.app` & `git log` mengonfirmasi bahwa **perubahan terbaru ini belum di-commit, belum di-push ke GitHub, belum dimigrasikan ke Neon, dan belum di-deploy ke Vercel** (website online masih menjalankan versi lama `b2cdbcb`: inisial Superadmin masih `E(`, 6 cuti lama masih *Surat Terbit*, dan belum ada error konsol).
  - *Temuan praktis tambahan:* Di menu **Dokumen Organisasi** produksi saat ini tertulis batas **`maks. 1 MB`** (berarti pengaturan `dokumen.maks_ukuran_mb` di Neon sedang bernilai `1`). Setelah rilis baru tayang, bila ingin pegawai bisa mengunggah hingga **4 MB**, cukup ubah angka batas dokumen di **Admin → Pengaturan** menjadi `4`.
- [x] **[SEDANG - UX Tombol Buntu] [app/(aplikasi)/pegawai/page.tsx:61-91] [2026-11-25]**: Seluruh tombol aksi kanan atas (**Ekspor Excel**, **Ekspor + data pribadi**, **Cetak / PDF**, **Impor Excel**, dan **Tambah pegawai**) kini dibungkus `{kepegawaian && (...)}` sehingga tidak lagi tampil sebagai tombol buntu bagi akun yang hanya memegang hak `PENGATURAN_ADMIN`.
- [x] **[RENDAH - Penanganan Kunci Enkripsi Tidak Cocok] [server/dokumen/penyimpanan.ts:157-170, tests/unit/dokumen-cron.test.ts] [2026-11-25]**: Proses dekripsi `dekripsiJikaPerlu()` kini membungkus `dc.final()` dengan `try / catch` dan melempar `GalatKonfigurasiBerkas` berpesan ramah (HTTP 503 ramah tanpa audit palsu), lengkap dengan unit test lulus (**136/136** unit test & `npm run build` 44 rute OK).
- [x] **[VERIFIKASI QA - Cetak Biru I: Penyimpanan `dokumen_berkas`, Vercel Cron, & Perbaikan Keamanan/Logika Gelombang 1–4] [2026-11-25]**:
  - **Tes Otomatis & Migrasi Lokal:** `prisma migrate status` (8/8 migrasi sinkron di Docker lokal `localhost:5432`), `npm run typecheck` OK, `npm run lint` OK (0 error/warning), `npm test` **135/135 lulus** (16 file test).
  - **Uji Integrasi Database PostgreSQL Nyata (5 Skenario):**
    - Unggah dokumen pribadi terenkripsi AES-256-GCM ke tabel `dokumen_berkas` (`303 B` asli → `331 B` terenkripsi di DB, dekripsi kembali persis sama), hapus lunak & pulihkan tetap utuh, dan `gabungkanPdf` menghasilkan PDF gabungan valid.
    - Simulasi hapus paksa baris `dokumen_berkas` → `GalatBerkasTidakDitemukan` & `GalatGabung` menyebut nama dokumen.
    - Endpoint `/api/tugas/harian` menerima `GET` (`Bearer CRON_SECRET`), `POST` (`Bearer TUGAS_TOKEN`), menolak token salah `401`, mengubah status cuti lewat `SURAT_TERBIT → SELESAI`, dan pemanggilan ulang tidak menambah riwayat status ganda (`cutiSelesai: 0`, 1 baris riwayat).
    - `userDenganHakAkses("PROSES_CUTI")` menyertakan akun pemegang centang `PROSES_CUTI` tanpa peran lama dan mengecualikannya setelah dicabut.
    - Rentang tanggal tahun `9026` ditolak cepat dalam **0,11 ms**.
  - **Uji Browser Lokal Nyata (`1280×800` Laptop & `390×844` HP — 13 Skenario):**
    - Superadmin (`admin`): lencana **Admin** & angka filter `Admin Utama` di `/admin/hak-akses` langsung berubah seketika tanpa muat ulang; unggah PDF & PNG di `/dokumen/organisasi` tampil & terbuka HTTP `200`, hapus lunak → pulihkan di `/admin/dokumen-terhapus` → kembali terbuka HTTP `200`.
    - Akun hanya `PENGATURAN_ADMIN` (`Akbar, S.Kom.`): menu samping menyembunyikan *Saldo & Rekap Cuti* dan *Data Pegawai*; `/cuti/saldo` & `/dokumen?pegawai=...` diarahkan ke `/akses-ditolak`; `/admin/hak-akses` tampil *Mode lihat saja* dengan seluruh centang terkunci; `/api/ekspor/pegawai` membalas `403 Akses ditolak`; unggah dokumen pribadi `KTP` ke `dokumen_berkas` (terenkripsi `331 B`) sukses & terbuka HTTP `200`.
    - Simulasi berkas fisik hilang di browser: `GET /api/dokumen/.../berkas` membalas **404 ramah** (*"Berkas fisik dokumen tidak ditemukan..."*), dan tombol **Cetak gabungan** membalas **422 ramah** menyebut `"QA Org Foto"` lengkap dengan notifikasi toast.
    - Layar HP `390×844` (`/beranda`, `/dokumen`, `/admin/hak-akses`): **nol gulir samping** dan **nol galat konsol**; pindah tema ke **Langit Pagi** mengubah `<meta name="theme-color">` di `/login` dari `#0E0E10` menjadi `#F0F9FF`.
  - **Status Kesiapan Rilis:** Seluruh 12 temuan utama (KRITIS s.d. RENDAH) telah terverifikasi tuntas. Tinggal 2 polesan kecil di Bagian 4 (tombol buntu di `/pegawai` untuk akun `PENGATURAN_ADMIN` & `try/catch` dekripsi kunci tidak cocok) sebelum migrasi Neon & deploy Vercel.
- [x] **[KRITIS - Penyimpanan Berkas di Vercel] [prisma/migrations/20261125130000_dokumen_berkas/migration.sql, server/dokumen/penyimpanan.ts, server/dokumen/gabung.ts, server/aksi/dokumen.ts, server/aksi/cuti.ts, app/api/dokumen/[id]/berkas/route.ts, components/dokumen/form-unggah.tsx, components/cuti/aksi-pengajuan.tsx]**: Berkas dokumen pribadi (terenkripsi AES-256-GCM), dokumen organisasi, & lampiran surat izin kini tersimpan atomik di tabel database `dokumen_berkas` (mode bawaan `db`, tetap mendukung `disk`), batas jujur maks. 4 MB di Vercel + cek di browser, serta respon 404/422 ramah bila berkas fisik tidak ditemukan.
- [x] **[KRITIS - Keamanan Hak Akses] [server/aksi/akun.ts, lib/menu.ts, server/layanan/akses-dokumen.ts, server/layanan/akses-cuti.ts, server/layanan/wewenang-cuti.ts, server/aksi/*, server/kueri/*, app/**]**: Pengaturan hak akses & peran dikunci khusus Superadmin, peran lama `ADMIN`/`KEPEGAWAIAN` dibersihkan saat centang disimpan, seluruh izin modul memakai `punyaHakAkses()` tanpa bypass peran lama, data sensitif dipisahkan khusus pemilik & `KELOLA_PEGAWAI`, dan akun Superadmin dilindungi dari penonaktifan via form/impor pegawai.
- [x] **[TINGGI - Privasi Data Cuti] [server/aksi/cuti.ts (`pratinjauCuti`)]**: Penambahan cek kepemilikan `kecualiId` mencegah pegawai mengintip sisa saldo atau tanggal cuti rekan kerja.
- [x] **[TINGGI - Logika & Integritas Cuti] [server/aksi/cuti.ts, server/layanan/cuti.ts]**: Validasi UUID `id`, kunci antrean transaksi per pegawai di seluruh aksi cuti, `updateMany` bersyarat `status: "DIAJUKAN"`, cek ulang kecukupan saldo `SALDO_KURANG` saat disetujui, serta penanganan pesan ramah `"BERUBAH"` di `tolakCuti` & `batalkanCuti`.
- [x] **[TINGGI - Stabilitas Layanan] [lib/domain/hari-kerja.ts, server/layanan/cuti.ts]**: Validasi rentang tanggal (`2000–2100`, maks. `1.100` hari kalender) sebelum query libur dan perhitungan hari kerja `O(1)` memori tanpa menumpuk array jutaan tanggal.
- [x] **[SEDANG - Jadwal Otomatis Status Cuti "Selesai" di Vercel] [vercel.json, app/api/tugas/harian/route.ts, server/layanan/cuti.ts]**: Penambahan jadwal Vercel Cron harian `"0 17 * * *"` (01:00 WITA), dukungan `GET` (`CRON_SECRET`) & `POST` (`TUGAS_TOKEN`), dan anti-riwayat ganda pada `selesaikanCutiLewat`.
- [x] **[SEDANG - Notifikasi Hak Modular] [server/notifikasi.ts, server/layanan/wewenang-cuti.ts, server/aksi/cuti.ts]**: Helper `userDenganHakAkses("PROSES_CUTI")` memastikan pemegang centang Proses Cuti (tanpa peran lama) menerima notifikasi lonceng & email.
- [x] **[SEDANG - Impor & Ekspor Saldo Cuti] [server/aksi/saldo.ts, lib/excel.ts, app/api/ekspor/rekap-cuti/route.ts]**: Validasi tahun `2020–2100`, tolak baris NIP ganda di impor saldo, dan `buatNamaSheetUnik()` mencegah bentrok nama tab Excel > 31 karakter.
- [x] **[SEDANG - Struktur Unit & Nomor Surat] [server/aksi/master.ts, server/layanan/cuti.ts, lib/domain/daftar-hadir.ts, server/aksi/surat.ts]**: Pencegahan induk unit melingkar, proteksi `Set` anti-loop, dan kunci antrean penomoran surat otomatis per tahun.
- [x] **[RENDAH - Konsistensi Keamanan Password Sementara] [app/api/auth/google/*, app/api/dokumen/*, app/api/ekspor/*, app/api/cuti/template-saldo/*, app/api/pegawai/*, app/api/surat/*]**: Menolak tautkan Google (`/profil?wajib=1`) dan rute API sensitif (`403`) bila `wajibGantiPassword` masih aktif.
- [x] **[RENDAH - Tampilan Lencana & Inisial Matriks Hak Akses] [lib/hak-akses.ts, components/admin/matriks-hak-akses.tsx]**: State `adalahAdmin` langsung diperbarui seketika tanpa muat ulang dan inisial `eerza311 (Superadmin)` tampil rapi **`ES`** (bukan `E(`).
- [x] **[RENDAH - Opsional] [app/layout.tsx (`generateViewport`)]**: Warna bilah alamat browser HP (`themeColor`) kini dinamis mengikuti cookie tema aktif (`#0E0E10`, `#F0F9FF`, `#161E1A`) sejak halaman `/login`.
- [x] **[VERIFIKASI QA - Data Produksi Online & Pengecekan Otomatis Lokal] [2026-11-25]**:
  - Verifikasi langsung (100% hanya baca, nol perubahan data) pada `https://cuti-esdm.vercel.app` dengan akun Superadmin `admin`: seluruh 6 halaman utama (`/beranda`, `/pegawai`, `/cuti/saldo`, `/cuti/proses`, `/dokumen/organisasi`, `/admin/hak-akses`) terbuka normal tanpa galat konsol maupun galat tampilan.
  - Data produksi Neon terkonfirmasi utuh: **93 pegawai aktif**, seluruh ASN sudah memiliki **saldo cuti 2026** (nol peringatan saldo kosong) di seluruh unit, **12 pengajuan cuti** utuh (1 antrean aktif, 6 *Surat Terbit*, 4 *Disetujui*, 1 *Dibatalkan*), **4 folder Dokumen Organisasi** siap pakai (saat ini masih 0 dokumen sehingga belum ada berkas yang hilang), serta **6 akun aktif** termasuk `eerza311 (Superadmin)` dengan **foto profil** tampil normal di pojok kanan atas.
  - Lingkungan kerja lokal (`node_modules`, Prisma Client, `.env` dev lokal yang 100% terpisah dari Neon, container Docker PostgreSQL 17 `cuti-esdm-dev-db-1`, 7 migrasi tabel, serta data contoh fiktif: 106 pegawai, 90 akun, 102 saldo cuti, 4 folder dokumen) sudah siap pakai 100%; pengecekan otomatis lulus bersih: `npm run typecheck` OK, `npm run lint` OK (0 error/warning), dan `npm test` **115/115 lulus**.
- [x] **[VERIFIKASI QA - Animasi Tombol "Abu Terbawa Angin" & Build Produksi] [2026-11-24]**:
  - Uji browser (`1280×800` laptop & `390×844` HP) pada halaman `/beranda`, `/admin` (9 kartu `.kartu-abu`), `/dokumen/organisasi` (4 kartu folder `.kartu-abu`), `/cuti/saldo` (ikon edit kecil + Dialog Ubah Saldo), dan detail pegawai tab **Akun** (varian `default`, `penting` emas, `outline`, `destructive`, `ghost`, dan tombol nonaktif `disabled`).
  - Seluruh 4 kondisi animasi (hover masuk halus, klik singkat, tekan tahan bernapas, dan memudar lambat saat kursor pergi) terverifikasi rapi di ketiga tema (**Cursor Dark**, **Mossy Stone**, **Langit Pagi**), teks putih tombol utama di **Langit Pagi** tetap tajam saat di-hover, dan tombol `penting` memancarkan pendar emas hangat.
  - Posisi tombol tutup `X` di pojok kanan atas **Dialog Ubah Saldo** dan **Sheet menu HP** terbukti tepat tanpa bergeser; efek hover aman terbungkus `@media (hover: hover) and (pointer: fine)` sehingga tidak nyangkut di HP; aturan `@media (prefers-reduced-motion: reduce)` aktif mematikan gerak; dan `/cetak/rekap-cuti` tampil putih bersih teks hitam pekat saat **Cursor Dark** aktif tanpa efek kabut tombol. *(Catatan: lencana merah lonceng notifikasi berangka `0` saat uji akun sementara, namun secara ukuran CSS `size-10 rounded-xl` + `right-1 top-1` tetap muat rapi di dalam kotak).*
  - Seluruh pengecekan kode & build lulus bersih tanpa galat (`npm run typecheck`, `npm run lint` 0 warning, `npm test` 115/115, dan `npm run build` 44 rute) — dinyatakan **siap commit, push ke GitHub, dan deploy ke Vercel**.
- [x] **[SEDANG - Tampilan Gulir Kapsul Header] [app/globals.css (`header > .kaca`)]**: Memekatkan warna hanya di dalam kapsul bilah atas (`color-mix` 95% `--popover` di semua 3 tema) tanpa menambah latar apa pun pada `<header>` pembungkusnya, sehingga kotak hitam tetap hilang dan konten/tombol di belakang bilah tidak lagi membayang tembus saat halaman digulir.
- [x] **[VERIFIKASI QA - Penghapusan Kotak Hitam Header] [2026-11-23]**: Verifikasi langsung di browser (`1280×800` laptop & `390×844` HP) pada halaman `/pegawai` dan `/cuti/ajukan` di tema **Cursor Dark**, **Mossy Stone**, dan **Langit Pagi**. Kotak hitam persegi panjang di atas bilah profil dipastikan hilang sepenuhnya, nol overflow horizontal, nol error konsol, serta `npm run typecheck`, `npm run lint`, dan `npm test` (115/115) lulus bersih.
- [x] **[TINGGI - Tampilan HP] [components/surat/pratinjau-a4.tsx, components/cuti/form-formulir.tsx, components/surat/form-surat.tsx]**: Ditemukan saat uji browser HP (`390×844`) bahwa pratinjau kertas A4 di `/cuti/ajukan` melebar keluar layar hingga memunculkan gulir horizontal dan terpotong ke kanan. Diperbaiki dengan mengunci lebar grid kolom (`grid-cols-1` & `min-w-0`) serta membuat isi pratinjau `PratinjauA4` memposisikan diri di dalam bingkai terukur (`relative` + `absolute` saat pratinjau, kembali `static` saat cetak), sehingga kertas A4 mengecil pas di layar HP tanpa gulir samping.
- [x] **[SEDANG - Tampilan Gulir] [app/(aplikasi)/layout.tsx, app/globals.css (`header > .kaca`)]**: Ditemukan saat uji browser bahwa bilah navigasi atas yang terlalu tembus pandang membuat tulisan formulir/kertas putih di belakangnya bertabrakan dengan judul aplikasi saat layar digulir. Diperbaiki dengan memberi lapisan buram ringan pada area atas (`bg-background/85 backdrop-blur-md`) dan meningkatkan kepekatan latar bilah atas (`color-mix` 95% `--popover`) agar tulisan di header tetap tajam di ketiga tema.
- [x] **[VERIFIKASI QA - Browser Lengkap (Laptop 1280×800 & HP 390×844)] [2026-11-23]**: Berhasil masuk melalui `/login`, memverifikasi tampilan `/beranda`, `/profil`, `/cuti/ajukan` (dropdown jenis cuti terbaca jelas, kolom Tahun & Sisa cuti tahunan terkunci dan otomatis berkurang saat tanggal dipilih, pratinjau A4 pas di layar laptop & HP), serta `/cetak/formulir/[id]` (kertas putih bersih dengan teks hitam pekat saat `Cursor Dark` aktif, tanpa error konsol). Uji pindah tema **Cursor Dark → Langit Pagi → Mossy Stone → Cursor Dark** memastikan pop-up *toast* mengikuti gelap/terang (`dark`/`light`) dan tema tersimpan setelah Keluar ke `/login`.
- [x] **[SEDANG - Isolasi Kertas A4] [components/surat/pratinjau-a4.tsx:32]**: Menambahkan kelas `lembar-cetak` pada pembungkus pratinjau kertas A4/Legal (`PratinjauA4`) agar pratinjau formulir/nota dinas/surat di halaman **Ajukan Cuti** (`/cuti/ajukan`), **Ubah Formulir** (`/cuti/[id]/formulir`), dan **Editor Surat** (`/cuti/[id]/surat/[kode]`) selalu terkunci putih bersih dengan teks hitam pekat di tema apa pun (bukan hanya pada halaman `/cetak/*`).
- [x] **[VERIFIKASI QA - Kode & Build] [2026-11-23]**: Audit seluruh perubahan CSS tema (`app/globals.css`), `components/ui/sonner.tsx`, `components/ui/alert.tsx`, `components/tata-letak/tombol-tema.tsx`, `components/cuti/aksi-pengajuan.tsx`, `app/(aplikasi)/admin/master/page.tsx`, `components/admin/nav-surat.tsx`, `components/admin/matriks-hak-akses.tsx`, `app/(aplikasi)/layout.tsx`, dan `app/(aplikasi)/cuti/[id]/page.tsx`. Hasil setelah perbaikan `pratinjau-a4.tsx`: `npm run typecheck` OK, `npm run lint` OK (0 warning/error), `npm test` 115/115 OK, dan `npm run build` OK (44 rute).
- [x] **[KRITIS] [prisma/migrations/20261111000000_hak_akses_pegawai/migration.sql]**: Dibuat file migrasi SQL resmi untuk enum `HakAkses` dan tabel `user_hak_akses` beserta foreign key cascade ke `users`. Siap dieksekusi via `prisma migrate deploy`.
- [x] **[TINGGI] [app/api/cuti/template-saldo/route.ts, app/api/ekspor/rekap-cuti/route.ts, app/(cetak)/cetak/rekap-cuti/page.tsx, server/kueri/lingkup-rekap.ts, server/kueri/grup-pegawai.ts]**: Diperbarui dengan `punyaHakAkses(u, "KELOLA_SALDO_CUTI")` (beserta fallback peran `KEPEGAWAIAN`) sehingga pemegang hak dapat mengunduh template saldo, mengekspor rekap, mencetak rekap, dan melihat seluruh unit kerja.
- [x] **[TINGGI] [app/api/ekspor/pegawai/route.ts, app/api/pegawai/impor/route.ts, app/api/pegawai/template/route.ts, app/(cetak)/cetak/pegawai/page.tsx]**: Diperbarui dengan `punyaHakAkses(u, "KELOLA_PEGAWAI")` (beserta fallback peran `KEPEGAWAIAN`/`ADMIN`) sehingga aksi impor/ekspor data pegawai dan cetak data pegawai dapat diakses oleh pemegang hak modular.
- [x] **[TINGGI - Keamanan] [server/aksi/akun.ts:63]**: Fungsi `wajibAdmin()` diperketat khusus untuk akun ber-peran `ADMIN` riil. Mencegah eskalasi hak (reset password, ubah peran, nonaktifkan akun) oleh akun yang hanya diberi hak akses modular `PENGATURAN_ADMIN`.
- [x] **[SEDANG - UX / Race Condition] [components/admin/matriks-hak-akses.tsx]**: Diperbaiki dengan mengunci (`disabled`) seluruh baris user yang sedang mengalami mutasi penyimpanan (`prosesSimpan.userId === b.userId`), mencegah tumpang tindih request `aturHakAkses` saat admin mencentang kolom berdekatan secara cepat.
- [x] **[RENDAH - Lint] [components/admin/matriks-hak-akses.tsx:10]**: Menghapus impor `ShieldCheckIcon` yang tidak terpakai sehingga ESLint bersih tanpa peringatan (0 errors, 0 warnings).
- [x] **[RENDAH - UX] [components/admin/matriks-hak-akses.tsx:83]**: Menambahkan normalisasi pencarian NIP (`kBersih`) agar pencarian 18 digit NIP tanpa spasi tetap dapat menemukan data pegawai ber-spasi.
- [x] **[RENDAH - Test] [tests/unit/hak-akses.test.ts]**: Ditambahkan pengujian integritas daftar hak akses dan menu sistem (total 99/99 unit test lulus).
- [x] **[VERIFIKASI QA] [Superadmin Bypass & Anti-Lockout]**: Seluruh helper otorisasi (`punyaHakAkses`, `punyaPeran`, `wajibAdmin`) terverifikasi memberikan bypass mutlak bagi akun `ADMIN` / `admin`. Proteksi anti-lockout pada `aturPeran`, `aturAktifAkun`, dan `aturHakAkses` terbukti aktif menolak pencabutan atau penonaktifan Superadmin. Matriks hak akses juga aman menampilkan akun admin tanpa tautan rusak.