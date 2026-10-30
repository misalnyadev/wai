import type { CSSProperties } from "react";
import type { BubbleStyle } from "@/types/chat";

/** Sisi gelembung: `in` = pesan karakter, `out` = pesan kamu. */
export type BubbleRole = "in" | "out";

/** Gelembung bawaan saat karakter belum punya pengaturan sendiri. */
export const DEFAULT_BUBBLE_STYLE: BubbleStyle = {
  glass: false,
  opacity: 70,
  textColorIn: null,
  bgColorIn: null,
  textColorOut: null,
  bgColorOut: null,
};

/** Warna latar & teks milik satu sisi gelembung. */
export function bubbleSide(style: BubbleStyle, role: BubbleRole) {
  return role === "in"
    ? { text: style.textColorIn ?? null, bg: style.bgColorIn ?? null }
    : { text: style.textColorOut ?? null, bg: style.bgColorOut ?? null };
}

/** #rrggbb → rgba() dengan kepekatan tertentu (0–100). */
export function withAlpha(hex: string, percent: number): string {
  const m = /^#?([\da-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const alpha = Math.min(1, Math.max(0, percent / 100));
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/**
 * Latar gelembung untuk satu sisi. Urutan prioritas: warna pilihan pengguna →
 * tembus pandang di atas warna bawaan tema → warna bawaan tema.
 */
export function bubblePaint(style: BubbleStyle, role: BubbleRole): CSSProperties | undefined {
  const { bg } = bubbleSide(style, role);
  if (bg) {
    return { backgroundColor: style.glass ? withAlpha(bg, style.opacity) : bg };
  }
  if (style.glass) {
    return {
      backgroundColor: `color-mix(in oklab, var(--bubble-${role}) ${style.opacity}%, transparent)`,
    };
  }
  return undefined;
}

/** Warna teks gelembung untuk satu sisi; jam & centang ikut menyesuaikan. */
export function bubbleInk(style: BubbleStyle, role: BubbleRole): CSSProperties | undefined {
  const { text } = bubbleSide(style, role);
  return text ? { color: text } : undefined;
}

/** Tingkat kecerahan #rrggbb (0 = hitam, 1 = putih). */
export function colorLuminance(hex: string): number {
  const m = /^#?([\da-f]{6})$/i.exec(hex.trim());
  if (!m) return 0.5;
  const n = parseInt(m[1], 16);
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** Warna teks yang paling kontras di atas latar tertentu. */
export function readableInk(bgHex: string): string {
  return colorLuminance(bgHex) > 0.5 ? "#101114" : "#ffffff";
}

/** Latar yang paling aman untuk sebuah warna teks. */
export function readableBg(textHex: string): string {
  return colorLuminance(textHex) > 0.5 ? "#0f172a" : "#ffffff";
}
