"use client";

import { useEffect } from "react";

/** Kelas di <html> selama iOS menggeser halaman karena keyboard. */
const CLASS = "kb-panned";

/**
 * Menetralkan geseran halaman oleh iOS saat keyboard muncul.
 *
 * iOS tidak mengecilkan halaman saat keyboard muncul — dia **menggeser**
 * (pan) seluruh halaman ke atas supaya kolom ketik kelihatan. Karena halaman
 * ini dikunci (`overflow: hidden` di html/body), geseran itu tidak bisa
 * dikembalikan: header ikut naik ke area status bar dan kotak ketik
 * menggantung jauh di atas keyboard.
 *
 * Geseran itu terbaca di `visualViewport.offsetTop` (terukur ≈ 368 px pada
 * iPhone 5,8"). Selama nilainya > 0, aplikasi dipasang tepat di area yang
 * terlihat: turun sebesar geseran, setinggi area yang terlihat. Begitu
 * keyboard ditutup, offsetTop kembali 0 dan semuanya dilepas — jadi tanpa
 * keyboard tidak ada satu pun perubahan.
 *
 * Supaya transisinya mulus, nilai diikuti **setiap frame** (bukan menunggu
 * event), dimulai dari piksel pertama geseran, dan hanya ditulis kalau
 * angkanya benar-benar berubah. Ini mencegah lompatan besar di tengah
 * animasi keyboard (yang terlihat seperti kedipan).
 */
export function useKeyboardPan() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const root = document.documentElement;
    // Di aplikasi ter-install tidak ada address bar yang bisa memicu offsetTop,
    // jadi geseran sekecil apa pun berarti keyboard. Di Safari biasa diberi
    // ambang supaya address bar tidak ikut memicu perubahan.
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    const threshold = standalone ? 1 : 30;

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
      if (top !== lastTop || height !== lastHeight) {
        lastTop = top;
        lastHeight = height;
        root.classList.add(CLASS);
        root.style.setProperty("--vv-top", `${top}px`);
        root.style.setProperty("--vv-height", `${height}px`);
      }

      // Lanjut mengikuti animasi keyboard sampai benar-benar berhenti.
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
