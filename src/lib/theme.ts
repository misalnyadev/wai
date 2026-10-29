export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "persona-theme";

/**
 * Warna area status bar iOS = warna header aplikasi (lihat --header-bg di globals.css).
 * Disimpan di sini karena <meta name="theme-color"> harus diubah lewat JS supaya
 * ikut tema yang dipilih pengguna, bukan hanya preferensi sistem.
 */
export const HEADER_STATUS_COLORS = { light: "#f0f2f5", dark: "#17171a" } as const;

function syncStatusBarColor(resolved: "light" | "dark") {
  if (typeof document === "undefined") return;
  const color = HEADER_STATUS_COLORS[resolved];
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((meta) => meta.setAttribute("content", color));
}

export const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Terang" },
  { value: "dark", label: "Gelap" },
  { value: "system", label: "Sistem" },
];

export function getTheme(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
}

export function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

/**
 * Sumber kebenaran tema untuk React (useSyncExternalStore).
 * Perubahan dari tombol, tab lain, atau preferensi sistem ikut terpantau.
 */
export function subscribeTheme(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);

  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      // Terapkan ulang agar class di <html> ikut berubah.
      applyTheme(getTheme());
      onStoreChange();
    }
  };
  window.addEventListener("storage", onStorage);

  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onScheme = () => {
    if (getTheme() === "system") {
      applyTheme("system");
      onStoreChange();
    }
  };
  mq.addEventListener("change", onScheme);

  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStorage);
    mq.removeEventListener("change", onScheme);
  };
}

export function getThemeModeSnapshot(): ThemeMode {
  return getTheme();
}

export function getIsDarkSnapshot(): boolean {
  return resolveTheme(getTheme()) === "dark";
}

export function resolveTheme(mode: ThemeMode): "light" | "dark" {
  return mode === "system" ? (systemPrefersDark() ? "dark" : "light") : mode;
}

/** Terapkan tema ke <html> tanpa membuat halaman berkedip. */
export function applyTheme(mode: ThemeMode): void {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(mode);
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
  root.dataset.theme = mode;
  syncStatusBarColor(resolved);
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // localStorage bisa diblokir (mode privat) — tema tetap jalan untuk sesi ini
  }
  notify();
}

/** Ikuti perubahan tema sistem selama mode "system" aktif. */
export function watchSystemTheme(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => onChange();
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}

/** Skrip kecil yang dijalankan sebelum paint agar tidak ada kilatan tema terang. */
export const THEME_INIT_SCRIPT = `(function(){try{var key="persona-theme";var saved=localStorage.getItem(key);var mq=window.matchMedia("(prefers-color-scheme: dark)").matches;var dark=saved==="dark"||((!saved||saved==="system")&&mq);var r=document.documentElement;r.classList.toggle("dark",dark);r.style.colorScheme=dark?"dark":"light";r.dataset.theme=saved||"system";var c=dark?"#17171a":"#f0f2f5";var ms=document.querySelectorAll('meta[name="theme-color"]');for(var i=0;i<ms.length;i++){ms[i].setAttribute("content",c);}}catch(e){}})();`;
