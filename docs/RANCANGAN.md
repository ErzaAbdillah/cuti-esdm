# Rancangan — Absensi & Cuti ESDM Kalsel

Status: **disetujui** 22 Oktober 2026 dengan rekomendasi A–D · skema aktif: [prisma/schema.prisma](../prisma/schema.prisma)

Dokumen ini memenuhi permintaan "sebelum coding, tampilkan dulu struktur folder, skema database, dan daftar halaman".

Perubahan skema setelah persetujuan: tabel `kode_aktivasi` (Keputusan A), kolom `template_surat.disposisi` (kotak disposisi Nota Dinas), dan ruang dokumen `LAMPIRAN_KETERANGAN` (lampiran dinas luar/sakit).

---

## 0. Temuan dari dokumen acuan yang mengubah spesifikasi

Sumber yang dibaca: dua daftar hadir ABSEN (Mei & Oktober 2026), empat contoh surat `.wps`, `PENGANTAR CUTI KE SEKDA 2026.docx`, Peta Jabatan hlm. 345–347, dan `Website Cuti.pdf` (rekap cuti hasil pindai).

| # | Temuan | Dampak pada rancangan |
|---|---|---|
| 1 | **NIP PPPK berpola lain**: `19900425 202421 1 016`. Digit 9–14 berisi tahun + kode `21`, bukan YYYYMM. | Validasi NIP menerima 2 pola: PNS (bulan 01–12) dan PPPK (kode 21). Kalau mengikuti pola di spesifikasi, semua NIP PPPK akan ditolak. |
| 2 | Ada **PPPK Paruh Waktu** (golongan "–" di daftar hadir) dan **PJLP** (Non-ASN tanpa NIP, daftar hadirnya terpisah: "PENYEDIA JASA LAINNYA PERORANGAN (PJLP)"). | Status kepegawaian: PNS / PPPK / PPPK Paruh Waktu / Non-ASN. Daftar hadir PJLP dicetak sebagai lembar terpisah. |
| 3 | Golongan PPPK ditulis "Golongan IX", tanpa nama pangkat. | Master pangkat/golongan memuat PNS I/a–IV/e (dengan nama pangkat) dan PPPK I–XVII. |
| 4 | **Eselon III membuat dua dokumen**: Nota Dinas ke Sekretaris Daerah (dengan kotak disposisi Asisten dan Sekda) **dan** permohonan ke Kepala BKD. Eselon II membuat Nota Dinas ke Gubernur (disposisi Asisten, Sekda, Gubernur). | Satu level boleh punya lebih dari satu template dokumen. |
| 5 | Surat Eselon II–IV berupa **permohonan** ke pihak luar (Gubernur/BKD) dan dicetak *sebelum* ada keputusan. Surat staf berupa **izin** (keputusan Kepala Dinas). | Urutan cetak dan persetujuan berbeda per level, lihat §5. |
| 6 | Surat staf menulis "kepada Pegawai Negeri Sipil" walaupun contoh pemohonnya PPPK (Golongan IX). | Template memakai placeholder `{{sebutan_status}}`. |
| 7 | Tembusan surat staf memuat Kabid dan Kasie pemohon. | Tembusan mendukung placeholder dinamis (`{{kepala_unit_pemohon}}`, dst.). |
| 8 | Peta Jabatan: **JF Perencana Ahli Madya kelas 12**, JF Ahli Muda kelas 10. | Pemetaan kelas → eselon **hanya untuk jabatan struktural**. Jika hanya berdasar kelas, JF Ahli Madya akan ikut terhitung Eselon III. |
| 9 | Daftar hadir fisik memakai **kertas Legal (215,9 × 355,6 mm)**, bukan A4. Di bawahnya ada blok tanda tangan kepala unit, dan nama jabatan disingkat ("Kasie …"). | Ukuran kertas daftar hadir diatur di pengaturan (awal: Legal). Jabatan punya kolom `nama_singkat`. |
| 10 | Rekap cuti fisik memakai kolom 2024 \| 2025 \| 2026 \| Jumlah \| Sudah Diambil \| Sisa (maksimal 24 hari). | Saldo = sisa N-2 + sisa N-1 + hak N (PP 11/2017 Ps. 312). Laporan "Rekap Cuti Tahunan ASN" ditambahkan. |
| 11 | **Celah registrasi**: NIP tercetak di daftar hadir dan surat, jadi siapa pun yang mengetahui NIP orang lain bisa membuat akun atas nama orang itu lebih dulu. | Usulan: verifikasi tambahan dengan NIK, lihat Keputusan A. |
| 12 | Paket `xlsx` di npm berhenti di 0.18.5 dan punya kerentanan yang diketahui (prototype pollution dan ReDoS). Versi perbaikannya hanya tersedia dari cdn.sheetjs.com. | Pakai tarball resmi SheetJS 0.20.x dari CDN, bukan versi npm. |
| 13 | Dokumen acuan berisi nama dan NIP asli (daftar hadir, rekap cuti, `laporan_pegawai_2026.csv`). | Tidak ada yang disalin ke repo. Seeder memakai data fiktif dengan format yang sama. |

---

## 1. Keputusan yang perlu disetujui

Jika rancangan disetujui tanpa catatan, saya memakai **rekomendasi** di bawah ini.

- **A. Aktivasi akun.** Rekomendasi: pegawai memasukkan NIP **dan NIK**, yang dicocokkan dengan data impor. Jika NIK belum ada di data, Kepegawaian menerbitkan kode aktivasi sekali pakai (berlaku 7 hari). Alternatifnya hanya NIP sesuai spesifikasi, tetapi celah di temuan #11 tetap terbuka.
- **B. Alur Eselon II–IV.** Rekomendasi: Kepegawaian mencetak surat permohonan setelah pengajuan diverifikasi. Ketika keputusan Gubernur/BKD datang, Kepegawaian mencatat "Disetujui" dan mengunggah surat izinnya. Saldo dipotong pada saat itu. Rinciannya di §5.
- **C. Nota Dinas ke Sekda.** Rekomendasi: hanya untuk Eselon III, sesuai contoh. Admin bisa menambah template yang sama untuk Eselon IV tanpa mengubah kode.
- **D. Lokasi absen.** Rekomendasi: secara bawaan bisa dari mana saja. Ada pengaturan opsional berisi daftar IP/CIDR jaringan kantor; jika diisi, absen hanya diterima dari jaringan tersebut.

---

## 2. Stack

| Bagian | Pilihan | Catatan |
|---|---|---|
| Web | Next.js 16 (App Router), React 19, TypeScript | Mutasi data lewat Server Actions; berkas & PDF lewat Route Handlers |
| UI | Tailwind CSS 4, shadcn/ui, Plus Jakarta Sans, ikon lucide | |
| DB | PostgreSQL 17 + Prisma 7 | Ekstensi `pg_trgm` untuk pencarian nama pegawai dan dokumen |
| Auth | Sesi di tabel `sesi`, cookie `__Host-` httpOnly + SameSite=Lax, argon2id (`@node-rs/argon2`) | |
| Validasi | Zod 4, dipakai bersama oleh form dan server | |
| Editor surat | Tiptap 3: tebal, miring, daftar, tabel sederhana. Blok identitas berupa node terkunci | HTML disanitasi di server (`sanitize-html`, daftar tag yang diizinkan) |
| PDF & konversi | **Gotenberg 8** (kontainer sidecar): HTML → PDF lewat Chromium, DOCX/XLSX → PDF lewat LibreOffice. Penggabungan PDF dan gambar memakai `pdf-lib` | **Pengganti Playwright + LibreOffice di dalam image app.** Satu layanan menangani ketiga kebutuhan PDF, image app tetap kecil, dan mesin render sama di dev dan produksi. Pratinjau dan PDF dibuat dari HTML dan CSS `@page` yang sama. |
| Excel | SheetJS 0.20.x (tarball CDN resmi) | Lihat temuan #12 |
| Email | nodemailer melalui antrean `email_keluar` | Hanya aktif jika SMTP diisi di `.env` |
| Tes | Vitest (unit), Playwright (E2E) | |
| Deploy | Docker Compose: `app`, `worker`, `db`, `gotenberg`, `backup` | Zona waktu `Asia/Makassar` (WITA) untuk jam absen |

`worker` berupa cron ringan yang memanggil `POST /api/tugas/harian` (dilindungi `TUGAS_TOKEN`) untuk menandai Alpa, menandai cuti Selesai, dan mengirim email — logikanya tetap di aplikasi sehingga tidak perlu runtime kedua.

Koneksi database selalu memakai sesi `timezone=UTC` (adapter Prisma mengirim timestamp tanpa offset); tampilan memakai WITA.

---

## 3. Struktur folder

```
cuti-esdm/
├── app/
│   ├── (publik)/
│   │   ├── login/                  # login NIP / ID Non-ASN
│   │   └── daftar/                 # aktivasi akun
│   ├── (aplikasi)/                 # wajib login · sidebar + topbar
│   │   ├── beranda/
│   │   ├── absen/                  # absen masuk, daftar-hadir, keterangan, rekap
│   │   ├── cuti/                   # ajukan, [id], proses, [id]/surat/[kode], saldo, rekap
│   │   ├── pegawai/                # daftar, [id], baru, [id]/ubah, impor
│   │   ├── dokumen/                # pribadi, organisasi
│   │   ├── notifikasi/
│   │   ├── profil/
│   │   └── admin/                  # pengguna, master, surat, pengaturan, audit-log, …
│   ├── (cetak)/                    # tanpa sidebar · CSS @page · juga dirender Gotenberg
│   │   └── cetak/                  # surat/[versiId], daftar-hadir, rekap-cuti, rekap-absen
│   └── api/
│       ├── dokumen/[id]/berkas/    # pratinjau/unduh: cek akses + audit
│       ├── dokumen/cetak-gabungan/ # gabung file terpilih → 1 PDF
│       ├── surat/[versiId]/pdf/
│       ├── ekspor/[jenis]/         # xlsx / pdf
│       └── sehat/                  # healthcheck
├── components/
│   ├── ui/                         # shadcn/ui
│   ├── tata-letak/                 # Sidebar, Topbar, LatarAwan
│   ├── surat/                      # KopSurat, LembarA4, EditorSurat, BlokIdentitas
│   └── absen/ cuti/ pegawai/ dokumen/
├── server/                         # "server-only"
│   ├── auth/                       # sesi, password, csrf, rate-limit, rbac
│   ├── aksi/                       # Server Actions: zod → RBAC → transaksi → audit
│   ├── kueri/                      # query baca, sudah difilter sesuai hak akses
│   ├── surat/                      # render template, placeholder, penomoran, sanitasi
│   ├── dokumen/                    # simpan, cek MIME, enkripsi, gabung PDF, Gotenberg
│   ├── excel/                      # impor & ekspor
│   └── audit.ts · notifikasi.ts · email.ts · db.ts
├── lib/
│   ├── domain/                     # logika murni, diuji unit
│   │   ├── nip.ts                  # parse/validasi/format NIP PNS & PPPK
│   │   ├── hari-kerja.ts
│   │   ├── saldo-cuti.ts
│   │   ├── status-absen.ts
│   │   ├── alur-cuti.ts            # state machine status cuti
│   │   ├── level-surat.ts          # jabatan + kelas → Eselon II/III/IV/Staf
│   │   └── terbilang.ts            # 8 → "delapan"
│   ├── validasi/                   # skema zod bersama
│   └── generated/prisma/           # hasil generate, tidak di-commit
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed/
│       ├── master/                 # Peta Jabatan, pangkat, jenis cuti, eselon, template, pengaturan
│       └── dummy/                  # pegawai/akun/cuti/absen FIKTIF; menolak jalan bila APP_ENV=production
├── worker/                         # tandai-alpa, tandai-selesai, kirim-email
├── public/                         # lambang-kalsel.png, motif-awan.svg
├── tests/
│   ├── unit/
│   └── e2e/
├── docker/
│   ├── Dockerfile
│   └── backup/                     # pg_dump harian + retensi, restore.sh, uji-restore.sh
├── docs/
├── docker-compose.yml              # produksi
├── docker-compose.dev.yml          # dev: db + gotenberg saja
├── .env.example
└── README.md
```

Berkas unggahan disimpan di `STORAGE_DIR`, di luar repo dan di luar `public/`. Di dev lokasinya `./.data/berkas` (masuk `.gitignore`); di produksi berupa volume Docker.

---

## 4. Skema database

Skema lengkap: [prisma/schema.prisma](../prisma/schema.prisma). Ringkasan tabelnya:

| Kelompok | Tabel | Isi utama |
|---|---|---|
| Akun | `users` | login_id (NIP tanpa spasi / ID Non-ASN), password_hash, gagal_berturut, terkunci_sampai |
| | `user_peran` | ADMIN, KEPEGAWAIAN. Peran Pegawai melekat pada semua akun; peran Atasan diturunkan dari relasi atasan |
| | `sesi` | hash token, csrf_token, kedaluwarsa |
| | `log_login` | setiap percobaan login, berhasil atau gagal |
| Organisasi | `unit_kerja` | pohon Dinas → Sekretariat/Bidang/UPTD → Subbag/Seksi |
| | `jabatan` | nama, nama_singkat, jenis (struktural/fungsional/pelaksana), kelas, unit yang dipimpin |
| | `kelas_jabatan` | 1–17 |
| | `mapping_eselon` | kelas_min–kelas_max → level, khusus struktural |
| | `formasi_jabatan` | isi Peta Jabatan: jabatan × unit, kelas, B, K |
| | `pangkat_golongan` | PNS I/a–IV/e + nama pangkat, PPPK I–XVII |
| Pegawai | `pegawai` | semua kolom di bagian [5] spesifikasi, ditambah atasan_langsung_id, level_surat_override, urutan_daftar_hadir |
| Cuti | `jenis_cuti` | 6 jenis cuti PP 11/2017: satuan hitung, potong saldo, wajib lampiran, boleh tanggal lampau |
| | `aturan_cuti` | aturan per status kepegawaian (konfigurasi terpisah untuk PPPK/Non-ASN) |
| | `pengajuan_cuti` | tanggal, jumlah_hari, alasan, alamat & HP selama cuti, snapshot identitas & level |
| | `riwayat_status_cuti` | dari → ke, oleh, catatan, waktu |
| | `saldo_cuti` | per pegawai per tahun: hak, sisa N-1, sisa N-2, penyesuaian, terpakai |
| | `mutasi_saldo_cuti` | jejak setiap perubahan saldo (potong, kembali, penyesuaian, tutup tahun) |
| | `hari_libur` | libur nasional, cuti bersama, libur daerah |
| | `alur_persetujuan` | tahap per level dan siapa penyetujunya |
| Surat | `template_surat` | per level × kode dokumen: hal, tujuan, tembusan, isi HTML, format nomor, status minimal untuk bisa dicetak |
| | `pejabat_penandatangan` | awalan (Plt./Plh.), jabatan, nama, pangkat, NIP, periode berlaku |
| | `surat_cuti` | nomor urut per tahun (unik, bisa diedit), status DRAFT/TERKUNCI |
| | `surat_cuti_versi` | isi HTML + snapshot data; terkunci saat pertama dicetak |
| | `print_log` | jenis cetak, versi, pencetak, waktu |
| Absen | `absensi` | 1 baris per pegawai per hari: status, jam masuk, sumber |
| | `keterangan_kehadiran` | DL/sakit/izin/tugas untuk rentang tanggal + lampiran |
| Dokumen | `folder_dokumen`, `akses_folder` | folder kategori + hak lihat/kelola per peran |
| | `dokumen` | ruang (pribadi/organisasi/lampiran cuti), nama UUID, MIME, sha256, terenkripsi, soft delete |
| Lain-lain | `audit_log` | aksi, entitas, data sebelum/sesudah (nilai sensitif disamarkan), IP |
| | `pengaturan` | key-value; nilai yang masih [ISI] disimpan NULL |
| | `notifikasi`, `email_keluar` | notifikasi dashboard + antrean email |

Aturan yang dijaga di level database:

- Unik: `absensi (pegawai, tanggal)`, `saldo_cuti (pegawai, tahun)`, `surat_cuti (tahun, nomor_urut)`, `surat_cuti_versi (surat, versi)`.
- NIP disimpan 18 digit tanpa spasi dan ditampilkan dengan spasi `8 6 1 3`.
- Versi surat yang sudah terkunci tidak bisa diubah. Penyimpanan berikutnya selalu membuat versi baru.

---

## 5. Alur status cuti

```
Diajukan ─► Disetujui Atasan ─► Diverifikasi Kepegawaian ─► Disetujui Pejabat ─► Surat Terbit ─► Selesai
   │              │                       │                         │
   └──────────────┴───────── Ditolak (alasan wajib) ◄───────────────┘
   └── Dibatalkan oleh pegawai, kapan saja sebelum tanggal mulai (saldo dikembalikan bila sudah dipotong)
```

| Level | Dokumen | Bisa dicetak sejak | "Disetujui Pejabat" dicatat oleh |
|---|---|---|---|
| Staf (fungsional, pelaksana, PPPK) | Surat Izin Cuti | Disetujui | (Plt.) Kepala Dinas di aplikasi |
| Eselon IV | Permohonan ke Kepala BKD | Diverifikasi | Kepegawaian, dengan unggahan surat izin BKD |
| Eselon III | Nota Dinas ke Sekda + Permohonan ke Kepala BKD | Diverifikasi | Kepegawaian, dengan unggahan surat izin BKD |
| Eselon II | Nota Dinas ke Gubernur (dengan kotak disposisi) | Diverifikasi | Kepegawaian, dengan unggahan disposisi/izin Gubernur |

- Tahap persetujuan diatur per level di `alur_persetujuan`. Tahap atasan dilewati otomatis jika atasannya juga pejabat penyetuju, atau jika pemohon tidak punya atasan di dinas (Kepala Dinas).
- Saldo dipesan saat pengajuan dibuat, sehingga dua pengajuan bersamaan tidak bisa melebihi saldo. Saldo dipotong saat Disetujui Pejabat dan dikembalikan saat Dibatalkan atau Ditolak. Pemotongan dimulai dari sisa N-2, lalu N-1, lalu hak tahun berjalan.
- Status Selesai ditandai worker sehari setelah tanggal selesai cuti.

---

## 6. Daftar halaman

| Halaman | Isi | Peran |
|---|---|---|
| `/login` | Lambang Kalsel, "Absensi & Cuti ESDM Kalsel", NIP/ID + password | publik |
| `/daftar` | Aktivasi akun: NIP (+ NIK atau kode aktivasi), lalu buat password | publik |
| `/beranda` | Saldo cuti, status pengajuan, absen hari ini, dokumen terbaru. Atasan juga melihat antrean persetujuan; Kepegawaian melihat antrean verifikasi dan ringkasan kehadiran; Admin melihat peringatan pengaturan yang masih [ISI] | semua |
| `/notifikasi` | Semua notifikasi | semua |
| `/profil` | Data diri (hanya baca), ganti password | semua |
| **Absen** | | |
| `/absen` | Tombol "Absen Masuk", status hari ini, riwayat bulan ini. Dirancang untuk HP | pegawai |
| `/absen/daftar-hadir` | Daftar per unit per tanggal mengikuti kolom form fisik; isi kolom Ket.; cetak | atasan (unitnya), kepegawaian |
| `/absen/keterangan` | Catat dinas luar/sakit/izin/tugas untuk rentang tanggal + lampiran | atasan (bawahannya), kepegawaian |
| `/absen/rekap` | Rekap bulanan per pegawai (hadir, terlambat, cuti, DL, alpa), ekspor Excel | atasan (unitnya), kepegawaian |
| **Cuti** | | |
| `/cuti` | Saldo saya dan daftar pengajuan saya | pegawai |
| `/cuti/ajukan` | Form pengajuan; hari kerja dihitung langsung; validasi saldo dan bentrok. Dirancang untuk HP | pegawai |
| `/cuti/[id]` | Detail, riwayat status, lampiran, tombol aksi sesuai peran dan status, daftar surat | pemohon, atasan, kepegawaian, admin |
| `/cuti/proses` | Antrean bertab: Persetujuan Atasan / Verifikasi / Keputusan Pejabat / Siap Cetak | atasan, kepegawaian, pejabat |
| `/cuti/[id]/surat/[kode]` | Pratinjau A4 + editor; Simpan Draft, Kembalikan ke Template, Cetak, Unduh PDF; riwayat versi dan print log | kepegawaian (edit), pemohon (edit draft dan cetak surat sendiri) |
| `/cuti/saldo` | Saldo per pegawai per tahun, penyesuaian manual, impor saldo awal, proses tutup tahun | kepegawaian |
| `/cuti/rekap` | Rekap Cuti Tahunan ASN per unit (format form fisik), ekspor | kepegawaian |
| **Pegawai** | | |
| `/pegawai` | Pencarian, filter (unit, jabatan, eselon, pangkat, status, aktif), sorting, paging, ekspor Excel/PDF | kepegawaian, admin |
| `/pegawai/[id]` | Tab Identitas · Kepegawaian · Cuti · Absen · Dokumen. NIK, alamat, dan HP disamarkan; tombol "Tampilkan" dicatat di audit | kepegawaian, admin, pegawai ybs |
| `/pegawai/baru`, `/pegawai/[id]/ubah` | Form data pegawai | kepegawaian |
| `/pegawai/impor` | Unduh template → unggah xlsx → pratinjau validasi per baris → simpan | kepegawaian, admin |
| **Dokumen** | | |
| `/dokumen` | Dokumen pribadi per kategori: unggah, pratinjau, unduh, ganti nama/kategori, hapus, cari, centang lalu "Cetak" | pegawai |
| `/dokumen/organisasi` | Folder kategori dengan hak akses per peran | sesuai hak folder |
| **Admin** | | |
| `/admin/pengguna` | Akun, peran, reset password, buka kunci, nonaktifkan, kode aktivasi | admin |
| `/admin/log-login` | Riwayat login | admin |
| `/admin/master/*` | Unit kerja, jabatan & formasi, mapping eselon, pangkat/golongan, jenis & aturan cuti | admin |
| `/admin/hari-libur` | Libur nasional dan cuti bersama per tahun | admin |
| `/admin/alur-persetujuan` | Tahap persetujuan per level | admin |
| `/admin/surat/template` | Template per level dan dokumen, daftar placeholder, pratinjau dengan data contoh | admin |
| `/admin/surat/penandatangan` | Pejabat, Plt./Plh., periode berlaku | admin |
| `/admin/surat/penomoran` | Format nomor dan nomor terakhir per tahun | admin |
| `/admin/folder-dokumen` | Folder kategori dan hak akses per peran | admin |
| `/admin/dokumen-terhapus` | Pulihkan dokumen yang dihapus | admin |
| `/admin/pengaturan` | Kop/instansi, absen, aturan akumulasi cuti, ukuran kertas, status SMTP | admin |
| `/admin/audit-log` | Filter dan ekspor | admin |
| **Cetak** (tanpa sidebar) | | |
| `/cetak/surat/[versiId]` | Lembar A4 dengan kop; sumber yang sama untuk pratinjau, cetak browser, dan PDF | sesuai hak surat |
| `/cetak/daftar-hadir` | Form DAFTAR HADIR MASUK KERJA (Legal); kolom TTD kosong | atasan, kepegawaian |
| `/cetak/rekap-cuti`, `/cetak/rekap-absen` | Laporan siap cetak | kepegawaian |

Halaman `/absen`, `/cuti/ajukan`, dan `/cuti/[id]` diuji pada lebar 360 px dengan gutter 16 px dan tanpa scroll horizontal.

---

## 7. Pengaturan dan nilai [ISI]

| Kunci | Nilai awal | Perilaku selama belum diisi |
|---|---|---|
| `absen.jam_masuk` | [ISI] | Absen tetap bisa; status selalu Hadir |
| `absen.toleransi_terlambat_menit` | [ISI] | Tidak ada status Terlambat |
| `absen.batas_alpa` | [ISI] | Alpa tidak ditandai otomatis |
| `absen.hari_kerja` | Senin–Jumat | (sesuai contoh 01–10 Juli 2026 = 8 hari kerja) |
| `absen.jaringan_kantor` | kosong | Absen dari mana saja (Keputusan D) |
| `cuti.maks_sisa_n1`, `cuti.maks_sisa_n2` | 6, 6 | Mengikuti PP 11/2017; verifikasi ke BKD |
| `surat.klasifikasi`, `surat.kode_instansi` | 800.1.11.4, DESDM | |
| `daftar_hadir.ukuran_kertas` | Legal | |
| `instansi.*` | alamat, telepon, fax, email, website sesuai kop | |

Selama masih ada nilai [ISI] yang kosong, Admin melihat banner peringatan.

Alpa otomatis hanya untuk pegawai yang punya akun aktif, dan baru sejak akunnya ada sebelum batas alpa hari itu. Pegawai yang masih tanda tangan di kertas (belum aktivasi, termasuk PJLP) dicatat atasan/Kepegawaian dari halaman Daftar Hadir. Hari libur dan cuti bersama 2026 diisi dari SKB 3 Menteri dan perlu diverifikasi Admin.

---

## 8. Keamanan & data pribadi

- RBAC diperiksa di setiap Server Action dan Route Handler, bukan hanya disembunyikan di UI. Ada tes otorisasi untuk setiap aksi.
- CSRF: Server Actions sudah memeriksa Origin. Route Handler yang mengubah data memakai token CSRF per sesi.
- Login: 5 kali gagal berturut-turut mengunci akun 15 menit, ditambah batas per IP. Semua percobaan login masuk `log_login`.
- Admin pertama dibuat lewat perintah CLI dan wajib mengganti password saat login pertama.
- Upload: cek ekstensi dan *magic bytes*, maksimal 10 MB, nama file UUID, `Content-Disposition` + `nosniff`. DOCX/XLSX dipratinjau sebagai PDF hasil konversi.
- Dokumen pribadi (KTP, KK, ijazah, SK) dienkripsi AES-256-GCM saat disimpan, dengan kunci di `.env`.
- Data sensitif disamarkan secara bawaan; membukanya tercatat di audit. Ekspor tidak memuat kolom sensitif kecuali dipilih Kepegawaian, dan pilihan itu juga tercatat di audit.
- Backup: `pg_dump` harian + arsip berkas, retensi 14 hari (bisa diatur). `uji-restore.sh` memulihkan backup ke database sementara lalu mencocokkan jumlah baris.
- Dev dan produksi dipisah lewat `APP_ENV`. Seeder data dummy menolak jalan di produksi; data asli masuk hanya lewat impor Excel.

---

## 9. Pengujian

**Unit (Vitest)**
- `hari-kerja`: 01–10 Juli 2026 = 8; 02–17 Januari 2024 = 12 (dari contoh surat Eselon II); rentang yang memuat libur dan cuti bersama.
- `saldo-cuti`: urutan pemotongan N-2 → N-1 → N; pengembalian; batas akumulasi; tutup tahun; saldo yang sedang dipesan.
- `status-absen`: Hadir/Terlambat di sekitar batas, Cuti mengalahkan absen, keterangan DL, Alpa setelah batas, pengaturan yang masih [ISI].
- `nip`: pola PNS dan PPPK, bulan tidak valid, digit jenis kelamin.
- `level-surat`: JF kelas 12 tetap Staf.
- `alur-cuti`: setiap transisi status yang sah dan yang tidak sah.

**E2E (Playwright)**
- NIP terdaftar bisa aktivasi dan login; NIP tidak terdaftar ditolak.
- Staf mengajukan cuti → atasan setuju → Kepegawaian verifikasi → Kepala Dinas setuju → surat diedit dan dicetak → surat terkunci, dan edit berikutnya menjadi versi 2.
- Cetak daftar hadir; gabung beberapa dokumen menjadi satu PDF; tidak ada scroll horizontal di viewport HP.

---

## 10. Urutan pengerjaan

Urutannya sama dengan spesifikasi. Setiap tahap berakhir dalam keadaan bisa dijalankan, lalu di-commit. Repo belum menjadi git repository, jadi `git init` dilakukan di awal tahap 1.

1. Skema, migrasi, seeder master (Peta Jabatan, pangkat, jenis cuti, template, pengaturan) + seeder dummy
2. Login NIP, aktivasi, RBAC, kerangka dashboard, tema langit
3. Data pegawai: CRUD, cari, filter, impor/ekspor Excel
4. Absen, daftar hadir, cetak, rekap, worker alpa
5. Pengajuan cuti, alur persetujuan, saldo, notifikasi
6. Template surat per level, editor, versi, cetak dan PDF
7. Ruang dokumen dan cetak gabungan
8. Audit log, backup/restore, tes lengkap, README (setup dan cara impor)
