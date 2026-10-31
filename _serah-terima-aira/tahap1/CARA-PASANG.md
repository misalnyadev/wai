# Tahap 1 — Profil user (patch untuk `aira`)

Patch: `0001-Profil-saya-karakter-tahu-sedang-mengobrol-dengan-si.patch`
Basis: `a5d7cfc` (main `aira` saat patch dibuat)

## Cara pasang

```bash
git clone https://github.com/misalnyadev/aira.git
cd aira
git am < 0001-Profil-saya-karakter-tahu-sedang-mengobrol-dengan-si.patch
```

Kalau predikat `main` sudah maju dan `git am` protes, pakai three-way:

```bash
git am -3 < 0001-....patch
```

Butuh identitas git:

```bash
git config user.name "Nama" && git config user.email "email@contoh"
```

## Diuji sebelum dikirim

- `npx tsc --noEmit` bersih
- `npm run build` sukses; `/api/profile` terdaftar
- 34 kasus uji logika lulus (validasi profil, pemakaian di prompt, urutan
  bagian, profil kosong tidak dikirim)
- Patch diterapkan ke clone bersih -> pohon berkas **identik** (`89bdf8f`)

## Belum diuji

Runtime sungguhan: mengisi profil lalu chat dengan model. Sandbox tidak punya
PostgreSQL dan tidak menjangkau Neon. Jangan klaim sudah jalan sebelum dicoba
di preview.

## Yang berubah

| Berkas | Isi |
|---|---|
| `src/db/schema.ts` | kolom profil di tabel users |
| `src/lib/dbReady.ts` | `ALTER TABLE ... IF NOT EXISTS` untuk database lama |
| `src/lib/userProfile.ts` | tipe + validasi murni |
| `src/app/api/profile/route.ts` | GET/PATCH |
| `src/lib/ai/promptBuilder.ts` | bagian "TENTANG LAWAN BICARA" |
| `src/app/api/chat/route.ts` | mengirim profil saat membalas |
| `src/components/ProfileModal.tsx` | layar Profil Saya |
| `src/components/SettingsModal.tsx` | tombol di bagian Akun |

## Setelah patch ini masuk

Lanjutkan ke fitur berikutnya di `AISHERLY-RENCANA.md` (tahap 1): tema
terang/gelap, aksi per pesan, lalu suara lokal.
