/**
 * Tinggi viewport yang benar-benar terlihat, untuk mengunci tinggi shell.
 *
 * Kenapa tidak cukup `100dvh`? Di Android, `dvh` kadang belum ikut menyesuaikan
 * bar navigasi sistem saat aplikasi dibuka kembali (PWA / balik dari aplikasi
 * lain). Akibatnya `html`/`body` (100% dari layout viewport) lebih tinggi
 * daripada shell, dokumen jadi bisa ter-scroll ~setinggi bar navigasi, halaman
 * terlihat "naik ke atas", dan sisa ruang di bawah menampakkan warna body (abu).
 *
 * Karena itu tinggi diukur manual: pakai yang paling kecil antara `innerHeight`
 * dan `visualViewport` (dikali scale supaya pinch-zoom tidak mengecilkan app).
 */
export function measureAppHeight(): number {
  const view = window.visualViewport;
  const visual = view ? Math.round(view.height * view.scale) : 0;
  const inner = Math.round(window.innerHeight || 0);
  const candidates = [inner, visual].filter((value) => value > 0);
  return candidates.length ? Math.min(...candidates) : 0;
}

/** Tulis tinggi viewport ke CSS variable `--app-height` dan luruskan scroll. */
export function applyAppHeight() {
  const height = measureAppHeight();
  if (height > 0) {
    document.documentElement.style.setProperty("--app-height", `${height}px`);
  }
  // Jaga-jaga kalau browser memulihkan posisi scroll lama saat aplikasi dibuka.
  if (window.scrollY !== 0) window.scrollTo(0, 0);
}

/**
 * Versi kecil dari `applyAppHeight()` yang dijalankan di <head>, sebelum paint
 * pertama — supaya tidak ada kedipan tinggi yang salah saat aplikasi dibuka.
 */
export const VIEWPORT_INIT_SCRIPT = `(function(){try{var i=window.innerHeight||0;var v=window.visualViewport?window.visualViewport.height*window.visualViewport.scale:0;var h=Math.min(i>0?i:Infinity,v>0?v:Infinity);if(isFinite(h)&&h>0){document.documentElement.style.setProperty("--app-height",Math.round(h)+"px");}if(window.scrollY){window.scrollTo(0,0);}}catch(e){}})();`;
