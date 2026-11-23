<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Aturan Bahasa & Komunikasi (Berlaku untuk Semua AI Agent)
- Gunakan **Bahasa Indonesia yang sederhana, lugas, dan ramah untuk pemula** di bidang pemrograman.
- **Jangan gunakan gaya bahasa teknis yang membingungkan** (hindari jargon keamanan, database, atau istilah coding yang rumit). Jika terpaksa menyebut nama file atau istilah komputer, jelaskan maksudnya singkat dengan bahasa sehari-hari atau perumpamaan sederhana.
- Fokus menjelaskan **apa dampaknya bagi pegawai/admin** dan **apa yang akan dilakukan sistem**, bukan detail teknis yang berbelit.

## Aturan Wajib Menuliskan Prompt Penerus (Handover)
- Setiap kali kamu selesai menjawab tetapi **prosesnya masih belum selesai**, **masih butuh dicek**, atau **perlu dikerjakan/dilanjutkan oleh AI Agent lain**, kamu **WAJIB** menuliskan bagian khusus di paling bawah jawabanmu berjudul **`Prompt untuk AI Agent Selanjutnya`**.
- Buat dalam kotak kode (*code block*) yang siap langsung disalin (*copy-paste*) oleh pengguna ke sesi chat AI Agent berikutnya.
- Isi prompt penerus minimal mencakup:
  1. **Nama AI Agent tujuan** (`Architect`, `Coder`, `Debugger/QA`, `UI/UX Stylist`, `Chatbot`, atau `Kantor`).
  2. **Ringkasan singkat** apa yang sudah selesai dilakukan atau diputuskan.
  3. **Tugas jelas berikutnya** yang harus dikerjakan beserta file terkait.
  4. Pengingat untuk tetap mengikuti aturan di [AGENTS.md](AGENTS.md) dan membaca/memperbarui [DEV_SYNC.md](DEV_SYNC.md) bila relevan.

## Daftar Sesi AI Agent Proyek Ini
Panduan masing-masing sesi tersedia di folder [ai-agents/](ai-agents/README.md) dan juga aktif sebagai perintah slash di `.agents/skills/`:
- **Chatbot** (`ai-agents/Chatbot.md` / `/chatbot`): Diskusi, tanya jawab, dan brainstorming (**100% hanya baca**, dilarang mengubah kode/file/data).
- **Kantor** (`ai-agents/Kantor.md` / `/kantor`): Ruang rapat tempat seluruh AI Agent mengemukakan pendapat mereka semua.
- **Architect** (`ai-agents/Architect.md` / `/architect`): Merancang alur fitur dan struktur data (`DEV_SYNC.md` Bagian 1).
- **Coder** (`ai-agents/Coder.md` / `/coder`): Menulis dan memperbaiki kode sesuai rancangan (`DEV_SYNC.md` Bagian 2).
- **UI/UX Stylist** (`ai-agents/UI-UX-Stylist.md` / `/ui-ux`): Merapikan tampilan dan kenyamanan pakai (`DEV_SYNC.md` Bagian 3).
- **Debugger / QA** (`ai-agents/Debugger-QA.md` / `/debugger`): Menguji aplikasi, mencari bug/risiko keamanan (`DEV_SYNC.md` Bagian 4 & 5).
