"use client";

import { useEffect } from "react";

/** Kelas di <html> selama iOS menggeser halaman karena keyboard. */
const CLASS = "kb-panned";
/** Jarak minimum yang dianggap "masih ada celah" (px). */
const MIN_GAP = 4;
/** Batas koreksi supaya angka aneh tidak merusak tampilan. */
const MAX_CORRECTION = 140;
/**
 * Jarak aman antara kotak ketik dan tepi bawah area terlihat.
 *
 * iOS punya bar aksesori bawaan di atas keyboard (tombol ‹ › dan ✓) yang
 * muncul beberapa saat setelah keyboard selesai naik dan tidak selalu ikut
 * terhitung di `visualViewport.height`. Tanpa jarak aman, koreksi celah bisa
 * mendorong kotak ketik tepat di bawah bar itu sehingga terlihat hilang.
 */
const SAFE_MARGIN = 12;

/**
 * Menetralkan geseran halaman oleh iOS saat keyboard muncul.
 *
 * iOS tidak mengecilkan halaman saat keyboard muncul — dia **menggeser**
 * (pan) seluruh halaman ke atas supaya kolom ketik kelihatan. Karena halaman
 * ini dikunci (`overflow: hidden`, syarat supaya header tidak "terangkat"),
 * geseran itu tidak bisa dikembalikan sendiri: kotak ketik berhenti jauh di
 * atas keyboard.
 *
 * Tiga tahap:
 * 1. **Ikuti geseran** — selama `visualViewport.offsetTop > 0`, aplikasi
 *    digeser balik sebesar itu dan tingginya mengikuti area yang terlihat.
 *    Digambar lewat `transform` (lapisan GPU), jadi tidak memicu layout ulang.
 * 2. **Koreksi sisa celah** — posisi kotak ketik diukur berulang (320/700/1100
 *    ms setelah keyboard tenang) sampai jaraknya dari tepi bawah area terlihat
 *    sama dengan `SAFE_MARGIN`. Pengukuran berulang penting karena bar
 *    aksesori keyboard baru muncul belakangan.
 * 3. **Kembalikan** — saat keyboard ditutup semua variabel & kelas dilepas.
 *
 * Tanpa keyboard: offsetTop = 0 → tidak ada satu pun perubahan.
 */
export function useKeyboardPan() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const root = document.documentElement;
    // Di aplikasi ter-install tidak ada address bar, jadi geseran sekecil apa
    // pun berarti keyboard. Di Safari biasa diberi ambang kecil.
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    const threshold = standalone ? 1 : 24;

    let frame = 0;
    let lastTop = -1;
    let lastHeight = -1;
    let settleTimer = 0;
    let watchTimer = 0;
    /** Koreksi yang sedang dipakai (px). Dipakai agar pengukuran tidak dobel. */
    let applied = 0;

    const clamp = (value: number) =>
      Math.max(-MAX_CORRECTION, Math.min(MAX_CORRECTION, value));

    const clear = () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
      window.clearTimeout(settleTimer);
      window.clearInterval(watchTimer);
      settleTimer = 0;
      watchTimer = 0;
      lastTop = -1;
      lastHeight = -1;
      applied = 0;
      root.classList.remove(CLASS);
      root.style.removeProperty("--vv-top");
      root.style.removeProperty("--vv-height");
      root.style.removeProperty("--kb-gap");
    };

    /**
     * Selaraskan kotak ketik dengan tepi bawah area terlihat.
     *
     * PENTING soal satuan: `getBoundingClientRect()` sudah memakai koordinat
     * area yang TERLIHAT (geseran iOS sudah ikut dihitung di dalamnya). Jadi
     * tepi bawah area terlihat adalah `vv.height`, BUKAN `vv.offsetTop +
     * vv.height`. Dulu rumus kedua yang dipakai, sehingga jarak yang terukur
     * kelebihan sebesar offsetTop (≈368 px), koreksi mentok di batas 140 px,
     * dan kotak ketik justru terdorong ke bawah keyboard — kotaknya "hilang".
     *
     * Supaya aman terhadap perbedaan perilaku WebKit, dua kemungkinan satuan
     * dihitung lalu dipilih yang paling kecil selisihnya. Kalau dua-duanya
     * besar (> 200 px), pengukuran dianggap tidak sah dan koreksi dilewati —
     * lebih baik tidak mengoreksi daripada mendorong kotak keluar layar.
     */
    const measureGap = () => {
      if (!root.classList.contains(CLASS)) return;
      if (!document.querySelector(".composer-bar")) return;

      const bottom = document.querySelector<HTMLElement>(".composer-bar")!
        .getBoundingClientRect().bottom;
      if (!Number.isFinite(bottom)) return;

      const candidates = [vv.height - bottom, vv.offsetTop + vv.height - bottom];
      const gap = candidates.reduce((best, value) =>
        Math.abs(value) < Math.abs(best) ? value : best
      );
      if (Math.abs(gap) > 200) return;

      // Selisih ditambahkan bertahap (maks 60 px sekali ukur) supaya koreksi
      // mengumpul ke SAFE_MARGIN, tidak melompat melewatinya.
      const delta = gap - SAFE_MARGIN;
      const step = Math.max(-60, Math.min(60, delta));
      const next = Math.round(clamp(applied + step));
      if (next === applied) return;

      applied = next;
      root.style.setProperty("--kb-gap", `${Math.abs(next) < MIN_GAP ? 0 : next}px`);

      // Jaring pengaman: kalau setelah dikoreksi kotak ketik masih berada di
      // bawah area terlihat, batalkan koreksi. Lebih baik kembali ke tampilan
      // apa adanya daripada kotak ketik hilang di balik keyboard.
      const after = document.querySelector<HTMLElement>(".composer-bar");
      if (!after) return;
      const overflow = after.getBoundingClientRect().bottom - vv.height;
      if (overflow > 8) {
        applied = 0;
        root.style.removeProperty("--kb-gap");
      }
    };

    const scheduleMeasures = () => {
      window.clearTimeout(settleTimer);
      window.clearInterval(watchTimer);
      // Bar aksesori keyboard (‹ › ✓) bisa muncul belakangan dan mengubah
      // tinggi area terlihat. Ukur beberapa kali: sekali di awal, lalu pantau
      // selama ~2 detik supaya tidak ada masa "kotak ketik tertutup".
      [320, 700, 1100].forEach((delay) => {
        window.setTimeout(() => {
          if (root.classList.contains(CLASS)) measureGap();
        }, delay);
      });
      let ticks = 0;
      watchTimer = window.setInterval(() => {
        if (!root.classList.contains(CLASS)) {
          window.clearInterval(watchTimer);
          return;
        }
        measureGap();
        if (++ticks >= 8) window.clearInterval(watchTimer);
      }, 250);
    };

    const tick = () => {
      frame = 0;

      // Pinch-zoom juga mengubah offsetTop/tinggi — jangan diusik.
      if (Math.abs(vv.scale - 1) > 0.01) {
        clear();
        return;
      }

      const top = Math.round(vv.offsetTop);
      if (top <= threshold) {
        clear();
        return;
      }

      const height = Math.round(vv.height);
      // Hanya tulis kalau angkanya berubah — mencegah kerja sia-sia tiap frame.
      if (top !== lastTop || height !== lastHeight) {
        lastTop = top;
        lastHeight = height;
        root.classList.add(CLASS);
        root.style.setProperty("--vv-top", `${top}px`);
        root.style.setProperty("--vv-height", `${height}px`);
        scheduleMeasures();
      }

      // Ikuti terus selama keyboard masih bergerak.
      frame = window.requestAnimationFrame(tick);
    };

    const start = () => {
      if (!frame) frame = window.requestAnimationFrame(tick);
    };

    // `resize` saat keyboard naik, `scroll` saat iOS menggeser halaman.
    vv.addEventListener("resize", start);
    vv.addEventListener("scroll", start);
    start();

    return () => {
      vv.removeEventListener("resize", start);
      vv.removeEventListener("scroll", start);
      clear();
    };
  }, []);
}
