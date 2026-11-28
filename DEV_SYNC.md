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
- **Fase Aktif:** Commit Pembaruan Filter Unit Kerja Data Pegawai (5 Unit Utama + PJLP) & Tema Bawaan **Langit Pagi** Tanpa Deskripsi Dikirim ke GitHub (`main`) untuk Tayang Otomatis di Vercel (Tanpa Migrasi Database / Variabel Baru) — Siap Cek Singkat Pasca-Rilis oleh Debugger / QA
- **Fitur/Modul Aktif:** Penyederhanaan Filter Unit Kerja Data Pegawai (5 Unit Utama + PJLP) & Tema Bawaan **Langit Pagi** Tanpa Deskripsi Tema (`2026-11-28`)
- **Penanggung Jawab Terakhir:** Coder

## 1. Cetak Biru & Skema Data (Diisi oleh Conversation 3 - Architect)
*Rancangan alur sistem, struktur tabel/database, dan daftar file yang harus dibuat/dieksekusi oleh Coder:*

### L. Tata Letak Menu Atas Desktop, Tombol Membulat, & Halaman Beranda Analitik (`2026-11-28`)
1. **Ringkasan & Dampak bagi Pegawai/Admin:**
   - **Ruang kerja lebih lega di laptop/PC:** Menu samping kiri (`SidebarDesktop`) dipindahkan ke bilah atas sehingga seluruh isi halaman (terutama tabel rekap, formulir cuti, dan grafik Beranda) mendapat ruang penuh ke kiri-kanan tanpa terpotong bilah samping. Di layar HP, tombol menu laci samping (`MenuSeluler`) tetap dipertahankan agar mudah dijangkau ibu jari.
   - **Tampilan tombol lebih modern & ramah:** Tombol-tombol aplikasi dan penanda menu aktif diubah menjadi bentuk kapsul yang lebih membulat, serasi dengan animasi kabut *"Abu Terbawa Angin"* yang sudah berjalan.
   - **Beranda lebih informatif & hidup:** Pegawai langsung melihat sisa cuti, tren pemakaian per bulan, komposisi jatah, riwayat pengajuan, rincian kuota 3 tahun, dokumen terbaru, dan jadwal hari libur terdekat — lengkap dengan pemilih tahun dan tombol cepat *Ajukan Cuti*. Akun Admin/Superadmin tanpa data pegawai juga mendapat ringkasan tugas dinas yang berguna tanpa error.
   - **Tanpa perubahan tabel database:** Seluruh fitur memakai tabel yang sudah ada (`saldo_cuti`, `pengajuan_cuti`, `jenis_cuti`, `hari_libur`, `dokumen`, `pegawai`).

2. **Rancangan Tata Letak Menu Atas Desktop vs HP (`app/(aplikasi)/layout.tsx`, `components/tata-letak/navigasi.tsx`, `lib/menu.ts`):**
   - **Penghapusan ruang bilah samping:** Hapus `lg:pl-66` dan `<SidebarDesktop />` pada `app/(aplikasi)/layout.tsx`; seluruh konten `<main>` dan `<header>` sejajar rapi di dalam lebar `mx-auto max-w-7xl`.
   - **3 Zona Bilah Atas (`<header>` berbentuk kapsul `rounded-2xl lg:rounded-full`):**
     - **Kiri:** Di HP (`< lg`), tombol laci `<MenuSeluler />` + merek ringkas *"Cuti ESDM"*. Di desktop (`≥ lg`), `<MerekAtas />` berisi lambang Kalsel (`h-8 w-auto`) + judul *"Cuti ESDM"* yang mengarah ke `/beranda`.
     - **Tengah (khusus desktop `hidden lg:flex`):** `<NavigasiAtas menu={menu} />` dengan aturan pengelompokan cerdas agar **maksimal hanya 5 kapsul** walau akun Admin/Superadmin punya 8 menu penuh (dijamin muat 1 baris lega di layar `1024px–1280px+` tanpa bertabrakan):
       1. **`Beranda`** → tautan kapsul langsung (`/beranda`).
       2. **`Cuti`** → bila pegawai hanya punya 1 menu (*Cuti Saya*), tampil sebagai tautan langsung; bila punya ≥ 2 menu (Atasan / Kepegawaian / Admin: *Cuti Saya*, *Proses Cuti*, *Saldo & Rekap Cuti*), tampil sebagai **1 kapsul dropdown `Cuti ▾`** yang menyala solid saat membuka halaman `/cuti*` mana pun.
       3. **`Pegawai`** *(label ringkas di bilah atas; di laci HP tetap "Data Pegawai")* → tautan kapsul langsung (`/pegawai`, muncul bila punya hak `KELOLA_PEGAWAI`).
       4. **`Dokumen`** → bila hanya punya 1 menu (mis. Superadmin tanpa data pegawai → *Dokumen Organisasi*), tampil sebagai tautan langsung; bila punya 2 menu (*Dokumen Saya* & *Dokumen Organisasi*), tampil sebagai **1 kapsul dropdown `Dokumen ▾`** yang menyala solid saat berada di `/dokumen*`.
       5. **`Admin`** → tautan kapsul langsung (`/admin`, muncul bila punya hak `PENGATURAN_ADMIN`).
     - **Kanan (semua layar):** `<TombolTema />` (sakelar Siang/Malam + palet), ikon lonceng `/notifikasi`, dan `<MenuPengguna />` (pada layar desktop `lg–xl`, batasi lebar teks nama `max-w-36 xl:max-w-48 truncate` agar tidak menyempitkan menu tengah).
   - **Laci HP (`MenuSeluler`):** Tetap tampil rapi pada `< lg` (`Sheet side="left"`) dengan daftar menu lengkap per kelompok, dan item menu aktif diperbarui menjadi kapsul membulat (`rounded-full`) agar seragam dengan desktop.

3. **Rancangan Tombol Lebih Membulat (`components/ui/button.tsx` & Bilah Atas):**
   - Ubah sudut dasar `buttonVariants` dari `rounded-lg` menjadi **`rounded-full`** (kapsul bulat penuh untuk tombol teks `default`/`lg`/`sm`/`xs` serta lingkaran penuh untuk tombol ikon `icon`/`icon-xs`/`icon-sm`/`icon-lg`). Pertahankan `in-data-[slot=button-group]:rounded-lg` untuk grup tombol rapat dan `overflow-visible` untuk varian `link`.
   - **Wajib dijaga:** *Dilarang* menambah elemen anak JSX baru di dalam `Button` agar `asChild` (`Slot.Root`) dan efek kabut `::before`/`::after` tetap 100% aman (karena lapisan kabut memakai `border-radius: inherit`, bentuk kabut otomatis ikut membulat mulus).
   - Selaraskan pula tombol ikon di bilah atas (`TombolTema`, lonceng `/notifikasi`, kapsul `MenuPengguna`) ke `rounded-full`.
   - **Isolasi Mutlak Cetak & Editor:** Lembar cetak A4/Legal (`.lembar-cetak`, `@media print`) dan isi editor surat (`.editor-surat`) tidak memakai komponen `<Button>` untuk kertas isinya sehingga tetap putih murni, teks hitam pekat, dan bentuk kotak formulir/tabel BKN tidak berubah sedikit pun.

4. **Struktur Data Baru & Aturan Hitung Analitik Beranda (`lib/domain/beranda-analitik.ts` & `server/kueri/beranda.ts`):**
   - **Keamanan & Isolasi Data:**
     - `dataBeranda(u, tahunDiminta?)` selalu mengambil identitas pegawai **langsung dari sesi login (`u.pegawai?.id`)** — tidak pernah menerima `pegawaiId` dari URL.
     - Validasi parameter URL `?tahun=YYYY`: hanya terima tahun bulat yang berada dalam daftar `tahunTersedia` (diambil dari tahun saldo/pengajuan yang ada + `tahunSekarang`), selebihnya otomatis kembali ke tahun berjalan WITA.
   - **Aturan Penghitungan Cuti Lintas Bulan & Konsistensi dengan "Sudah Terpakai" (Fungsi Murni di `lib/domain/beranda-analitik.ts`):**
     - Pengajuan yang dihitung ke grafik pemakaian adalah pengajuan yang sudah disetujui (`STATUS_DISETUJUI`: `DISETUJUI`, `SURAT_TERBIT`, `SELESAI`).
     - Untuk setiap pengajuan di `tahun` terpilih (tahunan berdasar `tahunSaldo === tahun`; non-tahunan berdasar tanggal mulai/selesai yang menyentuh `tahun`):
       - **Cuti lintas bulan** (mis. 29 Jan – 3 Feb) dipecah otomatis per hari kerja (pakai `setLibur` & `hariKerja` untuk `HARI_KERJA`) atau per hari kalender (`HARI_KALENDER`) ke masing-masing bulan yang disentuh (`Jan..Des`).
       - **Rekonsiliasi eksak dengan `pengajuan.jumlahHari`:** Bila hari libur pernah berubah sesudah cuti disetujui atau ada cuti lintas tahun yang `tahunSaldo`-nya masuk tahun terpilih, selisih hari disesuaikan secara deterministik pada bulan terakhir rentang di tahun tersebut sehingga **total 12 bulan untuk pengajuan tahunan PASTI sama persis dengan jumlah `pengajuan.jumlahHari` resmi di database**.
       - **Transparansi Saldo Awal dari Impor Excel (`terpakaiAwalImpor`):** Karena sebagian pegawai di produksi sudah punya angka `saldo.terpakai` dari impor Excel sebelum semua riwayat tercatat di aplikasi, hitung `terpakaiTercatatAplikasi` (= total 12 bulan cuti tahunan di grafik) dan `terpakaiAwalImpor = Math.max(0, (saldo?.terpakai ?? 0) - terpakaiTercatatAplikasi)`:
         - Grafik Batang menampilkan rincian bulan yang punya tanggal nyata + catatan jujur di bawah grafik bila `terpakaiAwalImpor > 0` (*"Termasuk X hari dari rekap saldo awal sebelum pencatatan bulanan di aplikasi"*).
         - Grafik Garis Tren Sisa Saldo dimulai dari titik **"Awal"** = `totalHak(saldo) - terpakaiAwalImpor`, lalu turun setiap bulan sebesar pemakaian cuti tahunan bulan tersebut, sehingga **titik akhir bulan Desember PASTI cocok dengan `totalHak(saldo) - saldo.terpakai`** (ditambah info proyeksi setelah dikurangi hari `dipesan`).
         - Grafik Donat menampilkan komposisi utuh `totalHak(saldo)` = **Tersedia** (`saldoTersedia(saldo, dipesan)`), **Terpakai** (`saldo.terpakai`), dan **Diproses** (`dipesan`).
     - **Rincian Kuota 3 Tahun (`N-2`, `N-1`, `tahun`):** Memakai `rincianPemakaian(saldo)` dari `lib/domain/saldo-cuti.ts` untuk menghitung `hak`, `terpakai`, dan `sisa` tiap tahun secara aman (anti pembagian nol `NaN` bila hak = `0`).
   - **Agenda Hari Libur & Cuti Bersama Terdekat:**
     - Ambil maks. **5 hari libur** dari tabel `hari_libur`: jika `tahun === tahunSekarang` ambil yang `tanggal >= hariIni` urut naik; jika memilih tahun lain ambil hari libur pada tahun tersebut.
   - **Dua Mode Data di `dataBeranda(u, tahunDiminta)`:**
     - **Mode `"pegawai"` (`u.pegawai !== null`):** Mengembalikan `hariIni`, `tahun`, `tahunSekarang`, `tahunTersedia`, `saldo`, `dipesan`, `analitik` (`ringkasan`, `bulanan[12]`, `trenSaldo[13]`, `komposisiKuota`, `komposisiJenis`, `rincianKuota[3]`), `pengajuanTerbaru` (maks. 5), `dokumenTerbaru` (maks. 3), `hariLibur` (maks. 5), serta `menunggu` & `sedangCuti` bila pegawai juga berstatus Atasan / pemegang hak proses atau saldo cuti.
     - **Mode `"admin"` (`u.pegawai === null`, mis. Superadmin `admin`/`eerza311`):** Tidak memanggil kueri saldo/dokumen pribadi agar **0 error**; mengembalikan ringkasan dinas sesuai hak akses (`menunggu`, `sedangCuti`, `totalPengajuanTahun`, `totalPegawaiAktif`, `totalAkunAktif`, `analitikDinas` untuk 3 grafik agregat dinas: batang hari cuti per bulan, garis jumlah pengajuan masuk per bulan, donat status pengajuan, plus `pengajuanTerbaruDinas` maks. 5 dan `hariLibur` maks. 5).

5. **Tata Letak Halaman Beranda Baru (`app/(aplikasi)/beranda/page.tsx` & `components/beranda/*`):**
   - **Baris 0 — Header Sambutan:** Tanggal WITA + salam personal + jabatan & unit (untuk pegawai) atau peran (untuk Admin) di kiri; **Filter Tahun** kapsul (`FilterTahunBeranda`) + tombol cepat kapsul **`Ajukan Cuti`** (atau **`Proses Cuti`** untuk Admin tanpa pegawai) di kanan.
   - **Baris 1 — 4 Kartu Ringkasan Angka (`grid-cols-1 sm:grid-cols-2 xl:grid-cols-4`):**
     - *Mode Pegawai:* (1) **Kartu Solid Utama (`bg-primary text-primary-foreground`):** Sisa Cuti Tersedia; (2) Cuti Terpakai; (3) Sedang Diproses; (4) **Adaptif:** Ringkasan Tugas Atasan/Kepegawaian (antrean menunggu & sedang cuti hari ini) bagi Atasan/petugas cuti, atau total **Cuti Lainnya** (Sakit/Alasan Penting/Melahirkan) bagi pegawai biasa.
     - *Mode Admin Tanpa Pegawai:* (1) **Kartu Solid Utama:** Antrean Menunggu Tindakan; (2) Pegawai Sedang Cuti Hari Ini; (3) Total Pengajuan Tahun Terpilih; (4) Pegawai Aktif Terdaftar.
   - **Baris 2 — 3 Grafik Analitik SVG Interaktif Tanpa Library Luar (`components/beranda/grafik-beranda.tsx`):**
     - Seluruhnya dibuat memakai SVG ringan + interaksi hover/ketuk (*tooltip* lokal), tanpa library berat (0 KB paket tambahan), dan memakai warna variabel CSS tema (`--chart-1..5`, `--primary`, `--border`, `--muted-foreground`, `--popover`) sehingga otomatis serasi di **Notion Light**, **Notion Dark**, **Langit Pagi**, dan **Langit Malam**:
       1. **Grafik Batang** penggunaan cuti per bulan (`Jan–Des`, membedakan Cuti Tahunan & Cuti Lainnya).
       2. **Grafik Garis** tren perjalanan sisa saldo (titik `Awal` + `Jan–Des`, dengan penanda proyeksi `dipesan` bila ada).
       3. **Grafik Lingkaran Donat** komposisi jatah cuti (`Tersedia`, `Terpakai`, `Diproses`) dengan angka pusat + legenda jelas (atau komposisi status pengajuan pada Mode Admin).
     - Setiap grafik wajib punya **kondisi kosong (*empty state*) yang rapi** jika belum ada data saldo/pengajuan di tahun terpilih.
   - **Baris 3 — Daftar Bawah (`grid-cols-1 lg:grid-cols-3`):**
     1. **Riwayat Pengajuan Terbaru** (maks. 5 item + lencana status + tautan **"Lihat Semua →"** ke `/cuti` atau `/cuti/proses`).
     2. **Rincian Kuota per Tahun (`N-2`, `N-1`, `tahun`) & Dokumen Terbaru** (3 batang progres kuota + 3 dokumen pribadi terbaru + tautan `/dokumen`; pada Mode Admin diganti kartu **Pintasan Cepat Admin** menuju Hak Akses, Saldo & Rekap, Data Pegawai, Hari Libur).
     3. **Agenda Hari Libur & Cuti Bersama Terdekat** (maks. 5 jadwal dari tabel `hari_libur` dengan kotak tanggal mini dan lencana jenis).

6. **Daftar File Target (untuk Coder & Polesan UI/UX Stylist):**
   1. **`lib/menu.ts`** *(Ubah)*: Tambah `labelRingkas?: string` opsional untuk tampilan bilah atas desktop tanpa mengubah aturan otorisasi `menuUntuk()`.
   2. **`components/tata-letak/navigasi.tsx`** *(Ubah)*: Buat `NavigasiAtas` (kapsul + dropdown grup untuk ≥ 2 item) dan `MerekAtas`; hapus `SidebarDesktop`; perbarui `MenuSeluler` memakai kapsul `rounded-full` untuk item aktif.
   3. **`app/(aplikasi)/layout.tsx`** *(Ubah)*: Hapus `lg:pl-66` & `SidebarDesktop`; pasang tata letak `<header>` 3 zona (`mx-auto max-w-7xl`, `rounded-2xl lg:rounded-full`), selaraskan tombol lonceng `/notifikasi` ke `rounded-full`.
   4. **`components/ui/button.tsx`** *(Ubah)*: Ubah sudut tombol ke `rounded-full` tanpa menambah elemen anak JSX baru (`asChild` & efek kabut tetap aman).
   5. **`components/tata-letak/tombol-tema.tsx` & `components/tata-letak/menu-pengguna.tsx`** *(Ubah)*: Selaraskan bentuk tombol ikon & kapsul akun ke `rounded-full` serta batasi lebar nama di desktop menengah (`max-w-36 xl:max-w-48`).
   6. **`app/globals.css`** *(Ubah)*: Pastikan kontras `--chart-1..5` di `notion-dark` terang terbaca di atas kartu `#222222`, rapikan aturan `aside.kaca` yang sudah tidak terpakai (pertahankan aturan laci HP `[data-slot="sheet-content"][data-side="left"]`), dan pastikan isolasi `.lembar-cetak` & `.editor-surat` tetap utuh.
   7. **`lib/domain/beranda-analitik.ts`** *(Baru)*: Logika murni `bagiHariPerBulan` (akurat lintas bulan & rekonsiliasi `jumlahHari`), `susunAnalitikBeranda`, dan `susunAnalitikDinas`.
   8. **`server/kueri/beranda.ts`** *(Ubah)*: Kueri lengkap Beranda terisolasi per pegawai (dengan filter tahun aman & agenda hari libur) + cabang aman Mode Admin tanpa data pegawai.
   9. **`components/beranda/filter-tahun.tsx`** *(Baru)*: Komponen Client pemilih tahun kapsul untuk header Beranda.
   10. **`components/beranda/grafik-beranda.tsx`** *(Baru)*: Komponen Client 3 grafik SVG interaktif (Batang, Garis, Donat) yang responsif & otomatis mengikuti 4 tema.
   11. **`app/(aplikasi)/beranda/page.tsx`** *(Ubah)*: Tata letak Beranda baru (header + 4 kartu ringkasan + 3 grafik + 3 kartu daftar bawah) untuk Mode Pegawai & Mode Admin.
   12. **`tests/unit/beranda-analitik.test.ts`** *(Baru)*: Unit test Vitest untuk cuti lintas bulan/lintas tahun, konsistensi total vs `terpakai` & `terpakaiAwalImpor`, rincian kuota N-2/N-1/N anti-`NaN`, kondisi kosong, dan analitik Mode Admin.

7. **Skenario Pengecekan Wajib (Coder, UI/UX Stylist, & Debugger/QA):**
   - **Menu Atas & Responsivitas:** Cek akun **Pegawai biasa**, **Atasan**, dan **Superadmin/Admin penuh (8 menu)** di layar `1280×800`, `1024×768`, dan HP `390×844`: pastikan di desktop semua kapsul muat **1 baris rapi tanpa tabrakan**, dropdown *Cuti ▾* & *Dokumen ▾* terbuka mulus dan menyorot item aktif, dan di HP laci menu samping berfungsi normal tanpa gulir ke samping (*no horizontal overflow*).
   - **Tombol Membulat & Efek Kabut:** Cek semua varian tombol (`default`, `penting`, `outline`, `secondary`, `destructive`, `ghost`, `icon`, `link`) dan `<Button asChild>` — sudut bulat penuh mulus, efek kabut *"Abu Terbawa Angin"* ikut melengkung rapi, dan tidak merusak `.lembar-cetak` (`/cetak/formulir/...`, `/cetak/rekap-cuti`) maupun `.editor-surat`.
   - **Beranda Analitik & Keamanan:**
     - Login sebagai **Pegawai** (punya cuti lintas bulan & saldo awal impor): pastikan total grafik bulanan + catatan saldo awal cocok 100% dengan kartu *Cuti Terpakai*, tren saldo berakhir di sisa saldo riil, ganti filter tahun bekerja, semua 3 grafik tampil tajam di **4 tema** (*Notion Light*, *Notion Dark*, *Langit Pagi*, *Langit Malam*), dan data hanya milik pegawai itu sendiri.
     - Login sebagai **Pegawai baru** (0 pengajuan / belum ada saldo): semua kartu & 3 grafik menampilkan kondisi kosong rapi tanpa `NaN` atau error.
     - Login sebagai **Superadmin tanpa data pegawai (`admin`)**: halaman `/beranda` terbuka mulus tanpa error dan menampilkan ringkasan tugas & grafik skala dinas.
   - Jalankan `npm run typecheck`, `npm run lint`, `npm test`, dan `npm run build` — lulus bersih tanpa galat.

### K. Pembaruan Sistem Tema: Notion Light (Bawaan), Notion Dark, Langit Pagi/Malam, & Sakelar Siang/Malam (`2026-11-26`)
1. **Ringkasan & Dampak bagi Pegawai/Admin:**
   - Merapikan pilihan tema aplikasi agar lebih sederhana, konsisten, dan mendukung pergantian **Siang ☀️ ↔ Malam 🌙** secara seragam di semua tema.
   - **Tema bawaan baru (default):** **Notion Light** (`notion-light`, hasil perapian dari *Notion Monokrom* sebelumnya) menjadi tampilan utama saat pegawai pertama kali membuka aplikasi atau halaman login.
   - **Penghapusan tema lama secara aman:** Tema **Cursor Dark** dan **Mossy Stone** dihapus dari daftar pilihan maupun kode warna CSS. Pegawai yang di browsernya masih tersimpan pilihan lama (`cursor-dark`, `mossy-stone`, atau nama lama `notion-monokrom`) akan **otomatis dialihkan mulus ke Notion Light** tanpa error.
   - **2 Gaya Tema × 2 Mode (Siang & Malam) = 4 Tampilan Simetris:**
     1. **Gaya Notion (Bawaan — Minimalis Datar):**
        - Siang: **Notion Light** (`notion-light`) — *"Putih bersih & hitam arang minimalis"*
        - Malam: **Notion Dark** (`notion-dark`) — *"Arang gelap minimalis nyaman mata"*
     2. **Gaya Langit (Nuansa Khas ESDM Kalsel — Kaca Lembut):**
        - Siang: **Langit Pagi** (`langit-pagi`) — *"Biru cerah bersih"*
        - Malam: **Langit Malam** (`langit-malam`) — *"Biru malam tenang"*
   - Perubahan murni di sisi tampilan antarmuka (**tidak ada perubahan tabel database** maupun aturan cuti).

2. **Arsitektur Data & Mekanisme Ganti Siang / Malam (`lib/tema.ts` & `components/tata-letak/tombol-tema.tsx`):**
   - **Tetap Menggunakan 1 Cookie (`tema`) & 1 Atribut `data-tema`:**
     - Menyimpan langsung nilai `IdTema`: `"notion-light" | "notion-dark" | "langit-pagi" | "langit-malam"`, sehingga tidak mungkin terjadi ketidakcocokan antara cookie gaya dan cookie mode.
     - Tambahkan tipe `GayaTema = "notion" | "langit"` dan `ModeTema = "siang" | "malam"`, serta field `gaya`, `mode`, dan `namaGaya` pada `InfoTema` di `lib/tema.ts`.
     - `TEMA_BAWAAN = "notion-light"`.
     - `normalisasiTema(nilai)`: hanya menerima 4 nilai sah di atas; semua nilai lama (`"cursor-dark"`, `"mossy-stone"`, `"notion-monokrom"`) atau nilai tidak dikenal otomatis dikembalikan ke `"notion-light"`.
     - Tambahkan fungsi bantu terpusat di `lib/tema.ts`:
       - `adalahTemaTerang(id)` → `true` untuk `"notion-light"` & `"langit-pagi"`, `false` untuk `"notion-dark"` & `"langit-malam"`.
       - `gayaTema(id)` & `modeTema(id)` → mengambil gaya (`"notion"`/`"langit"`) dan mode (`"siang"`/`"malam"`).
       - `temaDari(gaya, mode)` → membentuk `IdTema` dari pasangan gaya + mode.
       - `balikModeTema(id)` → menukar langsung **Siang ↔ Malam** di dalam gaya yang sedang aktif (`notion-light ↔ notion-dark`, `langit-pagi ↔ langit-malam`).
       - `gantiGayaTema(idSaatIni, gayaBaru)` → berpindah gaya tema sambil **mempertahankan mode Siang/Malam yang sedang aktif** (misal dari *Notion Dark* pindah ke *Langit* otomatis masuk *Langit Malam*, bukan tiba-tiba silau jadi terang).
       - `warnaBilahBrowser(id)` → satu sumber kebenaran warna bilah atas browser HP (`meta[name="theme-color"]`) agar `app/layout.tsx` dan `tombol-tema.tsx` selalu identik: `#FBFBFA` (Notion Light), `#191919` (Notion Dark), `#F0F9FF` (Langit Pagi), `#0B1526` (Langit Malam).
   - **Antarmuka Sakelar Siang/Malam & Menu Tema di Bilah Atas (`components/tata-letak/tombol-tema.tsx`):**
     - Di dalam `TombolTema` (tanpa perlu mengubah struktur `app/(aplikasi)/layout.tsx`), tampilkan 2 tombol ikon kecil berdampingan rapat (`flex items-center gap-0.5`):
       1. **Tombol Cepat 1-Klik Siang/Malam (`SunIcon` / `MoonIcon`):** memakai kelas `.ikon-abu size-10 rounded-xl` — 1 klik langsung menukar **Siang ↔ Malam** pada gaya aktif (menampilkan ikon **Bulan** saat mode Siang dengan label *"Ganti ke mode Malam"*, dan ikon **Matahari** saat mode Malam dengan label *"Ganti ke mode Siang"*).
       2. **Tombol Menu Tema (`PaletteIcon`):** membuka dropdown **Tampilan Aplikasi** yang berisi:
          - **Sakelar Segmen Mode:** dua tombol berdampingan **`☀️ Siang`** dan **`🌙 Malam`** (status aktif tersorot jelas).
          - **Pemisah (`DropdownMenuSeparator`)**
          - **Pilihan Gaya Tema (2 opsi bersih):** **Notion** (*Notion Light / Notion Dark* sesuai mode aktif) dan **Langit** (*Langit Pagi / Langit Malam* sesuai mode aktif), masing-masing menampilkan **3 bulatan pratinjau warna** sesuai mode aktif dengan cincin tepi tegas (`ring-1 ring-foreground/30`).

3. **Palet Warna Lengkap 4 Tema & Struktur CSS Rapi (`app/globals.css`):**
   - **Bersihkan CSS Lama:** Hapus seluruh blok `html[data-tema="cursor-dark"]` dan `html[data-tema="mossy-stone"]` (beserta aturan `.latar-langit`, `.kaca`, `.bg-white`, dan hover miliknya).
   - **Struktur `:root` Anti-Tercemar:**
     - `:root` diisi variabel semantik dasar **Notion Light** (`--background: #fbfbfa`, `--foreground: #2f2e2a`, `--judul: #191919`, `--primary: #191919`, `--card: #ffffff`, `--border: #e5e5e2`, `--radius: 0.875rem`, dsb.) agar fallback awal langsung tampil Notion Light tanpa kilatan biru — **tanpa** menimpa `--color-sky-*`/`--color-slate-*` di `:root` supaya `langit-pagi` tetap memakai warna Tailwind bawaan yang jernih.
     - Masing-masing dari 4 tema didefinisikan rapi di bloknya sendiri:
   - **1) `html[data-tema="notion-light"]` (Bawaan — hasil pindah dari `notion-monokrom`):**
     - Mempertahankan seluruh palet dan polesan Notion Monokrom terang yang sudah teruji: latar datar `#FBFBFA`, kartu `#FFFFFF`, sidebar `#F7F7F5`, garis `#E5E5E2`, teks `#2F2E2A`/`#191919`, tombol utama & tombol penting hitam arang teks putih, lencana pastel pudar ala Notion (`.bg-sky-100.text-sky-900` `#E7F3F8`/`#2B5972`, ungu `#F0ECF7`, hijau `#E6F2EB`, krem `#F7EEDB`, merah `#FBE6E4`), kabut tombol arang tipis di putih & kabut putih tipis di tombol hitam, hover bilah atas `rgb(25 25 25 / 0.06)`.
     - Pratinjau 3 bulatan: `background: "#FBFBFA"`, `foreground: "#191919"`, `accent: "#787774"`.
   - **2) `html[data-tema="notion-dark"]` (Baru — Gelap Monokrom Khas Notion):**
     - `color-scheme: dark;` — datar bersih tanpa kaca buram maupun motif awan.
     - Permukaan: `--background: #191919`, `--sidebar: #202020`, `--card: #222222`, `--popover: #252525`, `--secondary: #2A2A2A`, `--muted: #262626`, `--accent: #2F2F2F`, `--border: #333333`, `--input: #3F3F3F`.
     - Teks & tombol monokrom (kontras ≥ 4,5:1): `--judul: #F2F2F0`, `--foreground`/`--brand`: `#E6E6E3`, `--muted-foreground: #9B9A97`, `--primary`/`--sidebar-primary: #EBEBE8` dengan teks gelap `#191919`, tombol penting `--emas: #D6D5D0` dengan teks gelap `#191919` (tetap monokrom), `--merah`/`--destructive: #E06C65`, `--ring: #D6D5D0`.
     - Kartu `.kaca`: `#222222` datar, garis `#333333`, bayangan halus; `aside.kaca` & laci HP: `#202020`; `header > .kaca`: `#222222`.
     - Skala `slate` & `sky` dinetralkan ke arang hangat gelap (`#F5F5F3` s.d. `#1F1F1F`) agar tabel & garis pemisah bersih monokrom; lencana status cuti memakai pastel gelap kalem khas Notion Dark: biru `.bg-sky-100.text-sky-900` (`#1D2D3B` / teks `#A6D0EC`), ungu (`#2A2238` / `#C8B6E8`), hijau (`#1C2E25` / `#8EC9AA`), krem (`#332919` / `#E6C37A`), merah (`#382020` / `#F0A5A0`), abu-abu selesai (`#2E2E2E` / `#D4D4D0`).
     - Permukaan `.bg-white` (input, tombol bingkai, kotak cari — **kecuali `.lembar-cetak` & `.editor-surat`**) diubah ke `#222222` (hover `#2F2F2F`), teks input/select `#E6E6E3`, `select option` `#222222`, `.hover\:bg-white\/60:hover` menjadi `rgb(255 255 255 / 0.08)`.
     - Efek kabut tombol "Abu Terbawa Angin": permukaan gelap memakai kabut putih/perak tipis (`--abu-kabut: rgb(255 255 255 / 0.11)`, `--abu-aksen: rgb(255 255 255 / 0.22)`, `--abu-pendar: rgb(255 255 255 / 0.11)`), sedangkan **tombol utama & tombol penting** (yang berlatar terang `#EBEBE8`/`#D6D5D0`) memakai **kabut arang tipis** (`--abu-kabut-terang: rgb(25 25 25 / 0.12)`, `--abu-kabut-emas: rgb(25 25 25 / 0.12)`) agar tetap tampak lembut di atas tombol terang; tombol hapus memakai `--abu-kabut-merah: rgb(224 108 101 / 0.2)`.
     - Pratinjau 3 bulatan: `background: "#191919"`, `foreground: "#E6E6E3"`, `accent: "#787774"`.
   - **3) `html[data-tema="langit-pagi"]` (Dipertahankan — Pasangan Siang Gaya Langit):**
     - Mempertahankan penuh tampilan Langit Pagi asli: latar motif awan + gradasi `#F0F9FF → #E0F2FE → #BAE6FD`, kartu kaca buram `rgb(255 255 255 / 0.78)`, tombol `#0369A1`, tombol penting emas Kalsel `#E8B923`, aksen `#0EA5E9`, kabut embun biru muda.
     - Pratinjau 3 bulatan: `background: "#F0F9FF"`, `foreground: "#0F172A"`, `accent: "#0EA5E9"`.
   - **4) `html[data-tema="langit-malam"]` (Baru — Pasangan Malam Gaya Langit):**
     - `color-scheme: dark;` — langit malam biru dongker tenang serasi dengan karakter kaca buram Langit Pagi.
     - Latar `.latar-langit`: gradasi `#0B1526 → #0F1E36 → #132847` dengan pendar lembut biru langit (`rgb(56 189 248 / 0.14)`).
     - Permukaan: `--background: #0B1526`, `--card: rgb(16 30 52 / 0.84)`, `--popover: #101E34`, `--sidebar: rgb(13 25 44 / 0.9)`, `--secondary: #172B49`, `--muted: #142540`, `--accent: #1C3458`, `--border: #1F3556`, `--input: #2E4A73`.
     - Teks & tombol (kontras tinggi): `--judul: #F0F9FF`, `--foreground: #E8F1FA`, `--muted-foreground: #93B0CE`, `--brand`/`--primary`/`--ring`: `#38BDF8` dengan `--primary-foreground: #082032`, tombol penting emas Kalsel `--emas: #F5C542` (`--emas-foreground: #1C1503`), `--merah`/`--destructive: #F87171`.
     - Kartu `.kaca`: efek kaca gelap biru malam dengan garis tepi `rgb(125 211 252 / 0.18)`; seluruh `.bg-white`, `input`/`textarea`/`select`, `select option`, skala `slate`/`sky`/`indigo`/`emerald`/`amber`/`red`/`rose`, dan `.hover\:bg-white\/60:hover` (`rgb(125 211 252 / 0.14)`) disesuaikan untuk kontras tinggi di latar biru malam (mengecualikan `.lembar-cetak` & `.editor-surat`).
     - Efek kabut tombol: embun biru langit lembut (`--abu-kabut: rgb(125 211 252 / 0.16)`, `--abu-kabut-terang: rgb(255 255 255 / 0.24)`, `--abu-kabut-emas: rgb(255 250 220 / 0.3)`, `--abu-aksen: rgb(56 189 248 / 0.34)`, `--abu-pendar: rgb(125 211 252 / 0.18)`).
     - Pratinjau 3 bulatan: `background: "#0B1526"`, `foreground: "#E8F1FA"`, `accent: "#38BDF8"`.

4. **Hal Wajib Dijaga (Anti-Bug & Isolasi):**
   - **Pop-up Notifikasi (`components/ui/sonner.tsx`):** Ubah nilai awal `useState` dan fallback SSR `bacaTemaSonner()` dari `"dark"` menjadi **`"light"`** (karena bawaan sekarang **Notion Light**), serta tetap sinkron otomatis via `adalahTemaTerang(normalisasiTema(...))` (`"light"` untuk `notion-light` & `langit-pagi`, `"dark"` untuk `notion-dark` & `langit-malam`).
   - **Isolasi Lembar Cetak A4/Legal & Editor Surat:** `.lembar-cetak`, `@media print`, dan `.editor-surat` tetap 100% putih murni `#FFFFFF`, teks hitam pekat `#000000`, tanpa efek kabut tombol di ke-4 tema (termasuk `notion-dark` & `langit-malam`). Perbarui selector `.lembar-cetak .bilah-cetak` dari `notion-monokrom` menjadi `notion-light` (dan pastikan tombol di `.bilah-cetak` tetap tegas terbaca di `notion-dark` & `langit-malam` tanpa menyentuh kertas cetaknya).
   - **Tidak Ada Kedipan Warna (*No Flash*):** `app/layout.tsx` membaca `KUKI_TEMA` lewat `normalisasiTema()` di server dan langsung merender `<html data-tema={tema}>` + `themeColor: warnaBilahBrowser(tema)`.

5. **Daftar 6 File Target (untuk Coder):**
   1. **`lib/tema.ts`** *(Ubah)*: Definisikan 4 tema (`notion-light`, `notion-dark`, `langit-pagi`, `langit-malam`), `GayaTema`, `ModeTema`, `TEMA_BAWAAN = "notion-light"`, normalisasi tema lama (`cursor-dark`, `mossy-stone`, `notion-monokrom`) → `"notion-light"`, serta helper `adalahTemaTerang`, `gayaTema`, `modeTema`, `temaDari`, `balikModeTema`, `gantiGayaTema`, dan `warnaBilahBrowser`.
   2. **`app/globals.css`** *(Ubah)*: Hapus blok `cursor-dark` & `mossy-stone`; ubah `:root` ke variabel dasar Notion Light; ganti `notion-monokrom` → `notion-light`; tambah blok lengkap `notion-dark`, `langit-pagi`, dan `langit-malam` (termasuk `.latar-langit`, `.kaca`, `.bg-white`, input/select, hover, lencana status, dan token kabut `--abu-*`) dengan pengecualian ketat terhadap `.lembar-cetak` dan `.editor-surat`.
   3. **`components/tata-letak/tombol-tema.tsx`** *(Ubah)*: Tambahkan tombol cepat 1-klik **Siang/Malam** (`SunIcon`/`MoonIcon`) di sebelah ikon palet, serta perbarui isi dropdown menjadi sakelar **Siang / Malam** + pilihan 2 gaya (**Notion** & **Langit**) lengkap dengan 3 bulatan pratinjau warna yang mengikuti mode aktif, dan gunakan `warnaBilahBrowser(id)` untuk `meta[name="theme-color"]`.
   4. **`components/ui/sonner.tsx`** *(Ubah)*: Ubah default state & fallback SSR menjadi `"light"` mengikuti tema bawaan baru `notion-light`, tetap memakai `adalahTemaTerang(normalisasiTema(...))`.
   5. **`app/layout.tsx`** *(Ubah)*: Gunakan `warnaBilahBrowser(tema)` pada `generateViewport()` agar warna bilah atas browser HP identik dengan `tombol-tema.tsx` di semua 4 tema.
   6. **`tests/unit/tema.test.ts`** *(Ubah)*: Perbarui seluruh pengujian unit untuk memverifikasi `TEMA_BAWAAN === "notion-light"`, daftar tepat 4 tema (`notion-light`, `notion-dark`, `langit-pagi`, `langit-malam`), penghapusan `cursor-dark` & `mossy-stone`, normalisasi nilai lama (`cursor-dark`, `mossy-stone`, `notion-monokrom`) → `"notion-light"`, serta pengujian `adalahTemaTerang`, `balikModeTema`, `gantiGayaTema`, `temaDari`, dan `warnaBilahBrowser`.

6. **Skenario Pengecekan Wajib (Coder, UI/UX Stylist, & Debugger/QA):**
   - Uji pengguna baru (tanpa cookie) & pengguna dengan cookie lama (`tema=cursor-dark`, `tema=mossy-stone`, `tema=notion-monokrom`): halaman `/login` dan `/beranda` otomatis terbuka dalam **Notion Light** tanpa error.
   - Uji tombol cepat 1-klik **Siang ↔ Malam** di bilah atas: menukar **Notion Light ↔ Notion Dark** dan **Langit Pagi ↔ Langit Malam** secara instan; uji pindah gaya **Notion ↔ Langit** di dropdown saat mode Malam aktif tetap bertahan di mode Malam (**Notion Dark ↔ Langit Malam**).
   - Cek tampilan di layar laptop (`1280×800`) dan HP (`390×844`) pada `/beranda`, `/cuti/ajukan`, `/cuti/proses`, `/pegawai`, `/admin/hak-akses`: pastikan form, dropdown `<select>`, tabel, lencana status cuti, notifikasi pop-up (*toast*), dan efek kabut tombol terbaca jernih di ke-4 tema (khususnya **Notion Dark** dan **Langit Malam**), serta bilah atas HP tidak berdesakan.
   - Cek `/cetak/formulir/...` (atau `/cetak/rekap-cuti`) dan editor surat saat **Notion Dark** & **Langit Malam** aktif: kertas tetap putih bersih `#FFFFFF`, teks hitam pekat `#000000`, bebas efek kabut tombol.
   - Jalankan `npm run typecheck`, `npm run lint`, `npm test`, dan `npm run build` — lulus bersih tanpa galat.

### J. Tema Tampilan Ke-4: Notion Monokrom (`notion-monokrom`) (`2026-11-26`)
1. **Ringkasan & Dampak bagi Pegawai/Admin:**
   - Menambahkan pilihan tema ke-4 bernama **Notion Monokrom** (`id: "notion-monokrom"`, keterangan: *"Putih bersih & hitam arang minimalis"*) pada menu **Pilih Tema Tampilan** di pojok kanan atas aplikasi.
   - Memberikan pilihan tampilan terang yang sangat tenang, datar, dan rapi seperti halaman catatan kertas putih bersih (tanpa motif awan biru atau kaca buram) dengan teks serta tombol hitam arang yang nyaman dibaca lama.
   - Tema bawaan aplikasi (**Cursor Dark**) tidak diubah — pegawai bebas memilih dari 4 tema (**Cursor Dark**, **Langit Pagi**, **Mossy Stone**, dan **Notion Monokrom**) dan pilihannya tetap tersimpan saat keluar maupun membuka ulang aplikasi.
   - Perubahan murni di sisi tampilan antarmuka (**tidak ada perubahan tabel database** maupun aturan cuti).

2. **Palet Warna Lengkap Notion Monokrom (`app/globals.css` — `html[data-tema="notion-monokrom"]`):**
   - **Skema & Permukaan Datar (Putih Kertas Bersih):**
     - `color-scheme: light;`
     - Latar halaman (`--background`) & `.latar-langit`: **`#FBFBFA`** polos datar (`background-image: none;`, tanpa motif awan/gradasi biru).
     - Kartu & dialog (`--card`, `--popover`, `.kaca`): putih bersih solid **`#FFFFFF`** tanpa efek kaca buram (`backdrop-filter: none`), garis tepi abu-abu halus **`#E5E5E2`**, dan bayangan super tipis (`0 1px 2px rgb(25 25 25 / 0.04)`).
     - Bilah menu samping desktop (`--sidebar`, `aside.kaca`): abu-abu kertas sangat lembut **`#F7F7F5`** dengan garis tepi **`#E5E5E2`** agar area menu terpisah halus dari isi halaman seperti di Notion.
     - Bilah atas mengambang (`header > .kaca`): putih bersih hampir pekat (`rgb(255 255 255 / 0.96)` dengan `backdrop-filter: blur(10px)`) supaya tulisan halaman tidak membayang tembus saat digulir.
   - **Teks, Garis, & Tombol Utama Monokrom (Kontras ≥ 4,5:1):**
     - Judul (`--judul`): **`#191919`** (hitam arang pekat).
     - Teks utama (`--foreground`, `--card-foreground`, `--popover-foreground`, `--brand`): **`#2F2E2A`** (hitam arang lembut, nyaman dibaca lama).
     - Teks keterangan sekunder (`--muted-foreground`): **`#6B6A66`** (abu-abu hangat).
     - Tombol utama & item menu aktif (`--primary` / `--sidebar-primary`): **`#191919`** dengan teks putih **`#FFFFFF`** (`--primary-foreground`).
     - **Tombol Aksi Penting (`variant="penting"` / `--emas`) — Sesuai Keputusan Rapat Kantor:** Diredam menjadi hitam arang **`#2F2E2A`** dengan teks putih **`#FFFFFF`** (`--emas-foreground`) agar seluruh layar tetap monokrom tenang (tidak mencolok kuning).
     - Tombol sekunder & latar permukaan lembut (`--secondary`, `--muted`): **`#F1F1EF`**; latar hover ringan (`--accent`): **`#EFEFED`**; garis tepi (`--border`): **`#E5E5E2`**; garis kotak input (`--input`): **`#D3D3CE`**; cincin fokus keyboard (`--ring`): **`#2F2E2A`**.
     - Peringatan & tombol hapus/tolak (`--merah`, `--destructive`): merah bata kalem **`#C4554D`**.
   - **Penetralan Sisa Warna Biru Langit (`sky-*`) & `slate-*`:**
     - Skala `--color-slate-950` s.d. `--color-slate-50` diselaraskan ke abu-abu arang hangat (`#191919` s.d. `#F7F7F5`).
     - Skala `--color-sky-50` (`#F7F7F5`), `--color-sky-100` (`#EBEBE8`), `--color-sky-200` (`#DFDFDC`), hingga `--color-sky-950` (`#191919`) dinetralkan ke abu-abu hangat agar garis pemisah tabel (`divide-sky-100`, `border-sky-100`), efek hover baris (`hover:bg-sky-50/70`), hover menu samping (`hover:bg-sky-100`), kotak ringkasan (`bg-sky-50`), dan tombol pilih file (`file:bg-sky-100`) tampil 100% bersih tanpa belang biru.
   - **Lencana Status Cuti & Kotak Pesan (Pastel Pudar Kalem Ala Notion):**
     - **Diajukan & Disetujui Atasan** *(aturan khusus `html[data-tema="notion-monokrom"] .bg-sky-100.text-sky-900:not(.lembar-cetak):not(.lembar-cetak *):not(.editor-surat):not(.editor-surat *)` agar tetap berwarna pastel meski garis `sky-100` dinetralkan)*: latar biru pastel pudar **`#E7F3F8`**, teks **`#2B5972`**.
     - **Diverifikasi Kepegawaian (`indigo-*`):** latar ungu pastel pudar **`#F0ECF7`** (`--color-indigo-100`), teks **`#4F3A6B`** (`--color-indigo-900`).
     - **Disetujui, Surat Terbit, & Pesan Sukses (`emerald-*`):** latar hijau sage pastel pudar **`#E6F2EB`** (`--color-emerald-100`) / **`#F2F7F4`** (`--color-emerald-50`), teks **`#1F4D37`** (`--color-emerald-900`).
     - **Catatan & Peringatan (`amber-*`):** latar krem pastel pudar **`#F7EEDB`** (`--color-amber-100`) / **`#FBF7EE`** (`--color-amber-50`), teks **`#593B10`** (`--color-amber-900`).
     - **Ditolak & Pesan Error (`red-*` / `rose-*`):** latar merah muda pudar **`#FBE6E4`** (`--color-red-100`) / **`#FDF3F2`** (`--color-red-50`), teks **`#732520`** (`--color-red-900`).
     - **Selesai & Dibatalkan (`slate-200`):** latar abu-abu kertas **`#E9E9E6`**, teks **`#37352F`** / **`#55534E`**.

3. **Aturan Efek Kabut Tombol "Abu Terbawa Angin" untuk Notion Monokrom (`app/globals.css`):**
   - Permukaan putih/terang (tombol `outline`, `secondary`, kartu klik `.kartu-abu`, menu samping `.nav-abu`): memakai kabut abu-abu arang tipis `--abu-kabut: rgb(25 25 25 / 0.08)` dan pendar tepi tipis `--abu-aksen: rgb(25 25 25 / 0.18)`.
   - Tombol hitam arang (`default` & item menu aktif): memakai kabut putih tipis `--abu-kabut-terang: rgb(255 255 255 / 0.18)` agar teks putih tetap tajam.
   - Tombol aksi penting (`penting`, yang kini berwarna hitam arang): memakai kabut putih tipis `--abu-kabut-emas: rgb(255 255 255 / 0.18)` dan pendar tepi arang `--abu-aksen-emas: rgb(25 25 25 / 0.24)` (bukan pendar kuning).
   - Tombol hapus/tolak (`destructive`): memakai kabut merah bata lembut `--abu-kabut-merah: rgb(196 85 77 / 0.14)`.
   - Tombol ikon kecil, `ghost`, & ikon bilah atas (`.ikon-abu`): memakai pendar abu-abu arang tipis `--abu-pendar: rgb(25 25 25 / 0.08)`.

4. **Hal Wajib Dijaga (Checklist Hasil Rapat Kantor):**
   - **Kotak Pesan Pop-up (*Toast* di `components/ui/sonner.tsx`):** Pastikan mode **`"light"`** aktif untuk **kedua tema terang** (`"langit-pagi"` **dan** `"notion-monokrom"`), bukan hanya `"langit-pagi"`. Gunakan helper `adalahTemaTerang()` dari `lib/tema.ts` supaya tidak mudah terlewat di kemudian hari.
   - **Bilah Atas Browser HP & Efek Hover Bilah Atas Aplikasi:**
     - Pada `lib/tema.ts`, daftarkan warna latar Notion Monokrom **`#FBFBFA`** (`background: "#FBFBFA"`, `foreground: "#191919"`, `accent: "#787774"`). Dengan begitu, baik `components/tata-letak/tombol-tema.tsx` (`terapkanKeDom`) maupun `app/layout.tsx` (`generateViewport`) otomatis menyetel `meta[name="theme-color"]` bilah atas browser HP menjadi putih kertas bersih **`#FBFBFA`**.
     - Pada `app/globals.css`, tambahkan aturan `html[data-tema="notion-monokrom"] .hover\:bg-white\/60:hover { background-color: rgb(25 25 25 / 0.06); }` (serta `.hover\:bg-white:not(.lembar-cetak):not(.lembar-cetak *):not(.editor-surat):not(.editor-surat *):hover { background-color: #f1f1ef; }`) agar tombol Pilih Tema, ikon Notifikasi, menu Akun di bilah atas, dan tombol berlatar putih tetap terasa jelas saat disentuh kursor di atas latar putih (tidak "hilang").
   - **3 Bulatan Pratinjau Warna di Dropdown Menu (`components/tata-letak/tombol-tema.tsx`):**
     - Gunakan 3 warna monokrom yang mudah dibedakan pada 3 bulatan kecil (**putih kertas `#FBFBFA`**, **hitam arang `#191919`**, **abu-abu batu `#787774`**) dan perkuat batas garis lingkarannya menjadi `ring-1 ring-foreground/30` agar bulatan putih tetap memiliki tepi tegas di atas menu putih maupun menu gelap.
   - **Isolasi Mutlak Lembar Cetak A4/Legal & Editor Surat:**
     - Jangan mengubah ukuran sudut (`--radius`), warna teks, atau gaya garis di dalam `.lembar-cetak`, `@media print`, maupun `.editor-surat`. Pastikan seluruh aturan tambahan `html[data-tema="notion-monokrom"]` yang menyasar kelas utilitas selalu mengecualikan `:not(.lembar-cetak):not(.lembar-cetak *):not(.editor-surat):not(.editor-surat *)`, dan lembar cetak tetap putih murni `#FFFFFF`, teks hitam pekat `#000000`, serta bebas efek kabut tombol.

5. **Daftar 5 File Target (untuk Coder):**
   1. **`lib/tema.ts`** *(Ubah)*:
      - Tambah `"notion-monokrom"` ke tipe `IdTema` dan daftarkan di `DAFTAR_TEMA` (`nama: "Notion Monokrom"`, `keterangan: "Putih bersih & hitam arang minimalis"`, `warna: { background: "#FBFBFA", foreground: "#191919", accent: "#787774" }`).
      - Pertahankan `TEMA_BAWAAN = "cursor-dark"`, perbarui `normalisasiTema()` agar menerima `"notion-monokrom"`, dan ekspor helper `adalahTemaTerang(id: IdTema): boolean` (`id === "langit-pagi" || id === "notion-monokrom"`).
   2. **`app/globals.css`** *(Ubah)*:
      - Tambah blok lengkap `html[data-tema="notion-monokrom"]` (seluruh token warna dasar, `--emas` monokrom, token kabut `--abu-*`, skala warna netral `slate`/`sky` & pastel pudar `indigo`/`emerald`/`amber`/`red`/`rose`).
      - Tambah aturan latar datar `.latar-langit`, kartu datar `.kaca` (termasuk `aside.kaca` & `header > .kaca`), lencana biru pastel `.bg-sky-100.text-sky-900`, serta efek hover `.hover\:bg-white\/60:hover` dan `.hover\:bg-white:hover` dengan pengecualian ketat terhadap `.lembar-cetak` dan `.editor-surat`.
   3. **`components/tata-letak/tombol-tema.tsx`** *(Ubah)*:
      - Pastikan `terapkanKeDom()` menyetel `meta[name="theme-color"]` memakai `info.warna.background` (`#FBFBFA`) untuk `notion-monokrom`.
      - Perkuat batas garis 3 bulatan pratinjau warna di dropdown (`ring-1 ring-foreground/30`) agar bulatan putih tema Notion (dan tema lainnya) tampak tegas batasnya.
   4. **`components/ui/sonner.tsx`** *(Ubah)*:
      - Perbarui `bacaTemaSonner()` menggunakan `adalahTemaTerang(normalisasiTema(document.documentElement.dataset.tema))` agar kotak pesan pop-up tampil dalam mode terang (`"light"`) saat `notion-monokrom` maupun `langit-pagi` aktif.
   5. **`tests/unit/tema.test.ts`** *(Ubah)*:
      - Tambah pengujian unit untuk memverifikasi `DAFTAR_TEMA` berisi 4 tema termasuk `notion-monokrom` beserta palet warnanya, `TEMA_BAWAAN` tetap `"cursor-dark"`, `normalisasiTema("notion-monokrom")` lulus, dan `adalahTemaTerang()` mengembalikan hasil benar untuk ke-4 tema.

6. **Skenario Pengecekan Wajib (Coder, UI/UX Stylist, & Debugger/QA):**
   - Uji ganti tema bolak-balik di browser (**Cursor Dark → Notion Monokrom → Langit Pagi → Mossy Stone → Notion Monokrom**) di layar laptop (`1280×800`) dan HP (`390×844`): pastikan pilihan tersimpan setelah refresh & keluar ke `/login`.
   - Cek visual di halaman `/beranda`, `/cuti/proses`, `/cuti/ajukan`, `/admin`, `/admin/hak-akses`, dan `/dokumen/organisasi`: permukaan putih datar rapi, tombol utama & tombol penting hitam arang dengan efek kabut putih tipis, tombol outline & kartu klik `.kartu-abu` berkabut abu-abu arang tipis, tombol bilah atas terlihat saat di-hover, 3 bulatan pratinjau Notion jelas tepinya, seluruh 8 status cuti terbedakan jelas dalam warna pastel pudar kalem, dan notifikasi pop-up (*toast*) tampil terang rapi.
   - Cek halaman cetak (`/cetak/formulir/...` atau `/cetak/rekap-cuti`) dan editor surat (`/cuti/[id]/surat/...`) saat **Notion Monokrom** aktif: kertas tetap putih murni, teks hitam pekat, garis/sudut tidak berubah, dan bebas efek kabut tombol.
   - Jalankan `npm run typecheck`, `npm run lint`, `npm test`, dan `npm run build` — pastikan lulus tanpa galat.

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

### File Baru/Diubah (Filter Unit Kerja Data Pegawai & Tema Bawaan Langit Pagi — `2026-11-28`)
- `lib/domain/unit.ts`: Menambahkan konstanta `FILTER_UNIT_PJLP = "PJLP"` dan fungsi murni `susunOpsiUnitFilterPegawai()` untuk menyusun tepat 6 pilihan ringkas dropdown filter Data Pegawai (**Sekretariat**, **Geologi**, **Pertambangan**, **Energi**, **Ketenagalistrikan**, dan **PJLP**), terpisah penuh dari `urutkanPohon()` yang tetap mempertahankan seluruh daftar seksi/subbagian untuk form Tambah/Ubah Pegawai.
- `server/kueri/pegawai.ts` & `components/pegawai/filter-pegawai.tsx`:
  - Memperbarui `skemaFilterPegawai` agar menerima `"PJLP"` selain UUID unit yang sah (nilai asing tetap ditolak aman menjadi `undefined`).
  - Memperbarui `kondisiFilter()` agar pilihan `unit=PJLP` menyaring `statusKepegawaian: "NON_ASN"`, sedangkan pilihan 5 unit utama tetap ikut menyertakan seluruh subbagian/seksi turunannya lewat `idTurunan()`. Karena `/api/ekspor/pegawai` (biasa & `+ data pribadi`) serta `/cetak/pegawai` sama-sama memakai `bacaFilter()` dan `kondisiFilter()`, ekspor Excel & cetak PDF otomatis ikut menyaring PJLP maupun unit utama secara akurat.
  - Memisahkan `opsi.unitFilter` (khusus `FilterPegawaiForm` di `/pegawai`) dari `opsi.unit` (tetap lengkap untuk `components/pegawai/form-pegawai.tsx`).
- `lib/tema.ts`, `app/globals.css`, & `components/tata-letak/tombol-tema.tsx`:
  - Mengubah `TEMA_BAWAAN` menjadi **`"langit-pagi"`** (pengguna baru maupun cookie tema lama otomatis diarahkan ke **Langit Pagi**), sekaligus menyelaraskan `:root`, `.latar-langit`, dan `.kaca` bawaan ke **Langit Pagi** agar tidak berkedip saat halaman pertama kali dibuka (tetap menjaga `notion-light`, `notion-dark`, `langit-pagi`, `langit-malam`, `.lembar-cetak`, dan `.editor-surat` 100% utuh).
  - Menghapus properti `keterangan` dari `InfoTema` / `DAFTAR_TEMA` dan teks deskripsi di menu dropdown `TombolTema`, sehingga dropdown kini lebih ringkas (`w-52 rounded-2xl`) dan hanya menampilkan **3 bulatan warna + nama tema** (`Langit Pagi`, `Langit Malam`, `Notion Light`, `Notion Dark`).
- `tests/unit/tema.test.ts` & `tests/unit/filter-pegawai.test.ts` *(Baru)*: Memperbarui pengujian tema (`TEMA_BAWAAN === "langit-pagi"`, tanpa `keterangan`) dan menambahkan pengujian unit filter 6 unit utama + PJLP, keutuhan pohon unit lengkap untuk form pegawai, validasi `bacaFilter`, serta kondisi query `kondisiFilter`.
- **Verifikasi Lokal Coder (`2026-11-28`, Node.js v22.23.5 Laragon):** `npm run typecheck` OK, `npm run lint` OK (0 error/warning), `npm test` **149/149 lulus** (18 file uji), dan `npm run build` OK (44/44 rute).

### File Diubah (Panduan Setup Lokal Tanpa Docker: Laragon / PostgreSQL Windows — `2026-11-28`, tanpa perubahan kode aplikasi)
- `README.md`: Memperbarui bagian **Prasyarat** dan **Menjalankan di komputer lokal** dengan menambahkan **Opsi A — Tanpa Docker (Laragon / PostgreSQL Windows)** langkah demi langkah (memastikan Docker mati di port `5432`, memasang/menyalakan PostgreSQL di Laragon/Windows, membuat user `cuti` + database `cuti_esdm` + ekstensi `pg_trgm`, memastikan `DATABASE_URL` mengarah ke `localhost` dan mengosongkan `GOTENBERG_URL=` agar cetak memakai dialog browser, lalu menjalankan `npm run db:migrate`, `npm run db:seed`, dan `npm run dev`), sambil tetap menyimpan **Opsi B — Memakai Docker Desktop** sebagai alternatif.
- `.env.example`: Mengosongkan nilai bawaan `GOTENBERG_URL=` disertai keterangan jelas agar penyalinan `.env` lokal baru langsung berjalan mulus tanpa Docker Gotenberg.
- **Pemeriksaan Kondisi Komputer Lokal (`2026-11-28`):** Terkonfirmasi `C:\laragon` dan Node.js (`C:\laragon\bin\nodejs\node-v22`) sudah terpasang, port `5432` sedang kosong/bebas, `DATABASE_URL` di `.env` lokal sudah mengarah ke `localhost` (bukan Neon produksi), dan `GOTENBERG_URL` di `.env` lokal hanya tinggal dikosongkan oleh pemilik proyek.

### File Baru/Diubah (Sesi AI Agent Baru "Academic Document Specialist" — `2026-11-28`, tanpa perubahan kode aplikasi)
- *Catatan nama:* Sesi ini semula bernama "Laporan PKL" (`/laporan-pkl`), lalu diganti menjadi **Academic Document Specialist** (`/academic-document-specialist`) agar tidak bentrok dengan dokumen Laporan PKL milik pemilik proyek. Kata "Laporan PKL" di bawah ini merujuk ke **dokumennya**, bukan nama AI Agent.
- `ai-agents/Academic-Document-Specialist.md` *(Baru)*: Panduan lengkap AI Agent **Academic Document Specialist** — identitas laporan (Muhammad Erza Abdillah, NPM `2310010310`, judul, ID dokumen Google Docs `1WbCc3F3rLHD-bG1jfFXMktYg9MkCWccN5gXeq3Qo71w`, akun `eerza211@gmail.com`), batas kewenangan (dilarang mengubah kode aplikasi; hanya membaca `DEV_SYNC.md`, `package.json`, `prisma/schema.prisma`, `docs/RANCANGAN.md`, `app/`, `components/`, `server/`, `lib/` sebagai sumber fakta), protokol aman Google Docs/Drive (cek struktur & komentar dulu, dilarang menimpa dokumen total atau menghapus permanen tanpa izin tegas), standar format kampus `Contoh Laprakk.pdf` (A4, margin 4-4-3-3 cm, Times New Roman 12 pt hitam, rata kiri-kanan menjorok baris pertama, nomor halaman Romawi/Arab, susunan Cover s.d. Lampiran, format caption `Gambar`/`Table`, Daftar Pustaka gaya APA tanpa referensi karangan), serta daftar temuan awal ketidaksesuaian draf lama vs kode asli. Perintah CLI sudah dicocokkan dengan panduan resmi plugin `gdocs`/`gdrive` (mis. `mutate replace` yang tidak ada diganti `mutate sed`; `--replace-all` kini hanya disebut sebagai `mutate batch --replace-all` yang dilarang pada tab utama), dan angka tabel database dikoreksi menjadi **37 tabel** sesuai `prisma/schema.prisma`.
- `.agents/skills/academic-document-specialist/SKILL.md` *(Baru)*: Skill agar perintah slash `/academic-document-specialist` bisa langsung dipanggil.
- `ai-agents/README.md` & `AGENTS.md` *(Diubah)*: Mendaftarkan sesi **Academic Document Specialist** (`/academic-document-specialist`) ke tabel & daftar AI Agent (blok `nextjs-agent-rules` di `AGENTS.md` tidak disentuh) dan menambahkan `Academic Document Specialist` ke daftar nama AI Agent tujuan pada aturan *Prompt Penerus*. Aturan bahasa ramah pemula tetap utuh.
- **Verifikasi Lokal (`2026-11-28`):** Hanya file dokumentasi/panduan (`.md`) yang berubah; verifikasi penuh (`typecheck`, `lint`, `147/147` unit test) kemudian telah dijalankan & lulus bersih oleh Debugger/QA menggunakan Node.js v22.23.5 di lingkungan Laragon. Kemampuan membaca Google Docs sungguhan tetap dijalankan langsung oleh sesi `Academic Document Specialist` dengan akun `eerza211@gmail.com`.

### File Baru
- `lib/domain/beranda-analitik.ts`: Fungsi murni analitik Beranda — `bagiHariPerBulan()` (memecah cuti lintas bulan/lintas tahun berdasar hari kerja/kalender & rekonsiliasi eksak terhadap `jumlahHari`), `pilihTahunBeranda()` (validasi filter tahun aman), `susunAnalitikBeranda()` (ringkasan angka, bulanan Jan–Des, tren saldo 13 titik termasuk transparansi `terpakaiAwalImpor`, donat komposisi kuota, dan rincian kuota 3 tahun N-2/N-1/N anti-`NaN`), serta `susunAnalitikDinas()` untuk Mode Admin tanpa data pegawai.
- `components/beranda/filter-tahun.tsx`: Komponen Client pemilih tahun berbentuk kapsul di header Beranda (mengubah `?tahun=YYYY` tanpa muat ulang penuh).
- `components/beranda/grafik-beranda.tsx`: Komponen Client 3 grafik SVG interaktif buatan sendiri tanpa library luar (`GrafikBatangBulanan`, `GrafikTrenSaldo`, `GrafikTrenPengajuanDinas`, `GrafikDonatKomposisi`) lengkap dengan sorotan/info hover & ketuk, kondisi kosong (*empty state*) rapi, dan pewarnaan otomatis mengikuti variabel CSS 4 tema.
- `tests/unit/beranda-analitik.test.ts`: Pengujian unit Vitest (6 skenario) untuk cuti lintas bulan/lintas tahun, konsistensi `terpakaiTercatatAplikasi + terpakaiAwalImpor === saldo.terpakai`, tren sisa saldo, kondisi kosong anti-`NaN`, Mode Admin, serta validasi filter tahun.
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

### File Diubah (Menu Atas Desktop, Tombol Membulat Kapsul, & Beranda Analitik — `2026-11-28`)
- `lib/menu.ts`: Menambahkan properti opsional `labelRingkas?: string` (`"Pegawai"` untuk `/pegawai`, `"Dokumen"` untuk `/dokumen/organisasi`) untuk tampilan ringkas di bilah atas desktop tanpa mengubah aturan otorisasi `menuUntuk()`.
- `components/tata-letak/navigasi.tsx` & `app/(aplikasi)/layout.tsx`: Menghapus `SidebarDesktop` dan jarak kiri `lg:pl-66`; membangun bilah navigasi atas 3 zona (`mx-auto max-w-7xl`, kapsul `rounded-2xl lg:rounded-full`) dengan `<MerekAtas />` di kiri, `<NavigasiAtas />` di tengah (maks. 5 kapsul dengan dropdown rapi untuk grup ≥ 2 item seperti **Cuti ▾** dan **Dokumen ▾** yang menyorot item aktif), serta mempertahankan laci `<MenuSeluler />` di layar HP dengan kapsul aktif `rounded-full`.
- `components/ui/button.tsx`, `components/tata-letak/tombol-tema.tsx`, & `components/tata-letak/menu-pengguna.tsx`: Mengubah sudut tombol dan ikon bilah atas menjadi `rounded-full` tanpa menambah elemen anak JSX baru di `Button` (menjaga `asChild` & efek kabut *"Abu Terbawa Angin"* 100% aman), menyelaraskan tombol lonceng `/notifikasi` ke `rounded-full`, serta membatasi lebar nama di kapsul akun (`max-w-36 xl:max-w-48`).
- `app/globals.css`: Meningkatkan kontras variabel `--chart-1..5` pada `notion-dark` (di atas kartu `#222222`), `notion-light`, dan `langit-malam`, menghapus aturan `aside.kaca` yang tidak lagi terpakai sambil mempertahankan warna laci HP (`[data-slot="sheet-content"][data-side="left"]`) dan isolasi mutlak `.lembar-cetak` serta `.editor-surat`.
- `server/kueri/beranda.ts`: Memperbarui `dataBeranda(u, tahunDiminta)` dengan isolasi ketat `u.pegawai.id` dari sesi, validasi filter tahun aman lewat `pilihTahunBeranda()`, agenda maks. 5 hari libur dari `hari_libur`, penyusunan analitik pegawai lengkap, serta cabang aman **Mode Admin** saat `u.pegawai === null` (0 kueri pribadi, hanya ringkasan & grafik dinas sesuai hak akses).
- `app/(aplikasi)/beranda/page.tsx`: Membangun tata letak Beranda baru yang membaca `searchParams.tahun`, menampilkan header sambutan + filter tahun + tombol cepat **Ajukan Cuti** / **Proses Cuti**, 4 kartu ringkasan angka (Kartu 1 solid `bg-primary text-primary-foreground` tanpa `.kaca` agar kontras terjaga di semua 4 tema), 3 grafik SVG interaktif, serta 3 kartu baris bawah (**Riwayat Pengajuan Terbaru**, **Rincian Kuota 3 Tahun & Dokumen Terbaru** atau **Pintasan Cepat Admin**, dan **Hari Libur Terdekat**).
- **Verifikasi Lokal Coder (`2026-11-28`):** `git grep` sisa `SidebarDesktop`/`aside.kaca`/`lg:pl-66` = `0`, `npm run typecheck` OK, `npm run lint` OK (0 error/warning), `npm test` **147/147 lulus** (17 file uji), dan `npm run build` OK (44/44 rute).

### File Diubah (Pembaruan Sistem Tema: 4 Tema Simetris & Sakelar Siang/Malam — `2026-11-26`)
- `lib/tema.ts`: Merapikan daftar tema menjadi 4 kombinasi simetris (`notion-light` sebagai `TEMA_BAWAAN`, `notion-dark`, `langit-pagi`, `langit-malam`), menghapus tema lama (`cursor-dark`, `mossy-stone`, `notion-monokrom`) dengan pengalihan otomatis aman ke `notion-light` lewat `normalisasiTema()`, serta menambahkan tipe `GayaTema` (`"notion" | "langit"`), `ModeTema` (`"siang" | "malam"`), dan fungsi bantu `adalahTemaTerang()`, `gayaTema()`, `modeTema()`, `temaDari()`, `balikModeTema()`, `gantiGayaTema()`, dan `warnaBilahBrowser()`.
- `app/globals.css`:
  - Menghapus seluruh blok warna dan aturan milik `cursor-dark` dan `mossy-stone`.
  - Menyetel `:root` memakai variabel semantik dasar **Notion Light** (tanpa menimpa skala warna Tailwind `--color-sky-*` / `--color-slate-*` agar `langit-pagi` tetap jernih) serta latar bawaan polos tanpa kilatan biru.
  - Mengubah `notion-monokrom` menjadi `notion-light`, dan menambahkan blok warna lengkap untuk `notion-dark`, `langit-pagi`, dan `langit-malam` (termasuk `.latar-langit`, `.kaca`, sidebar/laci HP, permukaan `.bg-white`, teks `input`/`textarea`/`select`/`option`, hover ramah layar sentuh, lencana status cuti, serta token kabut tombol `--abu-*` termasuk kabut arang tipis pada tombol terang di `notion-dark`).
  - Mempertahankan isolasi mutlak `.lembar-cetak`, `@media print`, dan `.editor-surat` (putih murni `#FFFFFF`, teks hitam `#000000`, tanpa efek kabut tombol di ke-4 tema) serta memperbarui `.lembar-cetak .bilah-cetak` agar tombol cetak tetap tajam di `notion-light`, `notion-dark`, `langit-pagi`, dan `langit-malam`.
- `components/tata-letak/tombol-tema.tsx`: Menambahkan tombol cepat 1-klik **Siang/Malam** (`MoonIcon`/`SunIcon`, `.ikon-abu size-10 rounded-xl`) di sebelah ikon palet, memperbarui isi menu dropdown **Tampilan Aplikasi** menjadi sakelar segmen **Siang / Malam** + 2 pilihan gaya (**Notion** & **Langit**) dengan 3 bulatan pratinjau warna yang mengikuti mode aktif (`ring-1 ring-foreground/30`), serta memakai `warnaBilahBrowser(id)` untuk memperbarui `meta[name="theme-color"]`.
- `components/ui/sonner.tsx`: Mengubah nilai awal state dan fallback SSR `bacaTemaSonner()` menjadi `"light"` agar serasi dengan tema bawaan baru `notion-light`, tetap sinkron otomatis via `adalahTemaTerang(normalisasiTema(...))`.
- `app/layout.tsx`: Menggunakan `warnaBilahBrowser(tema)` pada `generateViewport()` agar warna bilah atas browser HP selalu identik dengan `tombol-tema.tsx` di ke-4 tema.
- `tests/unit/tema.test.ts`: Memperbarui seluruh pengujian unit (8 skenario) untuk memverifikasi 4 tema baru, `TEMA_BAWAAN === "notion-light"`, pengalihan otomatis nilai tema lama (`cursor-dark`, `mossy-stone`, `notion-monokrom`) → `"notion-light"`, serta seluruh helper (`adalahTemaTerang`, `gayaTema`, `modeTema`, `temaDari`, `balikModeTema`, `gantiGayaTema`, `warnaBilahBrowser`).
- **Verifikasi Lokal Coder (`2026-11-26`):** Sisa referensi tema lama `0`, `npm run typecheck` OK, `npm run lint` OK (0 error/warning), `npm test` **141/141 lulus** (16 file uji), dan `npm run build` OK (44 rute).

### File Diubah (Tema Tampilan Ke-4: Notion Monokrom — `2026-11-26`)
- `lib/tema.ts`: Menambahkan `"notion-monokrom"` ke tipe `IdTema` dan `DAFTAR_TEMA` (*Notion Monokrom* — *"Putih bersih & hitam arang minimalis"*, palet `#FBFBFA` / `#191919` / `#787774`), mempertahankan `TEMA_BAWAAN = "cursor-dark"`, memperbarui `normalisasiTema()`, serta mengekspor helper `adalahTemaTerang(id)` (`"langit-pagi"` dan `"notion-monokrom"`).
- `app/globals.css`:
  - Menambahkan blok tema lengkap `html[data-tema="notion-monokrom"]` (`color-scheme: light`, permukaan putih kertas datar `#FBFBFA`/`#FFFFFF`, sidebar `#F7F7F5`, garis `#E5E5E2`, tombol utama & tombol penting `--emas` hitam arang teks putih, skala netral hangat `slate-*` & `sky-*`, warna pastel pudar kalem ala Notion untuk lencana status & kotak pesan, serta token efek kabut tombol "Abu Terbawa Angin").
  - Menambahkan `.latar-langit` polos datar, kartu datar `.kaca` (beserta `aside.kaca` & `header > .kaca`), aturan lencana biru pastel `.bg-sky-100.text-sky-900`, serta efek hover `.hover\:bg-white\/60:hover` dan `.hover\:bg-white:hover` dengan pengecualian ketat terhadap `.lembar-cetak` dan `.editor-surat`.
- `components/tata-letak/tombol-tema.tsx`: Memastikan `terapkanKeDom()` menyetel `meta[name="theme-color"]` memakai `#FBFBFA` (`info.warna.background`) saat `notion-monokrom` aktif dan memperkuat garis tepi 3 bulatan pratinjau warna di menu dropdown menjadi `ring-1 ring-foreground/30`.
- `components/ui/sonner.tsx`: Memperbarui `bacaTemaSonner()` memakai `adalahTemaTerang(normalisasiTema(document.documentElement.dataset.tema))` agar kotak pesan pop-up tampil mode terang (`"light"`) pada `notion-monokrom` maupun `langit-pagi`.
- `tests/unit/tema.test.ts`: Menambahkan pengujian unit untuk 4 tema (termasuk `notion-monokrom`), `normalisasiTema("notion-monokrom")`, dan `adalahTemaTerang()` di seluruh 4 tema.
- **Verifikasi Lokal Coder (`2026-11-26`):** `npm run typecheck` OK, `npm run lint` OK (0 error/warning), `npm test` **138/138 lulus** (16 file uji), dan `npm run build` OK (44 rute).

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
- **Polesan & Verifikasi Browser Menu Navigasi Atas Desktop, Tombol Membulat Kapsul, & Beranda Analitik (`2026-11-28`):**
  - `components/beranda/grafik-beranda.tsx`:
    - **Interaksi sentuh & klik grafik lebih alami (`GrafikBatangBulanan`, `GrafikTrenSaldo`, `GrafikTrenPengajuanDinas`, & `GrafikDonatKomposisi`):** Memisahkan status sorotan sementara saat kursor melintas (*hover/focus*) dari status pilihan terkunci saat diklik/diketuk (`terarah ?? terpilih`). Sebelumnya di komputer, mengarahkan kursor lalu mengklik segmen/legenda justru langsung mematikan rincian; kini klik sekali mengunci rincian (tetap tampil walau kursor digeser menjauh) dan klik ulang mengembalikan ke tampilan ringkas, sementara ketuk di layar HP tetap bekerja mulus.
    - **Teks pusat Grafik Donat lega dan tidak menyentuh cincin (`GrafikDonatKomposisi`):** Memisahkan keterangan segmen aktif di tengah donat menjadi 2 baris rapi (nama kategori di atas, persentase di bawahnya dengan jarak tepi aman) sehingga tulisan seperti `Tersedia` / `100%` tidak lagi mepet atau menyentuh garis cincin donat saat cincin membesar di keempat tema.
    - **Kesimetrisan kartu grafik saat data masih kosong (`GrafikBatangBulanan`):** Menyembunyikan baris legenda dan ajakan *"Arahkan / ketuk batang untuk rincian"* ketika belum ada cuti tercatat (`totalSemua === 0`), sehingga kotak kosong putus-putus sejajar rapi dengan kartu grafik kedua dan ketiga di sebelahnya.
  - `app/(aplikasi)/beranda/page.tsx`:
    - **Batang kemajuan `Rincian Kuota 3 Tahun` sesuai angka sisa:** Mengubah panjang batang kemajuan di kartu **Kuota & Dokumen** agar menggambarkan proporsi **sisa cuti** (`sisa / hak`, selaras dengan teks *"Sisa 12 / 12 hari"* dan *"Sisa 4 / 4 hari"* di atasnya). Sebelumnya batang mengambil persen terpakai sehingga sisa 12 dari 12 hari sempat tampak kosong abu-abu; kini sisa penuh tampil penuh 100% mengikuti warna utama tema dan berkurang seiring pemakaian.
    - **Keterangan bawah Kartu 1 tidak lagi terpotong elipsis (`...`):** Menghapus pemotongan paksa (`truncate`) pada teks keterangan di bawah Kartu 1 solid utama (Mode Admin *"Antrean verifikasi & persetujuan dinas"* maupun Mode Pegawai) sehingga tampil utuh rapi seperti Kartu 2–4 pada layar `1280×800`.
  - `components/tata-letak/menu-pengguna.tsx`:
    - **Keseragaman sudut menu pop-up bilah atas:** Menyelaraskan kotak dropdown akun (*Profil & password* / *Keluar*) memakai sudut membulat lembut `rounded-2xl p-1.5` dan item `rounded-xl` agar satu gaya dengan dropdown **Cuti ▾**, **Dokumen ▾**, **Tampilan Aplikasi**, dan **Filter Tahun**.
  - *Verifikasi:* `npm run typecheck`, `npm run lint` (0 error/warning), dan `npm test` (**147/147 lulus** pada 17 file uji) berjalan bersih tanpa kendala. Pemeriksaan langsung di browser lokal pada **3 ukuran layar (`1280×800`, `1024×768`, dan HP `390×844`)**, **3 jenis akun** (Superadmin `admin`, Kepegawaian `198205122006042902`, dan Pegawai biasa `199002202015031905`), dan **seluruh 4 tema** (**Notion Light**, **Notion Dark**, **Langit Pagi**, **Langit Malam**) memverifikasi:
    - Bilah navigasi atas muat rapi **1 baris tanpa turun baris atau tabrakan** di `1024×768` maupun `1280×800` untuk semua peran; dropdown **Cuti ▾** & **Dokumen ▾** membuka mulus dan menyorot kapsul + tanda centang item aktif saat berpindah ke `/cuti/proses` & `/dokumen/organisasi`; laci menu HP (`MenuSeluler`) dengan kapsul aktif membulat berfungsi normal dan bebas gulir samping (`overflowX = false` di seluruh ukuran layar).
    - Kartu 1 solid utama, tombol **Filter Tahun**, tombol membulat `rounded-full` (*Ajukan Cuti* / *Proses Cuti*), ke-3 grafik SVG beserta interaksi hover & klik-kunci donat/garis, serta ke-3 kartu baris bawah tampil kontras tajam di keempat tema.
    - Halaman cetak `/cetak/rekap-cuti` (*Langit Malam*) dan editor template surat `.editor-surat` + pratinjau A4 di `/admin/surat/template/[id]` (*Notion Dark*) tetap terkunci putih murni `#FFFFFF` bertulisan hitam pekat `#000000` tanpa perubahan bentuk garis maupun efek kabut tombol.
    - *Catatan untuk Debugger/QA:* Database lokal saat pengecekan memiliki `0` pengajuan cuti (sehingga Grafik Batang dan Grafik Tren/Donat Mode Admin tampil dalam kondisi kosong rapi); pengujian lanjutan dengan membuat data pengajuan cuti uji nyata (termasuk cuti lintas bulan/lintas jenis, pergantian tahun di `?tahun=...`, uji `npm run build`, serta cek `/cetak/formulir/[id]` & `/cuti/[id]/surat/...`) siap diverifikasi tuntas oleh **Debugger / QA**.
- **Polesan & Verifikasi Browser Sistem 4 Tema Simetris (Notion Light/Dark & Langit Pagi/Malam) + Tombol Cepat Siang/Malam (`2026-11-26`):**
  - `app/(aplikasi)/layout.tsx`, `components/tata-letak/tombol-tema.tsx`, & `components/tata-letak/menu-pengguna.tsx`:
    - **Bilah atas HP lebih lega & judul tidak lagi terpotong:** Dengan hadirnya 2 tombol tema (ikon Bulan/Matahari + ikon Palet), sebelumnya judul bilah atas di HP `390×844` sempat terpotong menjadi `"Layanan C..."`. Kini judul khusus layar HP memakai **`Cuti ESDM`** (selaras dengan logo menu samping, tetap menampilkan **`Layanan Cuti ESDM`** di layar tablet), jarak antar ikon dirapikan (`gap-1 px-1.5 sm:gap-2 sm:px-3`), dan ukuran seluruh tombol ikon di HP diseragamkan (`size-9 sm:size-10`, avatar `px-1 sm:px-1.5`), sehingga judul **`Cuti ESDM`** tampil utuh lega tanpa berdesakan.
  - `components/form/pilihan.tsx`:
    - **Perataan tengah teks pilihan dropdown (`<select>`):** Menambahkan `content-center py-1.5 leading-normal` agar teks dan panah di dalam kotak dropdown (*Semua unit*, *Semua jabatan*, *Semua status*, *Cuti Tahunan*, *Aktif*, dsb.) duduk persis di tengah secara vertikal di keempat tema, baik di layar laptop maupun HP.
  - `app/globals.css`:
    - **Kedalaman kontras kotak isian di `Notion Dark`:** Menggelapkan sedikit permukaan kotak isian aktif (`input`/`textarea`/`select` ke `#1B1B1B`) dan membedakan kotak terkunci/read-only (`#262626`, seperti baris Tahun/Sisa cuti tahunan) terhadap permukaan kartu (`#222222`) agar setiap kolom form yang bisa diketik dan yang terkunci langsung mudah dibedakan mata.
  - `components/cuti/form-formulir.tsx`, `components/surat/form-surat.tsx`, & `components/admin/form-template.tsx`:
    - **Pratinjau kertas A4 tidak lagi tertutup bilah atas saat digulir:** Mengubah posisi tempel kolom pratinjau di layar lebar dari `xl:top-4` menjadi `xl:top-20` sehingga judul *"Pratinjau formulir (A4)"* dan bagian atas kertas surat selalu berhenti rapi tepat di bawah bilah profil atas saat pegawai menggulir form.
  - `app/(aplikasi)/pegawai/page.tsx` & `app/(aplikasi)/cuti/saldo/page.tsx`:
    - Menambahkan pengaman `min-w-0 grid-cols-1` pada pembungkus utama halaman bertabel lebar agar di layar HP sempit halaman tidak pernah ikut melebar ke samping.
  - *Verifikasi:* `npm run typecheck`, `npm run lint` (0 error/warning), dan `npm test` (**141/141 lulus**) berjalan bersih. Pengecekan langsung di browser lokal (**Laptop `1280×800` & HP `390×844`**, **0 galat konsol**) memverifikasi:
    - Tema bawaan `/login` otomatis terbuka dalam **Notion Light** (`#FBFBFA`), tombol cepat 1-klik **Siang ↔ Malam** langsung menukar **Notion Light ↔ Notion Dark** (`#191919`) dan **Langit Pagi** (`#F0F9FF`) **↔ Langit Malam** (`#0B1526`), serta pindah gaya **Notion ↔ Langit** di dropdown **Tampilan Aplikasi** saat mode Malam tetap bertahan di mode Malam.
    - Halaman `/login`, `/login?google=gagal`, `/beranda` (admin & pegawai), `/cuti/ajukan` (termasuk pratinjau A4 langsung tampil & sticky rapi di bawah bilah atas, serta hover kabut arang tipis pada tombol terang di *Notion Dark*), `/cuti/proses`, `/pegawai`, `/admin/hak-akses` (termasuk pop-up *toast* mode gelap tajam terbaca), `/dokumen/organisasi`, `/cetak/rekap-cuti`, dan editor template surat (`/admin/surat/template/[id]`) — seluruh kertas cetak & kotak `.editor-surat` tetap putih murni `#FFFFFF` bertulisan hitam pekat `#000000` bebas efek kabut, laci menu HP `#202020` (*Notion Dark*) & `#0D192C` (*Langit Malam*) rapi, dan 0 gulir samping di layar HP.
    - *Catatan untuk Debugger/QA:* Database lokal masih memiliki `0` pengajuan cuti, sehingga pengecekan langsung seluruh 8 lencana status cuti pada baris nyata di `/cuti/proses`, editor surat pengajuan `/cuti/[id]/surat/...`, `/cetak/formulir/[id]`, pengalihan cookie tema lama (`tema=cursor-dark` / `mossy-stone` / `notion-monokrom` → `notion-light`), serta `npm run build` siap diuji tuntas oleh **Debugger / QA**.
- **Polesan & Verifikasi Browser Tema Ke-4 "Notion Monokrom" (`2026-11-26`):**
  - `app/globals.css`:
    - **Bilah profil atas solid putih saat digulir (`header > .kaca`):** Mengubah latar bilah atas pada Notion Monokrom menjadi putih solid `#FFFFFF` dengan bayangan super lembut (tanpa efek tembus pandang), sehingga teks halaman/formulir tidak lagi membayang tembus di belakang bilah atas saat layar digulir.
    - **Laci menu samping HP serasi dengan sidebar laptop:** Menyetel warna laci menu kiri HP (`[data-slot="sheet-content"][data-side="left"]`) pada Notion Monokrom menjadi abu-abu kertas lembut `#F7F7F5` dengan garis tepi `#E5E5E2` agar seragam dengan bilah menu samping di laptop.
    - **Keselarasan 5 kartu ikon hak akses:** Menambahkan pengecualian pastel biru pudar (`#E7F3F8` / `#2B5972`) pada `.bg-sky-100.text-sky-700` (dengan tetap mengecualikan `.lembar-cetak` dan `.editor-surat`), sehingga kartu ikon **Proses Cuti** di `/admin/hak-akses` dan tab Akun pegawai tampil serasi dengan 4 kartu pastel Notion lainnya tanpa membuat warna biru bocor ke bagian lain.
    - **Efek hover ramah layar sentuh HP:** Membungkus aturan `.hover\:bg-white\/60:hover` dan `.hover\:bg-white:hover` milik Notion Monokrom ke dalam `@media (hover: hover) and (pointer: fine)` agar sentuhan jari di HP tidak meninggalkan warna abu-abu yang nyangkut.
    - **Bilah alat layar cetak serasi monokrom (`.bilah-cetak`):** Menambahkan aturan khusus `html[data-tema="notion-monokrom"] .lembar-cetak .bilah-cetak` (hanya menyasar bilah tombol atas `print:hidden`) agar judul dan tombol **Cetak / Simpan PDF** tampil hitam arang `#191919` (tidak lagi biru Langit Pagi), sementara lembar kertas cetak di bawahnya tetap putih murni `#FFFFFF`, teks hitam pekat `#000000`, garis tajam, dan bebas efek kabut tombol.
  - `components/cetak/tombol-cetak.tsx`:
    - Menambahkan kelas `.bilah-cetak` pada bilah alat atas (`print:hidden`) agar pewarnaan bilah layar cetak terpisah bersih dari isi kertas dokumen.
  - `components/admin/matriks-hak-akses.tsx` & `app/(aplikasi)/admin/hak-akses/page.tsx`:
    - **Batas tegas tombol filter cepat:** Menambahkan garis tepi (`border border-border` saat nonaktif, `border border-primary` saat aktif) pada tombol filter *Semua*, *Admin Utama*, *Hak Khusus*, dan *Pegawai Biasa* supaya bentuk tombolnya terlihat tegas di atas latar kertas `#FBFBFA` maupun 3 tema lainnya.
    - **Seluruh 5 kolom centang langsung terlihat di laptop (`1280×800`):** Merapikan tabel matriks menjadi `table-fixed min-w-[780px]` dengan lebar 5 kolom centang `w-26` (sebelumnya kolom nama pegawai melebar hingga ~991px sehingga mendorong kelima kolom centang keluar layar).
    - **Menghilangkan gulir samping tingkat halaman di HP (`390×844`):** Menambahkan `grid-cols-1 min-w-0` pada wadah halaman dan tabel matriks sehingga di layar HP gulir menyamping hanya terjadi rapi di dalam kotak tabel, tanpa menggeser seluruh halaman.
  - `components/admin/form-template.tsx`:
    - Menambahkan `grid-cols-1` dan `min-w-0` pada pembungkus editor dan pratinjau kertas A4 di halaman **Ubah Template Surat** agar tampilan editor surat dan pratinjau A4 pas rapi di layar HP tanpa melebar ke samping.
  - *Verifikasi:* `npm run typecheck`, `npm run lint` (0 error/warning), dan `npm test` (**138/138 lulus**) berjalan bersih. Pemeriksaan langsung di browser lokal (**Laptop `1280×800` & HP `390×844`**, **0 galat konsol**) memverifikasi:
    - Dropdown **Pilih Tema Tampilan** (4 tema, 3 bulatan warna Notion bertepi tegas) & perpindahan bolak-balik **Cursor Dark ↔ Notion Monokrom ↔ Langit Pagi ↔ Mossy Stone** beserta penyimpanan cookie setelah *reload* dan *logout* ke `/login` (`meta[name="theme-color"]` = `#FBFBFA` pada Notion Monokrom).
    - Halaman `/login`, `/login?google=gagal`, `/beranda` (admin & pegawai), `/cuti/proses`, `/cuti/ajukan`, `/admin`, `/admin/hak-akses` (termasuk notifikasi pop-up *toast* mode terang & pengecekan balik di tema *Cursor Dark*), `/dokumen/organisasi`, `/cetak/rekap-cuti`, serta editor surat `.editor-surat` + pratinjau A4 di `/admin/surat/template/[id]` — bebas gulir samping di HP dan kertas cetak tetap putih murni `#FFFFFF` dengan teks hitam `#000000`.
    - *Catatan untuk Debugger/QA:* Database lokal saat pengecekan berisi `0` pengajuan cuti, sehingga pengecekan langsung 8 lencana status cuti pada baris nyata di `/cuti/proses`, `/cuti/[id]/surat/...`, dan `/cetak/formulir/[id]` (beserta `npm run build`) masih perlu diuji oleh **Debugger / QA** dengan membuat/menggunakan data pengajuan uji.
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
- [ ] **[OPERASIONAL - Pengaturan Dashboard Vercel / Neon / Admin]**: Kode rilis `42ba5b5` sudah tayang normal di produksi, namun dari pengecekan langsung terlihat 2 hal pengaturan operasional: (1) 6 pengajuan cuti lama di `/cuti/proses` masih *Surat Terbit* (`0 Selesai`) — klik **Run** sekali pada Cron Job `/api/tugas/harian` di dashboard Vercel (atau tunggu jadwal otomatis pukul 01:00 WITA) sambil memastikan tabel `dokumen_berkas` di Neon dan env `BERKAS_KUNCI` + `CRON_SECRET` di Vercel sudah aktif; (2) bila ingin batas unggah naik dari `1 MB` ke `4 MB`, ubah angka **Ukuran maks. unggahan (MB)** di menu **Admin → Pengaturan** dari `1` ke `4` lalu klik **Simpan**.
- [ ] **[CATATAN DESAIN] [server/auth/pengguna.ts:~38-45 vs app/(aplikasi)/admin/hak-akses/page.tsx:34]**: Peran legacy `KEPEGAWAIAN` saat ini otomatis menginjeksi 3 hak akses (`KELOLA_SALDO_CUTI`, `PROSES_CUTI`, `KELOLA_PEGAWAI`) hanya jika baris `user_hak_akses` kosong; begitu Superadmin menyimpan centang di `/admin/hak-akses`, peran lama otomatis dibersihkan.
- [ ] **[CATATAN] [DEV_SYNC.md bagian 1.C]**: Blueprint awal menyebut route `/cuti/rekap`, namun rekap terintegrasi pada `/cuti/saldo` dan `/cetak/rekap-cuti`.

## 5. Riwayat Selesai (Resolved)
- [x] **[VERIFIKASI QA - Filter Unit Kerja Data Pegawai (6 Pilihan + PJLP) & Tema Bawaan Langit Pagi Tanpa Deskripsi] [2026-11-28]**:
  - **Audit Kode & Pengujian Otomatis Lokal (Node.js v22 Laragon):** Audit menyeluruh 8 file perubahan (`lib/domain/unit.ts`, `server/kueri/pegawai.ts`, `components/pegawai/filter-pegawai.tsx`, `lib/tema.ts`, `app/globals.css`, `components/tata-letak/tombol-tema.tsx`, `tests/unit/filter-pegawai.test.ts`, `tests/unit/tema.test.ts`) beserta halaman/rute terkait (`app/(aplikasi)/pegawai/page.tsx`, `components/pegawai/form-pegawai.tsx`, `app/api/ekspor/pegawai/route.ts`, `app/(cetak)/cetak/pegawai/page.tsx`, `app/layout.tsx`). Seluruh pemeriksaan lulus bersih: `npm run typecheck` OK, `npm run lint` OK (0 error/warning), dan `npm test` **149/149 lulus** (18 file uji, termasuk pengalihan aman cookie tema lama & validasi `unit=PJLP`).
  - **Uji Browser Lokal (`http://localhost:3000`, Laptop `1280×800` & HP `390×844` — 0 Galat Konsol, 0 Gagal HTTP `>= 400`, 0 Perubahan Data):**
    - **Dropdown Filter Unit Kerja (`/pegawai`):** Tepat **7 pilihan** (`Semua unit`, `Sekretariat`, `Geologi`, `Pertambangan`, `Energi`, `Ketenagalistrikan`, `PJLP`). Memilih **`PJLP`** langsung menyaring tanpa tombol tambahan ke `/pegawai?unit=PJLP` dan menampilkan persis **4 pegawai Non-ASN/PJLP** (`Dedi Anwar`, `Eko Amalia`, `Novi`, `Syahrul`, 0 ASN).
    - **Ekspor Excel & Cetak dengan Filter `PJLP`:** Tombol **Ekspor Excel** (`/api/ekspor/pegawai?unit=PJLP`, HTTP `200`, `21.359 B`), **Ekspor + data pribadi** (`/api/ekspor/pegawai?unit=PJLP&pribadi=1`, HTTP `200`, `22.112 B`), dan **Cetak / PDF** (`/cetak/pegawai?unit=PJLP`, HTTP `200`, judul *Data Pegawai — 4 orang*, hanya 4 baris PJLP, kertas putih bersih bertulisan hitam) semuanya berjalan mulus tanpa error validasi.
    - **Cakupan Bidang Induk & Kombinasi Filter:** Memilih **`Geologi`** menampilkan **14 pegawai** (termasuk `Bidang Geologi` dan seluruh seksi di bawahnya); memilih **`Sekretariat`** menampilkan **35 pegawai** (termasuk `Sekretariat` dan seluruh subbagian di bawahnya); kombinasi ekstrem `Unit kerja = PJLP` + `Status = PNS` ditangani rapi menampilkan `0 pegawai sesuai filter` tanpa error.
    - **Form Tambah & Ubah Pegawai Tetap Lengkap:** Dropdown *Unit kerja* pada `/pegawai/baru` maupun `/pegawai/[id]/ubah` tetap mempertahankan seluruh **26 pilihan** lengkap (termasuk semua Sub Bagian, Seksi, dan UPTD — tidak ikut dipangkas).
    - **Tema Bawaan Langit Pagi & Menu Palet Ringkas:** Pengunjung baru tanpa cookie langsung membuka `/login` dan `/beranda` dalam **Langit Pagi** (`data-tema="langit-pagi"`, warna bilah browser `#F0F9FF`, latar awan biru cerah tanpa kedipan warna). Menu dropdown Palet (*Tampilan Aplikasi*, lebar ringkas `208 px`) menampilkan sakelar **Siang / Malam** dan hanya **3 titik warna + nama tema** (`Langit Pagi`, `Notion Light`, `Langit Malam`, `Notion Dark`) tanpa kalimat deskripsi, berpindah mulus di keempat tema, pas di layar HP `390×844` tanpa geseran samping, serta menjaga lembar cetak `/cetak/pegawai?unit=PJLP` & `/cetak/rekap-cuti` tetap putih murni bertulisan hitam pekat walau mode gelap (*Notion Dark*) aktif.
  - **Status:** **Lulus 100% — Siap commit, push ke GitHub `main`, & rilis ke Vercel** (tidak ada perubahan database maupun variabel baru).
- [x] **[VERIFIKASI QA - Lingkungan Kerja Lokal Tanpa Docker (Laragon PostgreSQL 17.2 & Node.js v22)] [2026-11-28]**:
  - **Keamanan Koneksi & Isolasi dari Neon:** Docker Desktop terkonfirmasi mati total; `.env` lokal (`APP_ENV=development`, `GOTENBERG_URL=` kosong, `PENYIMPANAN_DOKUMEN=db`) mengarah aman ke **PostgreSQL 17.2 Windows (Laragon)** di `localhost:5432` (`::1/128`), database `cuti_esdm`, user `cuti` — 100% terpisah dari database produksi Neon.
  - **Migrasi & Data Awal (Seed):** `prisma migrate status` terkonfirmasi **8/8 migrasi sinkron** (*Database schema is up to date!*), dan seluruh data contoh lokal utuh (**106 pegawai**, **90 akun**, **102 saldo cuti**, **6 jenis cuti**, **4 folder dokumen**, **5 template surat**, **25 hari libur**).
  - **Pengujian Otomatis di Node.js Laragon (`v22.23.5`, `npm 10.9.9`):** `npm run typecheck` OK, `npm run lint` OK (0 error/warning), dan `npm test` **147/147 lulus** (17 file uji).
  - **Uji Browser Lokal (`http://localhost:3000`, 0 Galat Konsol, 0 Gagal HTTP `>= 400`):**
    - Login akun Superadmin `admin` berhasil masuk ke `/beranda` (Mode Admin memuat 4 kartu ringkasan & 3 grafik SVG tanpa `"NaN"`), pencarian pegawai `"Joko"` di `/pegawai` mengembalikan 4 pegawai secara normal.
    - Pengajuan cuti uji sementara (`/cuti/[id]`), cetak formulir BKN (`/cetak/formulir/[id]`), dan editor surat (`/cuti/[id]/surat/SURAT_IZIN`) berjalan mulus. Saat tombol **Unduh PDF** diklik dengan `GOTENBERG_URL=` kosong, aplikasi tidak error melainkan otomatis mengalihkan (`/api/surat/[versiId]/pdf` → `/cetak/surat/[versiId]?otomatis=1`, HTTP `200`) ke lembar cetak surat A4 putih bersih lengkap dengan tombol **Cetak / Simpan PDF**.
  - **Pembersihan & Catatan Kecil:** Pengajuan cuti uji sementara (`[QA-LARAGON]`) beserta versi surat dan log cetaknya telah dihapus bersih kembali. *Catatan ringan:* ekstensi `pg_trgm` terdeteksi belum aktif di dalam database `cuti_esdm` (kemungkinan perintah `CREATE EXTENSION` sempat dijalankan sebelum `\c cuti_esdm`); pencarian pegawai tetap lancar saat ini, tetapi disarankan mengaktifkannya sekali di database `cuti_esdm` agar sesuai `README.md`.
- [x] **[VERIFIKASI QA - Menu Navigasi Atas Desktop, Tombol Membulat Kapsul, & Halaman Beranda Analitik (Cetak Biru L)] [2026-11-28]**:
  - **Audit Kode, Keamanan Isolasi Sesi, & Build Produksi:** Audit menyeluruh 14 file (`lib/domain/beranda-analitik.ts`, `server/kueri/beranda.ts`, `components/beranda/*`, `app/(aplikasi)/beranda/page.tsx`, `components/tata-letak/*`, `app/(aplikasi)/layout.tsx`, `components/ui/button.tsx`, `lib/menu.ts`, `app/globals.css`, dan `tests/unit/beranda-analitik.test.ts`). Seluruh kueri Mode Pegawai terbukti 100% dikunci ke `u.pegawai.id` dari sesi login (tidak menerima `pegawaiId` dari URL), validasi `?tahun=YYYY` kebal input tidak sah (`abc`, `9999`, `-2025`, string SQL → kembali aman ke `2026`), dan `<Button asChild>` tetap aman tanpa elemen anak tambahan. Pemeriksaan otomatis lulus bersih: `npm run typecheck` OK, `npm run lint` OK (0 warning), `npm test` **147/147 lulus** (17 file test), dan `npm run build` **OK (44/44 rute)**.
  - **Uji Browser Lokal dengan Data Pengajuan Nyata (`1280×800`, `1024×768`, & HP `390×844` — 3 Akun × 4 Tema, 0 Galat Konsol, 0 Gagal HTTP `>= 400`, 0 `"NaN"`):**
    - **Pegawai Biasa (`199002202015031905` — `Joko Santoso, S.H.`):** Dengan data uji nyata (cuti tahunan lintas bulan 29 Jan–3 Feb = `2 Jan + 2 Feb`, cuti sakit Maret = `3 hari`, saldo awal impor `+3 hari`, serta `2 hari` sedang diproses), ke-4 kartu ringkasan (`9` tersedia dari `18`, `7` terpakai `39% +3 awal`, `2` diproses, `3` cuti lainnya), ke-3 grafik SVG interaktif (Batang bulanan + kunci klik *Maret: 3 hari*, Garis Tren Saldo + proyeksi putus-putus *9 hari tersedia*, serta Donat 2 baris pusat *9 / Tersedia / 50%*), batang kemajuan `Rincian Kuota 3 Tahun` (`0/2`, `0/4`, `11/12`), dan pergantian `?tahun=2025` bekerja 100% akurat tanpa bocornya data cuti pegawai lain (`Wulan Anwar` tidak pernah muncul).
    - **Kepegawaian (`198205122006042902`) & Superadmin (`admin`):** Seluruh kapsul menu atas (hingga 5 kapsul penuh: `Beranda`, `Cuti ▾`, `Pegawai`, `Dokumen`, `Admin`) sejajar rapi **1 baris tanpa tabrakan** di `1024×768` (`gap 18,86 px`) maupun `1280×800` (`gap 142,46 px`); dropdown `Cuti ▾` & `Dokumen ▾` menyorot kapsul & tanda centang aktif; Mode Admin menampilkan 3 grafik dinas terisi akurat (`4 pengajuan`, `7 hari disetujui`); laci menu HP di `390×844` bebas gulir samping (`375,2 px <= 390 px`); tombol kapsul `asChild` rapi; serta kertas `/cuti/[id]/surat/SURAT_IZIN` dan `/cetak/formulir/[id]` di **Notion Dark** & **Langit Malam** tetap putih murni bertulisan hitam pekat bebas efek kabut.
  - **Pembersihan:** Seluruh 5 data pengajuan uji sementara (`[QA-BERANDA-L]`) telah dihapus bersih, saldo asli 2026 pegawai uji dipulihkan utuh, dan server dev lokal dihentikan. Status: **Lulus 100% — Siap commit, push ke GitHub `main`, & rilis ke Vercel**.
- [x] **[VERIFIKASI QA PASCA-RILIS PRODUKSI - Sistem 4 Tema Simetris & Sakelar Siang/Malam (`55dce69`)] [2026-11-26]**:
  - **Sinkronisasi GitHub & Vercel:** `git ls-remote origin refs/heads/main` terkonfirmasi tepat pada commit **`55dce69`** (`main...origin/main` sinkron), dan rilis terbaru aktif tayang di `https://cuti-esdm.vercel.app`.
  - **Uji Browser Langsung Produksi (100% Hanya Baca, Nol Perubahan Data, 0 Galat Konsol, 0 Gagal HTTP `>= 400`):**
    - **Pengalihan Cookie Tema Lama Nyata di Produksi:** Saat `/beranda` pertama kali dibuka (dengan sisa cookie sesi sebelumnya `tema=notion-monokrom`), aplikasi otomatis beralih mulus ke **`data-tema="notion-light"`** (`meta[name="theme-color"]="#FBFBFA"`) tanpa error; `/login` & `/daftar` juga mengarahkan sesi aktif dengan bersih pada `notion-light`.
    - **Sakelar Cepat 1-Klik Siang/Malam & Menu Palet (Laptop `1280×800` & HP `390×844`):** Tombol 1-klik Bulan/Matahari langsung menukar **Notion Light ↔ Notion Dark** (`#191919`) dan **Langit Pagi** (`#F0F9FF`) **↔ Langit Malam** (`#0B1526`), sedangkan menu Palet (*Tampilan Aplikasi*) menampilkan segmen **Siang / Malam** + 2 pilihan gaya (**Notion** & **Langit**) yang mempertahankan mode aktif. Di layar HP `390×844`, judul **`Cuti ESDM`** tampil utuh tanpa terpotong bersama 5 kontrol bilah atas (`max right edge 367,6 px <= 390 px`), laci menu HP *Notion Dark* (`#202020`) & dropdown tampil rapi tanpa gulir samping.
    - **Isolasi Halaman Cetak di Mode Malam & Keutuhan Data Produksi:** Halaman `/cetak/rekap-cuti` tetap putih murni bertulisan hitam pekat tanpa efek kabut tombol saat **Notion Dark** maupun **Langit Malam** aktif (bilah cetak hitam arang di Notion, biru di Langit), serta halaman inti (`/beranda`, `/cuti/proses` antrean utuh, `/admin/hak-akses` 6 akun + inisial `ES`) terbuka normal tanpa galat. Tampilan dikembalikan rapi ke bawaan **Notion Light** di akhir pengecekan.
- [x] **[VERIFIKASI QA - Sistem 4 Tema Simetris (Notion Light/Dark & Langit Pagi/Malam), Sakelar Siang/Malam, & 8 Status Cuti] [2026-11-26]**:
  - **Audit Kode, Penghapusan Tema Lama, & Build Produksi:** Pencarian kode (`git grep -i`) memastikan **0 sisa referensi** `cursor-dark`, `mossy-stone`, maupun `notion-monokrom` di seluruh kode aplikasi (hanya tersisa pengujian pengalihan resmi di `tests/unit/tema.test.ts`). Seluruh pemeriksaan otomatis lulus bersih: `npm run typecheck` OK, `npm run lint` OK (0 error/warning), `npm test` **141/141 lulus** (16 file test, termasuk 8 unit test `tests/unit/tema.test.ts` yang memverifikasi pengalihan `cursor-dark`, `mossy-stone`, `notion-monokrom`, & kosong → `notion-light`), serta `npm run build` **OK (44/44 rute)**.
  - **Pengalihan Cookie Tema Lama & Pengunjung Baru Tanpa Kilatan Warna:** Audit alur server `app/layout.tsx` (`generateViewport` + `RootLayout`), `app/(aplikasi)/layout.tsx`, dan `PenyediaTema` bersama uji langsung `/login` membuktikan pengunjung baru maupun pemilik cookie tema lama langsung dirender sejak server pada `data-tema="notion-light"` (`meta[name="theme-color"]="#FBFBFA"`) tanpa error maupun kedipan warna.
  - **Uji Browser Lokal 4 Tema Simetris & 8 Data Pengajuan Cuti Uji (`1280×800` / `1366×800` Laptop & `390×844` HP, 0 galat konsol, 0 gagal HTTP `>= 400`):**
    - **Sakelar 1-Klik Siang/Malam & Bilah Atas HP:** Klik tombol Bulan/Matahari langsung menukar **Notion Light ↔ Notion Dark** (`#191919`) dan **Langit Pagi** (`#F0F9FF`) **↔ Langit Malam** (`#0B1526`); pindah gaya **Notion ↔ Langit** di dropdown *Tampilan Aplikasi* tetap mempertahankan mode Siang/Malam yang sedang aktif. Di HP `390×844`, judul **`Cuti ESDM`** tampil utuh tanpa terpotong bersama 5 kontrol header (`x=22,8..367,6 px`), serta laci menu HP (`#202020` di Notion Dark, `#0D192C` di Langit Malam) dan dropdown pas di dalam layar tanpa gulir samping.
    - **8 Lencana Status Cuti & Dropdown `<select>` (`/cuti/proses` & `/cuti/[id]`):** Seluruh **8 lencana status cuti** (*Diajukan*, *Disetujui Atasan*, *Diverifikasi Kepegawaian*, *Disetujui*, *Surat Terbit*, *Selesai*, *Ditolak*, *Dibatalkan*) diuji pada ke-4 tema (khususnya **Notion Dark** & **Langit Malam**) — kontras tajam, lembut di mata, dan mudah dibedakan; teks pilihan `<select>` (*Semua status*) duduk rata tengah vertikal; layar HP bebas gulir halaman (`375,2 px <= 390 px` di `/cuti/proses`, `/pegawai`, `/cuti/saldo`, dan `/cuti/[id]`).
    - **Editor Surat Pengajuan (`/cuti/[id]/surat/SURAT_IZIN`), Sticky A4 (`xl:top-20`), & Cetak Formulir (`/cetak/formulir/[id]`):** Kotak isian di *Notion Dark* kontras tegas terhadap kartu, `.editor-surat` (beserta `.blok-terkunci` & `.isian-terkunci`) dan kertas A4 `.lembar-cetak` terkunci putih murni `#FFFFFF` dengan teks hitam pekat `#000000` tanpa efek kabut tombol di *Notion Dark* maupun *Langit Malam* (bilah cetak hitam arang di Notion, biru di Langit), serta kolom pratinjau A4 berhenti rapi di bawah bilah atas saat layar digulir (`header bottom = 68 px`, `Pratinjau A4 y = 80 px`).
  - **Pembersihan:** Seluruh 8 data pengajuan uji sementara (`[QA-TEMA-NOTION]`) telah dihapus bersih dari database Docker lokal dan server dev lokal telah dihentikan. Status: **Lulus 100% — Siap commit, push ke GitHub `main`, & rilis ke Vercel**.
- [x] **[VERIFIKASI QA PASCA-RILIS PRODUKSI - Paket Bagian I (`705016c`, `4f5f445`) & Tema Ke-4 "Notion Monokrom" (`42ba5b5`)] [2026-11-26]**:
  - **Sinkronisasi GitHub & Deploy Vercel:** `git ls-remote origin refs/heads/main` terkonfirmasi menunjuk tepat ke commit terbaru **`42ba5b5`** (`main...origin/main` sinkron), dan website produksi `https://cuti-esdm.vercel.app` aktif menayangkan rilis penuh Bagian I + Bagian J.
  - **Uji Browser Langsung Produksi (100% Hanya Baca, Nol Perubahan Data, 0 Galat Konsol, 0 Gagal HTTP `>= 400`):**
    - **Tema Ke-4 Notion Monokrom Live (`/beranda`, `/admin/hak-akses`, `/cuti/proses`, `/cetak/rekap-cuti`):** Menu dropdown *Pilih Tema Tampilan* menampilkan lengkap **4 tema** (*Cursor Dark*, *Langit Pagi*, *Mossy Stone*, *Notion Monokrom*). Saat **Notion Monokrom** dipilih (`data-tema="notion-monokrom"`, `meta[name="theme-color"]="#FBFBFA"`), permukaan tampil datar putih kertas & hitam arang minimalis, 5 kartu ikon serasi, lencana status cuti tampil pastel lembut, dan halaman cetak `/cetak/rekap-cuti` tetap putih bersih teks hitam pekat dengan bilah cetak hitam arang tanpa efek kabut tombol.
    - **Bukti Paket Bagian I Aktif di Produksi (`/admin/hak-akses`):** Inisial `eerza311 (Superadmin)` kini tampil rapi **`ES`** (tidak lagi `E(`), seluruh **5 kolom centang** muat utuh di layar laptop (`951,2 px <= 951,2 px`), tombol filter cepat punya garis tepi tegas, dan tampilan layar HP (`390×844`) bebas gulir halaman ke samping (`375,2 px <= 390 px`).
    - **Keutuhan Data Produksi Neon (100% Aman):** **93 pegawai aktif** (`/pegawai`), **saldo cuti 2026** lengkap di 6 unit kerja tanpa peringatan kosong (`/cuti/saldo`), **12 pengajuan cuti** utuh (`/cuti/proses`: `1 Diajukan`, `6 Surat Terbit`, `4 Disetujui`, `1 Dibatalkan`), **4 folder Dokumen Organisasi** utuh (`0 dokumen`, `/dokumen/organisasi` menampilkan `maks. 1 MB` mengikuti nilai `1` di `/admin/pengaturan`), **6 akun** + foto profil `admin` tampil normal, dan `/dokumen` mengarahkan akun `admin` dengan rapi ke `/akses-ditolak`.
  - **Catatan Operasional Ringan:** Item `[PENDING RILIS]` kode telah ditutup; tersisa 2 langkah opsional di dashboard (klik **Run** sekali pada Cron `/api/tugas/harian` di Vercel / tunggu 01:00 WITA agar 6 cuti lama beralih ke *Selesai*, serta ubah batas unggah `1 → 4` MB di *Admin → Pengaturan* bila diinginkan).
- [x] **[VERIFIKASI QA - Tema Ke-4 "Notion Monokrom", 8 Lencana Status Cuti, & Regresi 4 Tema] [2026-11-26]**:
  - **Tes Otomatis & Build Produksi:** Audit seluruh 10 file perubahan + `npm run typecheck` OK, `npm run lint` OK (0 error/warning), `npm test` **138/138 lulus** (16 file test, termasuk 5 unit test `tests/unit/tema.test.ts`), dan `npm run build` **OK (44/44 rute)** siap rilis.
  - **Uji Browser Lokal dengan 8 Data Pengajuan Cuti Uji (`1280×800` Laptop & `390×844` HP, 0 galat konsol, 0 gagal HTTP):**
    - `/cuti/proses`: Seluruh **8 lencana status cuti** (*Diajukan*, *Disetujui Atasan*, *Diverifikasi Kepegawaian*, *Disetujui*, *Surat Terbit*, *Selesai*, *Ditolak*, *Dibatalkan*) tampil serasi dalam warna pastel kalem ala Notion dengan kontras tajam dan mudah dibedakan; bilah profil atas (`header > .kaca`) tampil putih solid `#FFFFFF` menutupi teks saat digulir; laci menu kiri HP tampil abu-abu kertas lembut tanpa gulir samping (`375,2 px <= 390 px`).
    - `/cuti/[id]` (*Disetujui* & *Ditolak*), `/cuti/[id]/surat/SURAT_IZIN` (editor `.editor-surat`, blok & isian terkunci, pratinjau A4 `.lembar-cetak`), serta `/cetak/formulir/[id]`: Kertas formulir & surat terkunci putih murni `#FFFFFF` dengan teks hitam pekat `#000000`, bilah atas layar cetak (`.bilah-cetak`) tampil hitam arang `#191919` serasi Notion tanpa efek kabut tombol, dan layar HP `390×844` bebas melebar ke samping (`375,2 px <= 390 px`).
    - **Regresi Lintas 4 Tema (`Notion Monokrom`, `Cursor Dark`, `Langit Pagi`, `Mossy Stone`):** Di `/admin/hak-akses` (`1280×800`), seluruh 5 kolom centang muat utuh di dalam tabel (`936 px <= 951,2 px`) di keempat tema, tombol filter punya garis tepi tegas, kartu ikon *Proses Cuti* tampil pastel biru serasi di Notion Monokrom, dan layar HP bebas gulir halaman; di `/cetak/rekap-cuti`, kertas cetak tetap putih bersih dengan teks hitam pekat & bebas efek kabut tombol di keempat tema (bilah cetak hitam arang khusus Notion Monokrom).
  - **Pembersihan:** Seluruh 8 data pengajuan uji sementara (`[QA-TEMA-NOTION]`) telah dihapus bersih dari database Docker lokal dan server dev lokal telah dihentikan. Status: **Lulus 100% — Siap commit & push ke GitHub `main` bersama `705016c` & `4f5f445` untuk rilis ke Vercel**.
- [x] **[VERIFIKASI QA - Cek Produksi Online & Sinkronisasi Git Pasca-Commit `705016c`] [2026-11-25]**:
  - **Temuan Kritis Sinkronisasi Rilis:** Pemeriksaan Git (`git status -sb` → `main...origin/main [ahead 1]` dan `git ls-remote origin refs/heads/main` → `b2cdbcb`) bersama pengecekan browser langsung (100% hanya baca) di `https://cuti-esdm.vercel.app` membuktikan bahwa **commit `705016c` belum terkirim (`push`) ke GitHub `main`**, sehingga website online **masih menayangkan versi lama `b2cdbcb`**.
  - **Bukti Langsung di Website Online (`https://cuti-esdm.vercel.app`, 0 galat konsol, 0 perubahan data):**
    - `/admin/hak-akses`: 6 akun berakun tampil normal, tetapi inisial `eerza311 (Superadmin)` masih **`E(`** (belum berubah menjadi **`ES`** dari `705016c`).
    - `/cuti/proses`: **12 pengajuan cuti** utuh (`1 Diajukan`, `6 Surat Terbit` periode Okt–6 Nov 2026, `4 Disetujui`, `1 Dibatalkan`, `0 Selesai`) — ke-6 cuti lama belum berubah menjadi **Selesai** karena jadwal `vercel.json` dan `GET /api/tugas/harian` belum tayang di Vercel.
    - `/admin/pengaturan` & `/dokumen/organisasi`: kolom *Ukuran maks. unggahan (MB)* (`dokumen.maks_ukuran_mb`) di database produksi masih berisi angka **`1`**, sehingga halaman *Dokumen Organisasi* menampilkan `maks. 1 MB`.
    - Keutuhan data & tampilan produksi terkonfirmasi **100% aman**: `/beranda` (avatar foto profil tampil tajam, `<meta name="theme-color">` `#0E0E10`), `/pegawai` (**93 pegawai aktif**), `/cuti/saldo` (tahun **2026**, 6 unit kerja tanpa peringatan saldo kosong), `/dokumen/organisasi` (**4 folder** masing-masing 0 dokumen), `/dokumen` (mengarahkan akun `admin` tanpa profil pegawai secara rapi ke `/akses-ditolak`), serta layar HP `390×844` bebas melebar ke samping (`375,2 px <= 390 px`).
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