# Tahap 2 — Tata letak (patch untuk `aira`)

Patch: `0001-Tata-letak-bergaya-WaiChat-kapsul-navigasi-anti-zoom.patch`
Basis: `296aa44` (main `aira` setelah PR #2 merged)

## Cara pasang

```bash
git clone https://github.com/misalnyadev/aira.git
cd aira
git config user.name "Nama" && git config user.email "email@contoh"
git am < 0001-Tata-letak-....patch
```

Kalau `main` sudah maju: `git am -3 < berkas.patch`

## Isi

| Bagian | Ringkas |
|---|---|
| Anti-zoom iPhone | semua input/textarea/select 16 px di perangkat sentuh |
| Font | font sistem (San Francisco di iPhone), teks HP dinaikkan satu tingkat |
| Kapsul navigasi | 4 menu mengambang di HP, rail di layar lebar |
| Keyboard | kapsul disembunyikan saat mengetik |
| Setelan | jadi halaman sendiri (bukan modal), di menu |
| Karakter | halaman grid dengan penghitung n/10 |
| Profil | jadi halaman sendiri, bukan modal |
| Provider | **Groq masuk**, xAI/Grok keluar dari daftar |

`SettingsModal.tsx` dan `ProfileModal.tsx` dihapus — diganti `SettingsView` dan
`ProfileView` supaya tidak ada dua versi layar yang sama.

## Diuji sebelum dikirim

- `npx tsc --noEmit` bersih
- `npm run build` sukses
- Dijalankan lewat `next start` lalu dibuka: HTTP 200, judul dan
  `viewport-fit=cover` benar
- Aturan CSS yang benar-benar dikirim ke browser diperiksa isinya:
  `pointer:coarse`, `font-size:16px`, `glass-capsule`, `safe-area-inset`
- Patch diterapkan ke clone bersih -> pohon identik, `tsc` bersih di sana juga

## Belum diuji

**Perilaku di iPhone sungguhan.** Zoom saat mengetik dan posisi kapsul harus
dicoba di HP — tidak bisa diuji dari sandbox.

## Catatan provider

`grok` (xAI) masih dikenali di lapisan AI supaya API key lama tidak langsung
mati, tapi tidak muncul di daftar tambah provider. Ganti ke Groq dari Setelan
kalau sudah punya key baru.
