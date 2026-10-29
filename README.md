# 💬 WaiChat — Chat Karakter AI Privat

Chat bergaya WhatsApp dengan karakter yang terasa nyata — untuk latihan pendalaman peran film.
Karakter bisa melihat foto yang kamu kirim, mengenali **profilmu**, dan mendukung
**Gemini, Groq, OpenRouter, serta endpoint custom** (Ollama/LM Studio, dll).

🔗 **Versi online:** https://waichat.vercel.app

## ✨ Fitur

- 🎭 **Karakter contoh & karakter buatan sendiri** (foto, kepribadian, pesan pembuka)
- 👤 **Profil user** — nama, panggilan, usia, kesibukan, dan cerita tentangmu dibaca karakter,
  jadi mereka tahu sedang chat dengan siapa dan memanggilmu dengan benar
- 🔑 **Multi API key + auto-fallback** — beberapa key per provider dicoba berurutan; kalau kena
  limit (429) key berikutnya dipakai otomatis, dan bila semua key habis aplikasi bisa pindah ke
  provider lain (bisa dimatikan di Setelan)
- 🎨 **Tema terang / gelap / ikut sistem** — tampilan monokrom netral (abu), tanpa aksen hijau;
  tema gelap abu arang, tombol utama otomatis kontras di kedua tema
- 📱 **Navigasi ala WhatsApp**: rail di desktop, tab bawah di HP (Chat · Karakter · Profil · Setelan)
- 🖼️ **Latar chat custom** — pilih salah satu warna bawaan (punya versi terang & gelap) atau
  unggah gambar sendiri, lengkap dengan pengatur keredupan agar tulisan tetap terbaca
- 📷 Kirim foto (dikompres otomatis di browser)
- 💾 **Cadangan & pemulihan** data (JSON) + hapus semua data perangkat
- 🔒 Tanpa database: semua chat, foto, profil, dan API key tersimpan **di browser perangkat**
  (IndexedDB). Server hanya meneruskan pesan ke provider AI — tidak menyimpan apa pun.

---

## 🧱 Struktur proyek

```
src/
├─ app/
│  ├─ api/chat/route.ts    # proxy ke provider AI + rotasi key & fallback provider
│  ├─ api/test/route.ts    # tes koneksi (ikut mencoba key cadangan)
│  ├─ api/models/route.ts  # daftar model aktif untuk sebuah API key
│  ├─ api/health/route.ts
│  ├─ fonts/               # font Plus Jakarta Sans (self-host, di-preload)
│  ├─ globals.css          # token warna tema (netral terang & gelap, tanpa aksen hijau)
│  ├─ layout.tsx           # metadata, OG image, manifest PWA, skrip anti-FOUC tema
│  └─ page.tsx
├─ components/
│  ├─ ChatApp.tsx          # orkestrasi state, rotasi key, fallback provider
│  ├─ Navigation.tsx       # rail desktop + tab bawah mobile
│  ├─ Sidebar.tsx · ChatWindow.tsx · Composer.tsx
│  ├─ CharactersView.tsx · UserProfileView.tsx · SettingsPanel.tsx
│  └─ CharacterModal.tsx · CharacterProfileModal.tsx · ThemeToggle.tsx
├─ lib/
│  ├─ ai/                  # gemini, openai-compatible, daftar model, promptBuilder, error mapping
│  ├─ chatBackground.ts    # preset warna & gaya latar chat
│  ├─ imageClient.ts       # kompres foto di browser sebelum dikirim
│  ├─ storage.ts           # IndexedDB + profil + setelan + cadangan
│  └─ theme.ts             # mode tema & sinkronisasi preferensi sistem
└─ types/chat.ts
public/
├─ images/char-*.jpg       # avatar karakter contoh
├─ images/logo-wai*.png    # maskot WaiChat
├─ icon.svg, icon-*.png    # ikon aplikasi
├─ og.png                  # gambar pratinjau saat link dibagikan
└─ manifest.webmanifest
```

---

## 🔑 Provider & API key

| Provider | Model default | Key gratis? | Catatan |
|---|---|---|---|
| Google Gemini | `gemini-2.5-flash` | ✅ aistudio.google.com/apikey | Paling gampang, bisa baca gambar |
| Groq | `llama-3.3-70b-versatile` | ✅ console.groq.com/keys | Paling cepat (LPU) |
| OpenRouter | `openai/gpt-4o-mini` | sebagian (`:free`) | Banyak pilihan model |
| Custom | — | — | Endpoint OpenAI-compatible (Ollama/LM Studio) |

**Pilih model otomatis:** tempel API key di Setelan → tombol **Pilih model** akan mengambil daftar
model yang benar-benar aktif untuk key itu (langsung dari provider), diurutkan dari yang terbaru,
dengan model "disarankan" di paling atas. Klik satu model untuk memakainya.

**Cara kerja multi-key:** di Setelan → tambah provider → isi key utama lalu
**+ Key cadangan** sebanyak yang kamu mau. Saat chat, server mencoba key secara berurutan
(maksimal 4 key per pesan). Key yang berhasil otomatis dinaikkan ke posisi utama. Kalau semua key
provider itu gagal dan **Fallback otomatis** aktif, aplikasi lanjut ke provider lain yang tersimpan.

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
  browser = menghapus chat. Gunakan **Setelan → Data & cadangan** untuk mengunduh file
  cadangan `.json` dan memulihkannya di perangkat lain.
- **API key** hanya tersimpan di browser. Saat chat, key diteruskan lewat fungsi server
  aplikasi langsung ke provider pilihanmu — tidak disimpan di server mana pun.
  File cadangan **memuat API key**, jadi simpan di tempat aman.
- **Foto & foto profil** dikecilkan di browser sebelum disimpan/dikirim (hemat kuota & cepat).
- **Profil user** ikut dikirim ke provider AI saat chat (sebagai konteks sistem) supaya karakter
  mengenalmu — tidak dikirim ke mana pun selain provider yang kamu pilih.

## 🛠️ Troubleshooting

| Masalah | Solusi |
|---|---|
| Error 400/401/403 | API key salah/kadaluarsa — periksa di Setelan, pakai tombol ⚡ Tes |
| Semua key limit (429) | Tambah key cadangan, tunggu sebentar, atau aktifkan Fallback otomatis |
| Model tidak ditemukan | Gemini: `gemini-2.5-flash` · Groq: `llama-3.3-70b-versatile` · OpenRouter: cek openrouter.ai/models |
| Balasan terpotong | Model kehabisan token — kirim pesan lebih singkat atau ganti model |
| Chat hilang | Data browser terhapus / mode incognito — gunakan mode normal & unduh cadangan rutin |
| Pindah perangkat | Setelan → **Unduh cadangan** di perangkat lama, lalu **Pulihkan cadangan** di perangkat baru |

Selamat berlatih peran! 🎬
