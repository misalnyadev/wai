"use client";

import { useEffect } from "react";

/**
 * Kunci posisi geser halaman di iOS.
 *
 * Kenapa perlu: saat keyboard muncul, iOS mencari elemen yang bisa di-scroll
 * lalu menggesernya supaya kolom yang sedang diketik kelihatan. `.app-shell`
 * dan <html> memang tidak seharusnya bisa di-scroll, tapi `overflow: hidden`
 * hanya melarang pengguna menggeser — lewat kode (dan pemanggilan iOS) elemen
 * itu **tetap bisa** bergeser. Akibatnya seluruh aplikasi bergeser ke atas dan
 * setelah keyboard ditutup pun posisinya tidak kembali: header "kedorong naik"
 * masuk ke area status bar.
 *
 * Hook ini menahan posisi geser di 0 untuk dokumen, <body>, dan `.app-shell`.
 * Tidak mengubah tata letak, tinggi, atau posisi apa pun — hanya mengembalikan
 * geseran yang tidak diminta.
 */
export function useScrollGuard() {
  useEffect(() => {
    let frame = 0;

    const reset = () => {
      frame = 0;

      const scrolling = document.scrollingElement as HTMLElement | null;
      const shell = document.querySelector<HTMLElement>(".app-shell");

      if (scrolling && scrolling.scrollTop !== 0) scrolling.scrollTop = 0;
      if (document.body.scrollTop !== 0) document.body.scrollTop = 0;
      if (shell && shell.scrollTop !== 0) shell.scrollTop = 0;

      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(reset);
    };

    reset();
    // Fase capture: ikut menangkap scroll dari elemen mana pun, termasuk yang
    // tidak "menggelembung" ke atas.
    document.addEventListener("scroll", schedule, true);
    document.addEventListener("focusin", schedule, true);
    document.addEventListener("focusout", schedule, true);
    window.visualViewport?.addEventListener("resize", schedule);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      document.removeEventListener("scroll", schedule, true);
      document.removeEventListener("focusin", schedule, true);
      document.removeEventListener("focusout", schedule, true);
      window.visualViewport?.removeEventListener("resize", schedule);
    };
  }, []);
}
