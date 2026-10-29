# 💬 Persona — Chat Karakter AI Privat

Chat bergaya WhatsApp dengan karakter yang terasa nyata — untuk latihan pendalaman peran film.
Bisa kirim foto (AI bisa melihatnya), kepribadian karakter bebas dikustom, dan mendukung
**Gemini, Grok (xAI), OpenRouter, serta endpoint custom** (Ollama/LM Studio, dll).

🔗 **Versi online:** https://waichat.vercel.app

## ✨ Tanpa database, tanpa setup

- ❌ Tanpa Docker
- ❌ Tanpa database / PostgreSQL
- ❌ Tanpa file `.env` / environment variable wajib
- ✅ Semua chat, foto, karakter, dan API key tersimpan **di browser perangkat** (IndexedDB)
- ✅ Server hanya meneruskan pesan ke provider AI — **tidak menyimpan apa pun**
- ✅ Bisa di-*install* ke home screen HP (PWA), ikon & tema sudah disiapkan

---

## 🧱 Struktur proyek

```
src/
├─ app/
│  ├─ api/chat/route.ts    # proxy ke provider AI (prompt "method acting" dirakit di server)
│  ├─ api/test/route.ts    # tes koneksi API key
│  ├─ api/health/route.ts
│  ├─ fonts/               # font Plus Jakarta Sans (self-host, di-preload)
│  ├─ globals.css
│  ├─ layout.tsx           # metadata, OG image, PWA manifest
│  └─ page.tsx
├─ components/             # Sidebar, ChatWindow, Composer, modal-modal
├─ lib/
│  ├─ ai/                  # gemini, openai-compatible, promptBuilder, error mapping
│  ├─ imageClient.ts       # kompres foto di browser sebelum dikirim
│  └─ storage.ts           # IndexedDB + cadangan/pemulihan
└─ types/chat.ts
public/
├─ images/char-*.jpg       # avatar karakter contoh
├─ icon.svg, icon-*.png    # ikon aplikasi
├─ og.png                  # gambar pratinjau saat link dibagikan
└─ manifest.webmanifest
```

---

## 🚀 Deploy ke Vercel (lewat GitHub)

1. Push perubahan ke repo `misalnyadev/wai` (branch `main`).
2. Vercel yang sudah terhubung ke repo akan **otomatis build & deploy**.
3. Buka https://waichat.vercel.app — tidak ada environment variable yang wajib diisi.

> Opsional: set `NEXT_PUBLIC_SITE_URL` di Vercel bila memakai domain sendiri,
> supaya URL pada metadata/OG image ikut menyesuaikan.

---

## 💻 Menjalankan di laptop

```bash
npm install
npm run dev     # http://localhost:3000
```

Cek kualitas kode sebelum push:

```bash
npm run typecheck
npm run lint
npm run build
```

Cuma butuh **Node.js 20+**.

---

## 🔒 Privasi & catatan penting

- **Data per perangkat/browser.** Chat di HP terpisah dari chat di laptop. Menghapus data
  browser = menghapus chat. Gunakan **Pengaturan → Data & cadangan** untuk mengunduh file
  cadangan `.json` dan memulihkannya di perangkat lain.
- **API key** hanya tersimpan di browser. Saat chat, key diteruskan lewat fungsi server
  aplikasi langsung ke provider pilihanmu — tidak disimpan di server mana pun.
  File cadangan **memuat API key**, jadi simpan di tempat aman.
- **Foto otomatis dikecilkan** di browser sebelum dikirim (hemat kuota & cepat).
- Link Vercel-mu bisa dibuka siapa saja yang tahu alamatnya, tapi **mereka tidak bisa melihat
  chat/API key-mu** (datanya ada di browser masing-masing). Mereka hanya bisa memakai aplikasinya
  dengan key mereka sendiri.

## 🛠️ Troubleshooting

| Masalah | Solusi |
|---|---|
| Error 400/401/403 | API key salah/kadaluarsa — periksa di Pengaturan, pakai tombol ⚡ Tes |
| Kuota habis (429) | Tunggu sebentar, ganti key, atau pilih provider lain |
| Model tidak ditemukan | Gemini: `gemini-2.5-flash` · OpenRouter: cari di openrouter.ai/models |
| Balasan terpotong | Model kehabisan token — kirim pesan lebih singkat atau ganti model |
| Balasan lama/timeout | Model reasoning (mis. Grok) lebih lambat; aplikasi sudah memakai mode tercepat |
| Chat hilang | Data browser terhapus / mode incognito — gunakan mode normal & unduh cadangan rutin |
| Ingin pindah perangkat | Pengaturan → **Unduh cadangan** di perangkat lama, lalu **Pulihkan cadangan** di perangkat baru |

Selamat berlatih peran! 🎬
