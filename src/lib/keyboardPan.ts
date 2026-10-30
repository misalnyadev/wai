"use client";

import { useEffect } from "react";

/** Kelas di <html> selama iOS menggeser halaman karena keyboard. */
const CLASS = "kb-panned";
/** Jarak minimum yang dianggap "masih ada celah" (px). */
const MIN_GAP = 4;
/** Batas koreksi supaya angka aneh tidak merusak tampilan. */
const MAX_CORRECTION = 140;

/**
 * Menetralkan geseran halaman oleh iOS saat keyboard muncul.
 *
 * iOS tidak mengecilkan halaman saat keyboard muncul — dia **menggeser**
 * (pan) seluruh halaman ke atas supaya kolom ketik kelihatan. Karena halaman
 * ini dikunci (`overflow: hidden`, syarat supaya header tidak "terangkat"),
 * geseran itu tidak bisa dikembalikan sendiri: kotak ketik berhenti jauh di
 * atas keyboard.
 *
 * Dua tahap:
 * 1. **Ikuti geseran** — selama `visualViewport.offsetTop > 0`, aplikasi
 *    digeser balik sebesar itu dan tingginya mengikuti area yang terlihat.
 *    Digambar lewat `transform` (lapisan GPU), jadi tidak memicu layout ulang.
 * 2. **Koreksi sisa celah** — setelah keyboard berhenti bergerak, posisi kotak
 *    ketik diukur sekali terhadap tepi bawah area yang terlihat, lalu selisihnya
 *    (beberapa puluh piksel akibat pembulatan/tinggi yang dilaporkan iOS)
 *    ditambahkan ke tinggi aplikasi. Jadi berapa pun sisa celahnya, hasilnya
 *    kotak ketik menempel — tanpa menebak angka.
 *
 * Tanpa keyboard: offsetTop = 0 → kelas dilepas, tidak ada perubahan apa pun.
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
    /** Koreksi hanya dihitung sekali per sesi keyboard. */
    let corrected = false;

    const clear = () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
      window.clearTimeout(settleTimer);
      settleTimer = 0;
      lastTop = -1;
      lastHeight = -1;
      corrected = false;
      root.classList.remove(CLASS);
      root.style.removeProperty("--vv-top");
      root.style.removeProperty("--vv-height");
      root.style.removeProperty("--kb-gap");
    };

    /**
     * Ukur sisa celah antara bagian bawah kotak ketik dan tepi bawah area yang
     * terlihat, lalu simpan sebagai penambah tinggi aplikasi.
     */
    const correctGap = () => {
      settleTimer = 0;
      if (corrected) return;

      const composer = document.querySelector<HTMLElement>(".composer-bar");
      if (!composer) return;

      // getBoundingClientRect memakai koordinat layout yang sama dengan
      // offsetTop visualViewport, jadi keduanya bisa dibandingkan langsung.
      const visibleBottom = vv.offsetTop + vv.height;
      const gap = visibleBottom - composer.getBoundingClientRect().bottom;
      if (!Number.isFinite(gap) || Math.abs(gap) > 400) return;

      corrected = true;
      // Positif = kotak ketik masih di atas keyboard → aplikasi ditinggikan.
      const correction = Math.round(
        Math.max(-MAX_CORRECTION, Math.min(MAX_CORRECTION, gap))
      );
      root.style.setProperty("--kb-gap", `${Math.abs(correction) < MIN_GAP ? 0 : correction}px`);
    };

    const scheduleCorrection = (delay: number) => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(correctGap, delay);
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
        // Keyboard masih bergerak: hitung ulang koreksi setelah tenang.
        corrected = false;
        root.style.removeProperty("--kb-gap");
        scheduleCorrection(320);
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
