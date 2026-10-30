"use client";

import { useEffect, type RefObject } from "react";

/** Jarak aman antara kolom yang diketik dan tepi atas keyboard. */
const EDGE = 20;

/**
 * Menjaga kolom isian tetap terlihat saat keyboard iPhone muncul.
 *
 * Halaman Setelan punya kotak scroll sendiri (`overflow-y-auto`). Saat
 * keyboard naik, iOS hanya menggeser jendela utama — bukan kotak scroll itu —
 * sehingga kolom yang sedang diisi tertinggal di belakang keyboard.
 *
 * Perbaikannya murni **menggeser scroll** kotak tersebut (tidak mengubah
 * tinggi, posisi, atau tata letak apa pun). Dipanggil setelah animasi keyboard
 * selesai supaya tidak berebut dengan perilaku bawaan Safari — itulah yang
 * membuat halaman terasa meloncat.
 */
export function useKeepFieldVisible(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!active || !container) return;

    let timer = 0;

    /** Geser kotak scroll seperlunya sampai kolom aktif terlihat penuh. */
    function reveal() {
      const el = document.activeElement;
      if (!(el instanceof HTMLElement) || !container) return;
      if (!container.contains(el)) return;
      if (!el.matches("input, textarea, select")) return;

      const vv = window.visualViewport;
      const visibleTop = vv ? vv.offsetTop : 0;
      const visibleBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;

      const rect = el.getBoundingClientRect();
      const ownRect = container.getBoundingClientRect();
      // Ruang yang benar-benar terlihat di dalam kotak scroll.
      const top = Math.max(ownRect.top, visibleTop) + EDGE;
      const bottom = Math.min(ownRect.bottom, visibleBottom) - EDGE;

      if (rect.bottom > bottom) {
        container.scrollTop += rect.bottom - bottom;
      } else if (rect.top < top) {
        container.scrollTop -= top - rect.top;
      }
    }

    function schedule(delay: number) {
      window.clearTimeout(timer);
      timer = window.setTimeout(reveal, delay);
    }

    // focusin muncul sebelum keyboard naik; `resize` visualViewport menandai
    // keyboard sedang bergerak. Dua jeda ini mengikuti akhir animasinya.
    function onFocusIn(event: FocusEvent) {
      const el = event.target;
      if (!(el instanceof HTMLElement)) return;
      if (!el.matches("input, textarea, select")) return;
      schedule(320);
      schedule(560);
    }

    function onViewportResize() {
      const el = document.activeElement;
      if (el instanceof HTMLElement && el.matches("input, textarea, select")) schedule(260);
    }

    container.addEventListener("focusin", onFocusIn);
    window.visualViewport?.addEventListener("resize", onViewportResize);

    return () => {
      container.removeEventListener("focusin", onFocusIn);
      window.visualViewport?.removeEventListener("resize", onViewportResize);
      window.clearTimeout(timer);
    };
  }, [containerRef, active]);
}
