# 💬 Persona — Chat Karakter AI Privat

Chat bergaya WhatsApp dengan karakter yang terasa nyata — untuk latihan pendalaman peran film.
Bisa kirim foto (AI bisa melihatnya), kepribadian karakter bebas dikustom, dan mendukung
**Gemini, Grok (xAI), OpenRouter, serta endpoint custom** (Ollama/LM Studio, dll).

## ✨ Sekarang SUPER simpel

- ❌ **Tanpa Docker**
- ❌ **Tanpa database / PostgreSQL**
- ❌ **Tanpa file `.env` / environment variable**
- ✅ Semua chat, foto, karakter, dan API key tersimpan **di browser perangkatmu** (IndexedDB)
- ✅ Server hanya meneruskan pesan ke provider AI — **tidak menyimpan apa pun**
- ✅ Upload ke GitHub → import ke Vercel → langsung dapat link untuk laptop & HP

---

## 🚀 Deploy ke Vercel lewat GitHub (±5 menit, tanpa install apa pun)

### Langkah 1 — Upload ke GitHub (lewat browser, tanpa Git)

1. Buka https://github.com/new → buat repository baru, misal `persona-chat` → **Create repository**.
2. Di halaman repo kosong, klik tulisan **"uploading an existing file"**.
3. **Seret (drag & drop) isi folder proyek ini** ke halaman itu —
   **KECUALI** folder `node_modules` dan `.next` (bila ada). Yang penting ikut:
   `src/`, `public/`, `package.json`, `tsconfig.json`, `next.config.ts`,
   `postcss.config.mjs`, `eslint.config.mjs`, `.gitignore`, `README.md`.
4. Klik **Commit changes**. Selesai, kodemu sudah di GitHub.

> Sudah punya Git? Boleh juga:
> `git init` → `git add .` → `git commit -m "Persona"` →
> `git remote add origin https://github.com/USERNAME/persona-chat.git` → `git push -u origin main`

### Langkah 2 — Import ke Vercel

1. Buka https://vercel.com → **Sign up / Log in with GitHub** (gratis).
2. Klik **Add New… → Project** → pilih repo `persona-chat` → **Import**.
3. **Langsung klik Deploy** — tidak perlu mengubah pengaturan apa pun, tidak ada env variable.
4. Tunggu ±1 menit → kamu dapat link seperti **`https://persona-chat.vercel.app`** 🎉

### Langkah 3 — Buka & pakai

1. Buka link Vercel itu di **laptop atau HP** (link yang sama, tidak perlu install apa pun).
2. Klik ikon **⚙️ Pengaturan** → pilih **Google Gemini** →
   ambil API key **gratis** di https://aistudio.google.com/apikey → tempel → **Simpan Provider**.
3. Klik ikon ⚡ **Tes koneksi** untuk memastikan key berfungsi.
4. Pilih karakter contoh (Alya / Bima / Nenek Wulan) atau buat karaktermu sendiri → mulai chat!

> Setiap kali kamu mengubah kode di GitHub, Vercel otomatis men-deploy ulang. ✨

---

## 💻 (Opsional) Menjalankan di laptop

Tidak wajib — link Vercel saja sudah cukup. Tapi kalau mau coba lokal:

```bash
npm install
npm run dev
```

Buka http://localhost:3000. Cuma butuh **Node.js 20+** — tanpa Docker, tanpa database.

---

## 🔒 Privasi & catatan penting

- **Data per perangkat/browser.** Chat di HP terpisah dari chat di laptop (masing-masing
  menyimpan datanya sendiri). Menghapus data browser = menghapus chat.
- **API key** hanya tersimpan di browser kamu. Saat chat, key diteruskan lewat fungsi server
  aplikasi langsung ke provider pilihanmu — tidak disimpan di server mana pun.
- **Foto otomatis dikecilkan** di browser sebelum dikirim (hemat kuota & cepat).
- Link Vercel-mu bisa dibuka siapa saja yang tahu alamatnya, tapi **mereka tidak bisa melihat
  chat/API key-mu** (datanya ada di browser masing-masing). Mereka hanya bisa memakai aplikasinya
  dengan key mereka sendiri.

## 🛠️ Troubleshooting

| Masalah | Solusi |
|---|---|
| Balasan error 401/403 | API key salah/kadaluarsa — periksa di Pengaturan, pakai tombol ⚡ Tes |
| Model tidak ditemukan | Ganti nama model di Pengaturan (Gemini: `gemini-2.5-flash`, OpenRouter: cari di openrouter.ai/models) |
| Balasan lama/timeout | Model berat (mis. Grok reasoning) bisa lambat — coba model yang lebih ringan |
| Chat hilang | Data browser terhapus / ganti browser / mode incognito — gunakan mode normal |
| Ingin pindah perangkat | Belum ada sinkron antar perangkat — tiap perangkat punya percakapannya sendiri |

Selamat berlatih peran! 🎬
