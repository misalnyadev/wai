# Serah terima: Aisherly (`misalnyadev/aira`)

Semua kode ada di `aisherly-lengkap.patch` (412 KB, 1 commit).
Perubahan sudah diuji: `tsc` bersih, `build` sukses, 55 kasus uji logika lulus.

## Kenapa berkasnya di sini

Token GitHub sesi ini hanya diberi akses ke repo `wai`, sehingga push ke
`misalnyadev/aira` ditolak. Berkas ini dititipkan di branch `wai` supaya bisa
diunduh, lalu dihapus setelah dipakai.

## Cara menerapkan

```bash
git clone https://github.com/misalnyadev/aira.git
cd aira
git am < aisherly-lengkap.patch
```

Sudah diuji: menerapkan patch ke `main` menghasilkan pohon berkas **identik**
(`458486d`), tidak ada yang hilang.

Kalau `git am` protes soal identitas:
`git config user.name "Nama" && git config user.email "email@contoh"`

## Isi

| Bagian | Ringkas |
|---|---|
| Akun & login | users + sessions, scrypt, cookie HttpOnly, data terpisah per akun, data lama jadi milik akun pertama |
| Batas 10 karakter | `src/lib/limits.ts`, dijaga di UI dan API (409) |
| Bible peran | kolom `bible`, impor `.txt`/`.md`/`.json`, batas 24.000, disisipkan sebelum profil |
| Kode undangan | `SIGNUP_CODE`; kosong = pendaftaran ditutup |
| Karakter awal | satu, "Kirana", bible-nya jadi contoh format |
| Penjaga peran | aturan prompt keras + penyaring `src/lib/ai/immersion.ts` |

## Yang wajib dipasang di Vercel

| Variabel | Status |
|---|---|
| `DATABASE_URL` | sudah ada |
| `SIGNUP_CODE` | **belum ada** — tanpa ini pendaftaran tertutup untuk semua |

Isi `SIGNUP_CODE`, lalu **Redeploy**.

## Urutan yang tidak boleh dibalik

1. Pasang `SIGNUP_CODE` -> Redeploy
2. **Daftarkan akun sendiri lebih dulu** (akun pertama mengambil alih 3 karakter lama + API key)
3. Baru bagikan link + kode ke teman

## Belum diuji

Alur runtime daftar -> masuk -> impor bible -> chat dengan model sungguhan.
Sandbox tidak punya PostgreSQL dan tidak menjangkau Neon. Jangan klaim sudah
jalan sebelum dicoba di preview.

## Catatan kerja

- Bahasa Indonesia santai-profesional, tanpa prettier.
- Perubahan kecil, selalu bisa dibalik.
- Repo `wai` dibekukan — jangan diubah lagi.
- Format bible bebas. Kalau AK Talent mengekspor format terstruktur lain,
  minta contoh isinya dulu sebelum menambah pembaca.
- Lint menyisakan 1 error lama di `ChatApp.tsx` (`set-state-in-effect`) yang
  sudah ada sebelum perubahan ini. Jangan "diakali" tanpa izin.
