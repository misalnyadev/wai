"use client";

import { useEffect } from "react";

/** Kelas di <html> selama iOS menggeser halaman karena keyboard. */
const CLASS = "kb-panned";

/**
 * Menetralkan geseran halaman oleh iOS saat keyboard muncul.
 *
 * iOS tidak mengecilkan halaman saat keyboard muncul — dia **menggeser**
 * (pan) seluruh halaman ke atas supaya kolom ketik kelihatan. Karena halaman
 * ini dikunci (`overflow: hidden`, syarat supaya header tidak "terangkat"),
 * geseran itu tidak bisa dikembalikan sendiri: kotak ketik berhenti jauh di
 * atas keyboard.
 *
 * Geseran itu terbaca di `visualViewport.offsetTop` (terukur ≈ 368 px pada
 * iPhone 5,8"). Selama nilainya > 0, aplikasi digeser balik sebesar itu dan
 * tingginya disesuaikan dengan area yang terlihat — hasilnya aplikasi terlihat
 * diam di tempatnya, dan kotak ketik menempel di atas keyboard.
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

    const clear = () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
      lastTop = -1;
      lastHeight = -1;
      root.classList.remove(CLASS);
      root.style.removeProperty("--vv-top");
      root.style.removeProperty("--vv-height");
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
