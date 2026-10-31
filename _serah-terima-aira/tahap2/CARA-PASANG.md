# Tahap 2 — Tata letak (patch untuk `aira`)

Patch: `0001-Tata-letak-kapsul-5-menu-halaman-penuh.patch`
Basis: **`a85bd1c`** (main `aira` setelah PR #2 dan PR #3 / TTS merged)

## Cara pasang

```bash
git clone https://github.com/misalnyadev/aira.git
cd aira
git checkout main && git pull
git checkout -b arena/tata-letak
git config user.name "Nama" && git config user.email "email@contoh"
git am < 0001-Tata-letak-kapsul-5-menu-halaman-penuh.patch
git push origin arena/tata-letak
```

Kalau `main` sudah maju lagi: `git am -3 < berkas.patch`. Kalau konflik, jangan
dipaksa — kabari, nanti dibuatkan ulang di atas `main` terbaru.

## Isi

| Bagian | Ringkas |
|---|---|
| Anti-zoom iPhone | semua input/textarea/select 16 px di perangkat sentuh |
| Font | font sistem (San Francisco di iPhone), teks HP dinaikkan satu tingkat |
| Kapsul navigasi | **5 menu** (Chat · Karakter · Suara · Profil · Setelan) mengambang di HP, rail di layar lebar |
| Keyboard | kapsul disembunyikan saat mengetik, aman untuk safe-area |
| Suara | `VoiceModal` dipakai ulang sebagai **halaman penuh** (`asPage`), bukan modal |
| Setelan | jadi halaman sendiri (`SettingsView`), API key + akun di satu tempat |
| Karakter | halaman grid dengan penghitung n/10 |
| Profil | jadi halaman sendiri (`ProfileView`), bukan modal |
| Provider | **Groq masuk**, xAI/Grok keluar dari daftar pilihan |

`SettingsModal.tsx` dan `ProfileModal.tsx` dihapus — diganti `SettingsView` dan
`ProfileView` supaya tidak ada dua versi layar yang sama.

## TTS tetap utuh

PR #3 (suara lokal) sudah masuk `main`, jadi patch ini **menyambung**, bukan
menimpa. Yang dipertahankan: `useVoiceSettings`, `loadVoiceSettings`,
`useSpeechUnlock`, `useSpeechSupported`, `useIsSpeaking`, `speak(..., {append})`,
`stopSpeaking`, dan `onOpenVoice` di `ChatWindow` — tombolnya sekarang membuka
halaman Suara, bukan modal.

## Diuji sebelum dikirim

- `npx tsc --noEmit` bersih
- `npm run build` sukses (dengan `DATABASE_URL` contoh)
- Dijalankan lewat `next start` lalu di-curl: HTTP 200, judul
  `Aisherly — Chat Karakter Pribadi`, `viewport-fit=cover`
- Aturan CSS yang benar-benar dikirim ke browser diperiksa isinya:
  `pointer:coarse`, `font-size:16px`, `glass-capsule`, `safe-area-inset`,
  `tabbar-space`, `kb-open`
- Patch diterapkan ke clone bersih dari `a85bd1c` → `git am` bersih, pohon
  identik dengan aslinya (`3471d60`)

## Belum diuji

**Perilaku di iPhone sungguhan.** Zoom saat mengetik dan posisi kapsul harus
dicoba di HP — tidak bisa diuji dari sandbox.

## Catatan provider

`grok` (xAI) masih dikenali di lapisan AI supaya API key lama tidak langsung
mati, tapi tidak muncul di daftar tambah provider. Groq memakai
`https://api.groq.com/openai/v1` dengan model `llama-3.3-70b-versatile`.
