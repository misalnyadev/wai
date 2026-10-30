"use client";

import { useEffect } from "react";

/**
 * Jarak aman atas (tinggi status bar iPhone) sebagai jaring pengaman.
 *
 * Masalah: di iOS 26 dengan `black-translucent`, `env(safe-area-inset-top)`
 * bisa terbaca **0** walaupun halaman sudah memakai `viewport-fit=cover`.
 * Akibatnya header chat hanya mendapat jarak 10 px dan separuhnya tertutup
 * jam/baterai.
 *
 * CSS sudah memberi lantai lewat `--safe-top` (lihat globals.css), tapi lantai
 * itu bergantung pada media query. Hook ini mengukur `env()` yang SEBENARNYA
 * lewat satu elemen uji — tidak menebak dari user-agent — lalu:
 *
 * - env() terbaca normal (>= 30 px)  -> tidak mengubah apa pun;
 * - env() terbaca 0 / terlalu kecil  -> isi `--safe-top` langsung di <html>.
 *
 * Nilai pengganti hanya dipasang di perangkat iOS, jadi tampilan desktop
 * (termasuk pratinjau di browser komputer) tidak tersentuh.
 */

/** Tinggi status bar iPhone 5,8" (375×812) — perangkat yang jadi acuan. */
const FALLBACK_SAFE_TOP = 44;

/** Di bawah angka ini env() dianggap tidak akurat (iOS 26 melaporkan 0). */
const TRUSTED_MIN = 30;

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return true;
  // iPadOS 13+ memakai user agent Macintosh; bedakan lewat jumlah titik sentuh.
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
}

/** Baca nilai env(safe-area-inset-top) yang benar-benar dipakai browser. */
function readInsetTop(): number {
  const probe = document.createElement("div");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText =
    "position:fixed;top:0;left:0;width:1px;height:env(safe-area-inset-top,0px);" +
    "padding:0;margin:0;border:0;visibility:hidden;pointer-events:none;";
  document.documentElement.appendChild(probe);
  const value = probe.getBoundingClientRect().height;
  probe.remove();
  return value;
}

export function useSafeTop() {
  useEffect(() => {
    const root = document.documentElement;

    const apply = () => {
      if (!isIOS()) return;

      const inset = readInsetTop();
      if (inset >= TRUSTED_MIN) {
        // env() akurat — biarkan CSS (dan env itu sendiri) yang menentukan.
        root.style.removeProperty("--safe-top");
        return;
      }

      root.style.setProperty("--safe-top", `${FALLBACK_SAFE_TOP}px`);
    };

    apply();
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);

    return () => {
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
    };
  }, []);
}
