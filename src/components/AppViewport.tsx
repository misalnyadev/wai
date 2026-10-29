"use client";

import { useEffect } from "react";
import { applyAppHeight } from "@/lib/viewport";

/**
 * Menjaga tinggi shell tetap sama dengan viewport yang terlihat.
 *
 * Diukur ulang saat aplikasi dibuka kembali (`visibilitychange`, `pageshow`,
 * `focus`) karena Android sering masih menyimpan tinggi lama sampai halaman
 * digeser — itulah yang dulu bikin halaman terlihat naik dan ada pita abu
 * setinggi bar navigasi di bawah.
 */
export function AppViewport() {
  useEffect(() => {
    let frame = 0;
    let timers: number[] = [];

    const run = () => applyAppHeight();

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(run);
      timers.forEach((id) => window.clearTimeout(id));
      // Bar navigasi Android kadang baru "tenang" beberapa saat setelah app
      // dibuka, jadi ukur ulang beberapa kali dengan jeda pendek.
      timers = [120, 320, 700].map((delay) => window.setTimeout(run, delay));
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") schedule();
    };

    run();

    const view = window.visualViewport;
    view?.addEventListener("resize", schedule);
    view?.addEventListener("scroll", schedule);
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    window.addEventListener("pageshow", schedule);
    window.addEventListener("focus", schedule);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(frame);
      timers.forEach((id) => window.clearTimeout(id));
      view?.removeEventListener("resize", schedule);
      view?.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      window.removeEventListener("pageshow", schedule);
      window.removeEventListener("focus", schedule);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
