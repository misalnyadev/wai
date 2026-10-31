# Aisherly seperti WaiChat — rencana

Disusun 31 Okt 2026, setelah kode Aisherly (login, 10 karakter, bible peran,
kode undangan, penjaga peran) masuk `main` di `misalnyadev/aira`.

---

## 1. Soal "Neon 50 karakter"

Neon tidak membatasi **jumlah karakter**. Yang dibatasi kuotaannya:

| | Neon Free |
|---|---|
| Penyimpanan | **0,5 GB per project** (500 MB) |
| Compute | 100 CU-hours/bulan |
| Branch | 10 |

Angka pembatasnya adalah **ukuran**, bukan jumlah baris. Jadi 10 karakter itu
keputusan desain, bukan paksaan Neon — dan kebetulan memang pas, karena dengan
rencana 10 MB per karakter, 10 karakter = 100 MB, sudah 20% kuota.

Tetap pakai 10. Angkanya ada di satu tempat (`src/lib/limits.ts`), gampang
diubah kalau nanti pindah ke storage berbayar.

---

## 2. Kondisi sekarang

| | WaiChat (`wai`) | Aisherly (`aira`) |
|---|---|---|
| Data | di HP (IndexedDB) | di server (Neon), per akun |
| Akun | tidak ada | email + kata sandi |
| Karakter | tak terbatas | maksimal 10 |
| Bible peran | tidak ada | **ada** |
| Suara/video | lengkap | belum ada |
| Tampilan | lengkap (tema, latar, nav) | polos |

**Penting:** `wai` tidak bisa disalin mentah-mentah. Semua fiturnya disimpan di
perangkat; di Aisherly data harus ikut akun dan tersimpan di server. Tiap fitur
perlu disesuaikan, bukan di-copy-paste.

---

## 3. Daftar fitur WaiChat → status di Aisherly

| Fitur WaiChat | Status | Catatan |
|---|---|---|
| Karakter buatan sendiri | ✅ ada | + bible peran (lebih bagus) |
| Kirim foto | ✅ ada | |
| Kirim teks ala WhatsApp (bubble beruntun) | ✅ ada | |
| **Profil user** (nama, panggilan, usia, cerita) | ❌ | kecil, dampaknya besar |
| **Multi API key + auto-fallback 429** | ⚠️ separuh | sudah multi-provider, belum rotasi key |
| **Tema terang/gelap/ikut sistem** | ❌ | murni tampilan |
| **Navigasi 5 menu** (Chat·Karakter·Suara·Profil·Setelan) | ❌ | butuh tema dulu |
| **Latar chat custom** + latar animasi + gelembung tembus pandang | ❌ | murni tampilan |
| **Suara lokal (TTS)** — baca balasan, preset, kecepatan | ❌ | tanpa API key, tanpa server |
| **Aksi per pesan** — salin, bacakan, ulangi, hapus | ❌ | |
| **Media karakter**: video saat chat, video call, suara telepon | ❌ | **ini "2 video + 1 audio"** |
| **Panggilan suara / video call** | ❌ | butuh media di atas |
| Cadangan & pemulihan JSON | — | tidak perlu, data sudah di server |

---

## 4. Tembok yang harus dilewati: media 10 MB

Ini bagian tersulit, dan sudah saya hitung.

### 4.1 Tidak bisa lewat `/api/upload` sekarang

Vercel membatasi **body request fungsi ke 4,5 MB, tidak bisa dinaikkan** —
berlaku di Hobby maupun Pro, dan tidak bisa diubah lewat `vercel.json`.
Video 10 MB akan ditolak dengan `413 FUNCTION_PAYLOAD_TOO_LARGE` sebelum kode
kita sempat jalan.

Sekarang `/api/upload` juga hanya menerima gambar, maksimal 6 MB.

### 4.2 Jangan simpan video di Neon

| | |
|---|---|
| 1 karakter | 10 MB |
| 10 karakter | 100 MB |
| Dalam base64 (+33%) | ~133 MB → 27% kuota 500 MB |

Selain makan kuota, video di kolom database: tidak bisa di-*seek* (harus
diunduh utuh untuk memutar), memperlambat semua query, dan tidak punya cache
CDN.

### 4.3 Jalan keluarnya: object storage

Unggahan **langsung dari HP ke storage**, tidak lewat Vercel — jadi tembok
4,5 MB tidak berlaku. Database hanya menyimpan tautannya.

| Pilihan | Gratis | Cocok? |
|---|---|---|
| **Supabase Storage** | 1 GB | ✅ cukup untuk 10 karakter × 10 MB |
| **Cloudflare R2** | 10 GB | ✅ paling lega, tanpa biaya transfer |
| Vercel Blob | 500 MB | ⚠️ paling mudah disambung, kuota paling ketat |

Yang perlu disiapkan:

1. Kolom baru di tabel karakter: `chatVideoUrl`, `callVideoUrl`, `callAudioUrl`
2. Tabel `character_media` (atau kolom di atas) menyimpan **tautan**, bukan isinya
3. Endpoint untuk membuat *presigned URL* (unggah langsung ke storage)
4. Batas ukuran di sisi klien: video ≤ 24 MB (sama seperti `wai`), audio ≤ 5 MB

---

## 5. Urutan pengerjaan

Satu PR kecil per langkah, semuanya bisa dibalik.

### Tahap 1 — yang tidak butuh server baru

| # | Fitur | Kenapa duluan |
|---|---|---|
| 1 | **Profil user** | Sekali isi, semua karakter langsung manggil kamu dengan benar |
| 2 | **Tema terang/gelap** | Murni tampilan, cepat terasa |
| 3 | **Aksi per pesan** (salin, ulangi, hapus) | Mandiri, tidak menyentuh data |
| 4 | **Suara lokal (TTS)** | Tanpa API key, tanpa biaya, langsung bikin hidup |

Keempatnya tidak perlu storage baru dan tidak menyentuh skema database
(kecuali profil user — satu kolom).

### Tahap 2 — tampilan

| # | Fitur |
|---|---|
| 5 | Navigasi 5 menu (butuh tema dari tahap 1) |
| 6 | Latar chat custom + latar animasi + gelembung tembus pandang |
| 7 | Penanda 📖 dan penghitung 10 karakter dibuat lebih jelas |

### Tahap 3 — media (paling berat)

| # | Fitur |
|---|---|
| 8 | Sambungkan object storage + endpoint presigned URL |
| 9 | Unggah 1 audio (suara telepon) — paling ringan, uji dulu di sini |
| 10 | Video saat chat (panel 16:9) |
| 11 | Video video call + zoom 100–200% |
| 12 | Panggilan suara & video call (butuh 9–11) |

**Saran:** jangan mulai dari tahap 3. Media adalah fitur paling mahal dan paling
gampang bikin frustrasi kalau storage belum siap. Tahap 1 memberi hasil terasa
dalam hitungan hari.

---

## 6. Yang tidak bisa dibawa apa adanya

| Dari `wai` | Kenapa harus diubah |
|---|---|
| Penyimpanan IndexedDB | Aisherly lintas perangkat — data harus di server |
| "Tanpa database" | Aisherly memang pakai Neon |
| Tak ada akun | Aisherly per akun, tiap data punya `userId` |
| Blob video lokal | harus object storage (lihat §4) |
| Cadangan JSON | tidak perlu, sudah di server |

---

## 7. Catatan kerja

- Bahasa Indonesia santai-profesional, **tanpa prettier**.
- Satu perubahan kecil per PR, selalu bisa dibalik.
- Jangan sentuh `globals.css` / `layout.tsx` tanpa alasan terukur.
- Target perangkat: **iPhone** — cek 375×812.
- Suara sebaiknya lokal (gratis, tidak dikirim ke mana pun). Foto boleh di server.
- Kalau AK Talent mengekspor bible dengan format terstruktur lain, **minta
  contoh isinya dulu** sebelum menambah pembaca.
- Lint menyisakan 1 error lama di `ChatApp.tsx` (`set-state-in-effect`) yang
  sudah ada sebelum perubahan ini — jangan diakali tanpa izin.
