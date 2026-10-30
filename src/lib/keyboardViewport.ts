"use client";

import { useEffect } from "react";

/**
 * Menyesuaikan aplikasi dengan keyboard iPhone.
 *
 * iOS Safari/PWA tidak pernah mengecilkan *layout viewport* saat keyboard
 * muncul — yang mengecil hanya *visual viewport*, lalu iOS menggeser (pan)
 * halaman agar field yang difokuskan terlihat. Karena halaman kita dikunci
 * (`overflow: hidden`) supaya tidak ada bug "halaman terangkat", geseran itu
 * tidak selalu pas: composer bisa berhenti jauh di atas keyboard.
 *
 * Solusinya: selama keyboard benar-benar terbuka, aplikasi dipasang tepat di
 * area yang terlihat (tinggi + geseran mengikuti `visualViewport`). Saat
 * keyboard tertutup, kelas `kb-open` dilepas dan tata letak kembali memakai
 * CSS biasa (`100dvh`) — jadi tampilan normal tidak diukur dengan JS.
 */
export function useKeyboardViewport() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const root = document.documentElement;
    /** Tinggi halaman saat keyboard tertutup (diperbarui saat rotasi). */
    let fullHeight = vv.height + vv.offsetTop;
    let frame = 0;

    const reset = () => {
      root.classList.remove("kb-open");
      root.style.removeProperty("--kb-height");
      root.style.removeProperty("--kb-top");
    };

    const apply = () => {
      frame = 0;

      // Sedang pinch-zoom: area terlihat mengecil bukan karena keyboard.
      if (Math.abs(vv.scale - 1) > 0.01) {
        reset();
        return;
      }

      const visible = vv.height;
      // Penyusutan area terlihat. Jangan dihitung dari offsetTop: saat iOS
      // menggeser halaman, offsetTop ikut naik sehingga selisihnya bisa 0
      // padahal keyboard sedang terbuka.
      const shrink = fullHeight - visible;

      if (shrink <= 20) {
        // Keyboard tertutup (atau baru ditutup) → simpan tinggi normal.
        fullHeight = visible + vv.offsetTop;
        reset();
        return;
      }

      // < 120px biasanya cuma address bar Safari yang menyusut, bukan keyboard.
      if (shrink < 120) return;

      root.classList.add("kb-open");
      root.style.setProperty("--kb-height", `${Math.round(visible)}px`);
      root.style.setProperty("--kb-top", `${Math.round(vv.offsetTop)}px`);
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    vv.addEventListener("resize", schedule);
    vv.addEventListener("scroll", schedule);
    window.addEventListener("orientationchange", schedule);
    schedule();

    return () => {
      vv.removeEventListener("resize", schedule);
      vv.removeEventListener("scroll", schedule);
      window.removeEventListener("orientationchange", schedule);
      if (frame) window.cancelAnimationFrame(frame);
      reset();
    };
  }, []);
}
