# WORKSPACE SYNC & PROJECT HUB

## 0. Ringkasan Proyek & Tech Stack (Referensi Semua Agent)
- **Deskripsi Singkat:** **Layanan Cuti ESDM Kalsel** — Aplikasi web internal Dinas ESDM Provinsi Kalimantan Selatan untuk pengelolaan data pegawai, pengajuan cuti berjenjang (standar formulir BKN), penerbitan surat cuti & nota dinas per eselon (editor Tiptap, versioning, cetak/PDF), serta ruang dokumen kepegawaian terenkripsi. *(Catatan: Modul absensi lama telah dinonaktifkan/deprecated, tabel di DB dipertahankan untuk histori).*
- **Tech Stack & Library:**
  - **Framework & Runtime:** Next.js 16.4.2 (App Router), React 19.3.0, TypeScript 5, Node.js 24.
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
- **Fase Aktif:** Ready to Push & Deploy
- **Fitur/Modul Aktif:** Otomatisasi & Penguncian Sisa Cuti Tahunan (Bagian V. Catatan Cuti Formulir Pengajuan)
- **Penanggung Jawab Terakhir:** Coder

## 1. Cetak Biru & Skema Data (Diisi oleh Conversation 3 - Architect)
*Rancangan alur sistem, struktur tabel/database, dan daftar file yang harus dibuat/dieksekusi oleh Coder:*

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

### File Diubah
- `components/cuti/form-formulir.tsx`:
  - Mengunci kolom `Tahun` (`readOnly`, `tabIndex={-1}`, `className="bg-slate-100 font-medium text-slate-700 cursor-not-allowed select-none"`) dan `Sisa` (`readOnly`, `tabIndex={-1}`, `className="bg-slate-100 font-semibold text-slate-900 cursor-not-allowed select-none"`) pada bagian `V. Catatan cuti` tanpa handler `onChange`, sementara kolom `Keterangan` tetap dapat diisi.
  - Memperbarui teks panduan di atas tabel menjadi `"Sisa cuti tahunan terisi dan berkurang otomatis dari saldo cuti Anda (tidak dapat diubah manual)."`
  - Menambahkan logika pengurangan otomatis dan reaktif (`hitungCatatanTahunan`) yang menyimpan basis `catatanAwal` (`sisaN2`, `sisaN1`, `sisaN`) dan mengurangi sisa secara berurutan (N-2 -> N-1 -> N sesuai PP 11/2017) saat jenis cuti tahunan (`potongSaldoTahunan` / kode `"TAHUNAN"`) serta rentang tanggal dipilih (`jumlahHari > 0`), atau mengembalikan ke `catatanAwal` saat bukan cuti tahunan / tanggal belum dipilih.
- `server/aksi/cuti.ts`:
  - Pada `simpanFormulir`: menghitung ulang `catatanTahunan` (`tahun` dan `sisa` untuk N-2, N-1, N) secara independen dari tabel `saldo_cuti` di database (`rincianPemakaian` dikurangi `cek.jumlahHari` bila jenis cuti memotong saldo tahunan) dengan tetap mempertahankan `keterangan` dari pemohon untuk mencegah manipulasi client-side.
  - Pada `pratinjauCuti`: menerima parameter opsional `kecualiId` agar pratinjau pada halaman ubah formulir (`/cuti/[id]/formulir`) tidak menganggap pengajuan yang sedang diedit bertabrakan dengan dirinya sendiri.
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
- [ ] **[CATATAN DESAIN] [server/auth/pengguna.ts:~38-45 vs app/(aplikasi)/admin/hak-akses/page.tsx:34]**: Peran legacy `KEPEGAWAIAN` saat ini otomatis menginjeksi 3 hak akses (`KELOLA_SALDO_CUTI`, `PROSES_CUTI`, `KELOLA_PEGAWAI`) jika baris `user_hak_akses` kosong. Bila kelak ingin mencabut hak dari pegawai yang masih memiliki peran legacy tersebut, Admin disarankan menghapus peran `KEPEGAWAIAN` akun tersebut atau mengeksekusi migrasi data peran ke hak akses modular.
- [ ] **[CATATAN DESAIN] [server/layanan/akses-dokumen.ts:63]**: Evaluasi berkelanjutan untuk menyelaraskan fungsi akses dokumen lama dengan hak akses `KELOLA_PEGAWAI` vs peran legacy.
- [ ] **[CATATAN] [DEV_SYNC.md bagian 1.C]**: Blueprint menyebut route `/cuti/rekap`, namun rekap terintegrasi pada `/cuti/saldo` dan `/cetak/rekap-cuti`.

## 5. Riwayat Selesai (Resolved)
- [x] **[KRITIS] [prisma/migrations/20261111000000_hak_akses_pegawai/migration.sql]**: Dibuat file migrasi SQL resmi untuk enum `HakAkses` dan tabel `user_hak_akses` beserta foreign key cascade ke `users`. Siap dieksekusi via `prisma migrate deploy`.
- [x] **[TINGGI] [app/api/cuti/template-saldo/route.ts, app/api/ekspor/rekap-cuti/route.ts, app/(cetak)/cetak/rekap-cuti/page.tsx, server/kueri/lingkup-rekap.ts, server/kueri/grup-pegawai.ts]**: Diperbarui dengan `punyaHakAkses(u, "KELOLA_SALDO_CUTI")` (beserta fallback peran `KEPEGAWAIAN`) sehingga pemegang hak dapat mengunduh template saldo, mengekspor rekap, mencetak rekap, dan melihat seluruh unit kerja.
- [x] **[TINGGI] [app/api/ekspor/pegawai/route.ts, app/api/pegawai/impor/route.ts, app/api/pegawai/template/route.ts, app/(cetak)/cetak/pegawai/page.tsx]**: Diperbarui dengan `punyaHakAkses(u, "KELOLA_PEGAWAI")` (beserta fallback peran `KEPEGAWAIAN`/`ADMIN`) sehingga aksi impor/ekspor data pegawai dan cetak data pegawai dapat diakses oleh pemegang hak modular.
- [x] **[TINGGI - Keamanan] [server/aksi/akun.ts:63]**: Fungsi `wajibAdmin()` diperketat khusus untuk akun ber-peran `ADMIN` riil. Mencegah eskalasi hak (reset password, ubah peran, nonaktifkan akun) oleh akun yang hanya diberi hak akses modular `PENGATURAN_ADMIN`.
- [x] **[SEDANG - UX / Race Condition] [components/admin/matriks-hak-akses.tsx]**: Diperbaiki dengan mengunci (`disabled`) seluruh baris user yang sedang mengalami mutasi penyimpanan (`prosesSimpan.userId === b.userId`), mencegah tumpang tindih request `aturHakAkses` saat admin mencentang kolom berdekatan secara cepat.
- [x] **[RENDAH - Lint] [components/admin/matriks-hak-akses.tsx:10]**: Menghapus impor `ShieldCheckIcon` yang tidak terpakai sehingga ESLint bersih tanpa peringatan (0 errors, 0 warnings).
- [x] **[RENDAH - UX] [components/admin/matriks-hak-akses.tsx:83]**: Menambahkan normalisasi pencarian NIP (`kBersih`) agar pencarian 18 digit NIP tanpa spasi tetap dapat menemukan data pegawai ber-spasi.
- [x] **[RENDAH - Test] [tests/unit/hak-akses.test.ts]**: Ditambahkan pengujian integritas daftar hak akses dan menu sistem (total 99/99 unit test lulus).
- [x] **[VERIFIKASI QA] [Superadmin Bypass & Anti-Lockout]**: Seluruh helper otorisasi (`punyaHakAkses`, `punyaPeran`, `wajibAdmin`) terverifikasi memberikan bypass mutlak bagi akun `ADMIN` / `admin`. Proteksi anti-lockout pada `aturPeran`, `aturAktifAkun`, dan `aturHakAkses` terbukti aktif menolak pencabutan atau penonaktifan Superadmin. Matriks hak akses juga aman menampilkan akun admin tanpa tautan rusak.