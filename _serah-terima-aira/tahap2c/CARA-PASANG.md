# Tahap 2c — Latar chat + tepi atas penuh (patch untuk `aira`)

Patch: `0001-Latar-chat-akun-dan-tepi-atas-penuh.patch`
Basis: **`366753a`** (main `aira` setelah PR #5 / tahap 2a merged)

Folder `tahap2/` yang lama **sudah dihapus** — isinya (5 menu, tema, anti-zoom)
sudah masuk `main` lewat PR #5, jadi patch itu tidak dipakai lagi.

## Cara pasang

```bash
git clone https://github.com/misalnyadev/aira.git
cd aira
git checkout main && git pull
git rev-parse --short HEAD        # harus 366753a
git checkout -b arena/latar-chat
git config user.name "Nama" && git config user.email "email@contoh"
git am < 0001-Latar-chat-akun-dan-tepi-atas-penuh.patch
npm run build
git push origin arena/latar-chat
```

Kalau `main` sudah maju: `git am -3 < berkas.patch`. Kalau tetap konflik,
jangan dipaksa — kabari, nanti dibuatkan ulang di atas `main` terbaru.

## Isi

| Bagian | Ringkas |
|---|---|
| Latar chat | 1 bawaan + 6 warna + gambar sendiri (dengan penggeser redup) + 5 animasi |
| Penyimpanan | kolom baru `users.chat_background` (JSON pendek), per akun |
| Endpoint | `/api/appearance` — GET / PATCH / DELETE |
| Tempat mengatur | Setelan → Tampilan → **Latar chat** |
| Header | kelas `.top-bar`: kaca buram, latar chat tetap terlihat sampai tepi atas |
| Tepi atas | `html` & `body` berwarna sama dengan header; tidak ada pita warna lain di belakang status bar |
| `theme-color` | mengikuti tema **pilihan pengguna**, bukan tema sistem |
| `safeTop` | kalau `env(safe-area-inset-top)` sudah wajar, angka tabel tidak dipakai lagi |

### Kenapa `theme-color` ikut tema pilihan

Meta `theme-color` bawaan hanya punya dua nilai dengan media query
`prefers-color-scheme` — itu tema **sistem**. Kalau orang memilih tema gelap di
HP bermode terang, bilah atas Safari tetap terang sementara aplikasinya gelap.
Itulah yang membuat bagian atas terlihat seperti terpotong. Sekarang nilainya
disamakan dengan tema yang benar-benar dipakai, termasuk saat diganti manual.

### Tentang `black-translucent`

`apple-mobile-web-app-status-bar-style` tetap `black-translucent`: konten boleh
masuk ke area status bar, jadi aplikasi terasa penuh sampai tepi atas. Imbasnya
teks status bar berwarna putih — karena itu bilah atas diberi kaca gelap/terang
mengikuti tema, bukan dibiarkan putih polos.

## Diuji sebelum dikirim

- `npx tsc --noEmit` bersih
- `npm run build` sukses (dengan `DATABASE_URL` contoh), rute `/api/appearance` terdaftar
- `npm run lint`: **1 error lama** `react-hooks/set-state-in-effect` di `ChatApp.tsx`
  (sudah ada sebelum perubahan ini) + 4 peringatan `<img>` lama. Tidak ada tambahan baru.
- `next start` lalu curl: HTTP 200, `theme-color` `#fafafa`/`#000000`,
  `viewport-fit=cover`; CSS yang terkirim memuat `.top-bar`, `chat-anim-bokeh`,
  `anim-aurora-a`, `backdrop-filter`, `color-scheme`
- Uji logika `normalizeChatBackground`: id tak dikenal → `default`, URL yang
  menyisipkan CSS → ditolak, JSON rusak di database → `default`
- Patch diterapkan ke clone bersih dari `366753a` → `git am` bersih, pohon identik
  (`f0b71dd`)

## Belum diuji

- **Tampilan di iPhone sungguhan.** Latar animasi, posisi kaca di bawah status
  bar, dan warna bilah Safari harus dilihat langsung di HP.
- **Runtime dengan database Neon.** Sandbox tidak punya PostgreSQL, jadi
  `users.chat_background` baru diuji sebagai DDL, belum sebagai kolom hidup.

## Catatan data

Kolom ditambahkan otomatis oleh `ensureDb()` (`ADD COLUMN IF NOT EXISTS`), jadi
tidak perlu migrasi manual. Nilai awalnya `{"kind":"default"}` — akun lama
langsung memakai pola titik bawaan, tidak ada yang berubah sampai pengguna
memilih latar sendiri.
