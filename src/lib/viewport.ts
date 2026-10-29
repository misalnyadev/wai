/**
 * Tinggi jendela yang dipakai shell aplikasi.
 *
 * Diukur dari `window.innerHeight`, yaitu tinggi jendela penuh — termasuk area
 * yang di Android dipakai bar navigasi sistem pada mode edge-to-edge. Bar
 * navigasi itu sendiri sudah ditangani lewat `env(safe-area-inset-bottom)` di
 * composer, lembar aksi, dan kapsul navigasi, jadi isi aplikasi tidak tertutup.
 *
 * Catatan: sempat dipakai nilai terkecil antara `innerHeight` dan
 * `visualViewport`, tapi di Android `visualViewport` kadang tidak menghitung
 * area bar navigasi — shell jadi lebih pendek dan menyisakan pita abu di bawah.
 */
export function measureAppHeight(): number {
  const inner = Math.round(window.innerHeight || 0);
  if (inner > 0) return inner;
  // Cadangan untuk lingkungan yang tidak punya innerHeight.
  const view = window.visualViewport;
  return view ? Math.round(view.height * view.scale) : 0;
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
export const VIEWPORT_INIT_SCRIPT = `(function(){try{var h=Math.round(window.innerHeight||0);if(!(h>0)&&window.visualViewport){h=Math.round(window.visualViewport.height*window.visualViewport.scale);}if(h>0){document.documentElement.style.setProperty("--app-height",h+"px");}if(window.scrollY){window.scrollTo(0,0);}}catch(e){}})();`;
