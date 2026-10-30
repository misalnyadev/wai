import type { CSSProperties } from "react";
import type { BubbleStyle } from "@/types/chat";

/** Gelembung bawaan saat karakter belum punya pengaturan sendiri. */
export const DEFAULT_BUBBLE_STYLE: BubbleStyle = {
  glass: false,
  opacity: 70,
  textColor: null,
  bgColor: null,
};

/** #rrggbb → rgba() dengan kepekatan tertentu (0–100). */
export function withAlpha(hex: string, percent: number): string {
  const m = /^#?([\da-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const alpha = Math.min(1, Math.max(0, percent / 100));
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/**
 * Latar gelembung. Urutan prioritas: warna pilihan pengguna → tembus pandang
 * di atas warna bawaan tema → warna bawaan tema.
 */
export function bubblePaint(style: BubbleStyle, role: "in" | "out"): CSSProperties | undefined {
  if (style.bgColor) {
    return {
      backgroundColor: style.glass ? withAlpha(style.bgColor, style.opacity) : style.bgColor,
    };
  }
  if (style.glass) {
    return {
      backgroundColor: `color-mix(in oklab, var(--bubble-${role}) ${style.opacity}%, transparent)`,
    };
  }
  return undefined;
}

/** Warna teks pesan; jam & centang ikut menyesuaikan. */
export function bubbleInk(style: BubbleStyle): CSSProperties | undefined {
  return style.textColor ? { color: style.textColor } : undefined;
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
