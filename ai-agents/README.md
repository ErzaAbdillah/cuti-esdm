# Panduan Sesi AI Agent — Layanan Cuti ESDM Kalsel

Folder ini berisi file instruksi (`.md`) untuk membuka sesi chat/conversation baru sesuai peran masing-masing AI Agent.

## Cara Menggunakan (Pilih Salah Satu yang Paling Mudah)

1. **Cara Paling Praktis (Perintah Slash):**  
   Buka chat/conversation baru di proyek ini, lalu ketik langsung perintah berikut:
   - `/chatbot` → Ngobrol, tanya jawab, curah ide (**100% aman, tidak bisa ubah kode**)
   - `/kantor` → Rapat bersama tempat **semua AI Agent** mengemukakan pendapatnya
   - `/architect` → Merancang alur fitur & struktur data (`Conversation 3`)
   - `/coder` → Menulis atau mengubah kode aplikasi (`Conversation 1`)
   - `/ui-ux` → Merapikan tampilan, warna, tombol, & layar HP/laptop (`Conversation 4`)
   - `/debugger` → Menguji fitur, mencari error & celah keamanan (`Conversation 2`)

2. **Cara Manual (Menyebut File atau Copy-Paste):**  
   Buka chat baru, lalu ketik `@ai-agents/Chatbot.md` (atau pilih file yang sesuai di bawah), lalu tulis pertanyaan atau perintah Anda. Anda juga bisa menyalin isi file `.md` langsung ke pesan pembuka chat baru.

---

## Daftar File AI Agent

| Nama Sesi | File Panduan | Perintah Slash | Tugas Utama | Bisa Ubah Kode? |
| :--- | :--- | :--- | :--- | :--- |
| **Chatbot** | [Chatbot.md](Chatbot.md) | `/chatbot` | Diskusi, tanya jawab, brainstorming | **TIDAK (100% Hanya Baca)** |
| **Kantor** | [Kantor.md](Kantor.md) | `/kantor` | Forum pendapat semua AI Agent | **Tidak (Default rapat, kecuali diminta)** |
| **Architect** | [Architect.md](Architect.md) | `/architect` | Merancang alur & rencana (`DEV_SYNC.md` Bag. 1) | Biasanya merancang (tulis di `DEV_SYNC.md`) |
| **Coder** | [Coder.md](Coder.md) | `/coder` | Membuat & mengubah fitur aplikasi (`DEV_SYNC.md` Bag. 2) | **Ya** |
| **UI/UX Stylist** | [UI-UX-Stylist.md](UI-UX-Stylist.md) | `/ui-ux` | Memoles tampilan & kenyamanan pakai (`DEV_SYNC.md` Bag. 3) | **Ya (khusus tampilan UI)** |
| **Debugger / QA** | [Debugger-QA.md](Debugger-QA.md) | `/debugger` | Mengecek error, logika, & keamanan (`DEV_SYNC.md` Bag. 4 & 5) | Mengecek & lapor (perbaiki hanya jika diminta) |

---

## Aturan Bersama (Berlaku untuk Semua AI Agent)
1. **Bahasa Ramah Pemula:** Seluruh AI Agent wajib memakai bahasa Indonesia sehari-hari yang mudah dipahami, bukan gaya bahasa teknis yang membingungkan.
2. **Estafet Otomatis (Prompt Penerus):** Jika suatu pekerjaan belum tuntas atau butuh dilanjutkan/dicek oleh AI Agent lain, AI Agent wajib menuliskan **Prompt untuk AI Agent Selanjutnya** di bagian paling bawah jawabannya agar Anda tinggal menyalin dan menempelnya di chat berikutnya.
