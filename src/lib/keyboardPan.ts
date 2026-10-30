"use client";

import { useEffect } from "react";

/** Kelas di <html> selama iOS menggeser halaman karena keyboard. */
const CLASS = "kb-panned";
/** Di bawah ini dianggap tidak ada geseran (aman untuk address bar Safari). */
const PAN_THRESHOLD = 40;

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
 */
export function useKeyboardPan() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const root = document.documentElement;
    let frame = 0;

    const clear = () => {
      root.classList.remove(CLASS);
      root.style.removeProperty("--vv-top");
      root.style.removeProperty("--vv-height");
    };

    const apply = () => {
      frame = 0;

      // Pinch-zoom juga membuat offsetTop/tinggi berubah — jangan diusik.
      if (Math.abs(vv.scale - 1) > 0.01) {
        clear();
        return;
      }

      if (vv.offsetTop <= PAN_THRESHOLD) {
        clear();
        return;
      }

      root.classList.add(CLASS);
      root.style.setProperty("--vv-top", `${Math.round(vv.offsetTop)}px`);
      root.style.setProperty("--vv-height", `${Math.round(vv.height)}px`);
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    // iOS mengirim `resize` saat keyboard naik dan `scroll` saat menggeser
    // halaman — dua-duanya perlu.
    vv.addEventListener("resize", schedule);
    vv.addEventListener("scroll", schedule);
    schedule();

    return () => {
      vv.removeEventListener("resize", schedule);
      vv.removeEventListener("scroll", schedule);
      if (frame) window.cancelAnimationFrame(frame);
      clear();
    };
  }, []);
}
