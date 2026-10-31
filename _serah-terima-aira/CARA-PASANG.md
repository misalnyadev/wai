# Patch Aisherly untuk `aira`

Basis: `a5d7cfc` (main `aira`). Terapkan **berurutan**.

| Folder | Isi | Bergantung pada |
|---|---|---|
| `tahap1a/` | Profil saya | — |
| `tahap1b/` | Aksi per pesan | tahap1a |

## Cara pasang

```bash
git clone https://github.com/misalnyadev/aira.git
cd aira
git config user.name "Nama" && git config user.email "email@contoh"

git am ../tahap1a/0001-*.patch
git am ../tahap1b/0002-*.patch
```

Kalau `main` sudah maju: `git am -3 < berkas.patch` (three-way merge).

## Peringatan

`tahap1a` dan `tahap1b` saling terkait. `tahap1b` mengubah `ChatApp.tsx`,
`ChatWindow.tsx`, dan `README.md` yang juga disentuh `tahap1a`. Menerapkan
`tahap1b` tanpa `tahap1a` akan gagal.

## Diuji sebelum dikirim

- `npx tsc --noEmit` bersih
- `npm run build` sukses; semua route baru terdaftar
- 34 kasus uji profil + 24 kasus uji aturan pesan lulus
- Kedua patch diterapkan berurutan ke clone bersih -> pohon berkas identik
- `npm run lint`: hanya 1 error lama di `ChatApp.tsx` (`set-state-in-effect`)

## Belum diuji

Runtime sungguhan. Sandbox tidak punya PostgreSQL dan tidak menjangkau Neon.
Jangan klaim sudah jalan sebelum dicoba di preview.

## Isi tiap patch

### tahap1a — Profil saya
Kolom profil di tabel users, `GET/PATCH /api/profile`, bagian "TENTANG LAWAN
BICARA" di prompt, layar Profil Saya di Setelan.

### tahap1b — Aksi per pesan
Tekan lama / klik kanan -> Salin teks, Ulangi balasan, Hapus pesan.
Route baru: `DELETE /api/messages/[id]`, `POST /api/characters/[id]/regenerate`.
Mesin balasan dipindah ke `src/lib/chatEngine.ts` supaya route chat dan route
regenerate memakai penjaga peran yang sama.
