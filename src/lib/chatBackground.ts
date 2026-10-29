import type { CSSProperties } from "react";
import type { ChatBackground } from "@/types/chat";

/** Pilihan warna latar chat — tiap warna punya versi terang & gelap. */
export type ChatColorPreset = {
  id: string;
  label: string;
  light: string;
  dark: string;
};

export const CHAT_COLOR_PRESETS: ChatColorPreset[] = [
  { id: "paper", label: "Kertas", light: "#f7f8fa", dark: "#0b0b0d" },
  { id: "sand", label: "Pasir", light: "#f0ece4", dark: "#161513" },
  { id: "mist", label: "Kabut", light: "#e9eef3", dark: "#11161a" },
  { id: "rose", label: "Sendu", light: "#f3ecee", dark: "#181315" },
  { id: "ash", label: "Abu", light: "#e6e8eb", dark: "#131417" },
  { id: "night", label: "Malam", light: "#dadfe4", dark: "#0d0f12" },
];

export function getPreset(id: string | undefined): ChatColorPreset {
  return CHAT_COLOR_PRESETS.find((preset) => preset.id === id) ?? CHAT_COLOR_PRESETS[0];
}

/** Warna representatif untuk pratinjau (dipakai di daftar setelan). */
export function presetSwatch(preset: ChatColorPreset): string {
  return `linear-gradient(135deg, ${preset.light} 0%, ${preset.light} 50%, ${preset.dark} 50%, ${preset.dark} 100%)`;
}

/* ------------------------------------------------------------------ */
/* Latar animasi (virtual background ala video call)                   */
/* ------------------------------------------------------------------ */

export type ChatAnimatedPreset = {
  id: string;
  label: string;
  hint: string;
};

export const CHAT_ANIMATED_PRESETS: ChatAnimatedPreset[] = [
  { id: "bokeh", label: "Bokeh", hint: "Bulatan lembut melayang" },
  { id: "aurora", label: "Aurora", hint: "Gradasi bergerak pelan" },
  { id: "waves", label: "Gelombang", hint: "Garis halus mengalir" },
  { id: "stars", label: "Bintang", hint: "Titik berkelip samar" },
  { id: "mist", label: "Kabut", hint: "Kabut mengambang" },
];

export function getAnimatedPreset(id: string | undefined): ChatAnimatedPreset {
  return CHAT_ANIMATED_PRESETS.find((preset) => preset.id === id) ?? CHAT_ANIMATED_PRESETS[0];
}

/** Pratinjau statis untuk tombol pilihan (animasinya hanya di area chat). */
export function animatedSwatch(preset: ChatAnimatedPreset, isDark: boolean): string {
  const base = isDark ? "#0b0b0d" : "#f2f3f5";
  const tint = isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.16)";
  const tintSoft = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)";

  switch (preset.id) {
    case "bokeh":
      return `radial-gradient(circle at 30% 28%, ${tint} 0 22%, transparent 24%), radial-gradient(circle at 72% 68%, ${tintSoft} 0 26%, transparent 28%), radial-gradient(circle at 20% 80%, ${tintSoft} 0 16%, transparent 18%), ${base}`;
    case "aurora":
      return `linear-gradient(115deg, ${base} 0%, ${tint} 38%, ${tintSoft} 62%, ${base} 100%)`;
    case "waves":
      return `repeating-linear-gradient(155deg, ${tint} 0 1.5px, transparent 1.5px 9px), ${base}`;
    case "stars":
      return `radial-gradient(circle at 25% 25%, ${tint} 0 1px, transparent 1.6px), radial-gradient(circle at 70% 55%, ${tintSoft} 0 1px, transparent 1.6px), radial-gradient(circle at 45% 80%, ${tint} 0 1px, transparent 1.6px), ${base}`;
    default:
      return `radial-gradient(ellipse at 35% 30%, ${tint} 0%, transparent 62%), ${base}`;
  }
}

/**
 * Properti untuk area chat: kelas animasi/video (bila dipilih) + style latar.
 * `default` dibiarkan kosong supaya memakai pola bawaan `.chat-wallpaper`.
 */
export function chatBackgroundProps(
  background: ChatBackground | undefined,
  isDark: boolean
): { className: string; style: CSSProperties } {
  if (!background || background.kind === "default") return { className: "", style: {} };

  if (background.kind === "preset") {
    const preset = getPreset(background.id);
    return {
      className: "",
      style: {
        backgroundColor: isDark ? preset.dark : preset.light,
        backgroundImage: "none",
      },
    };
  }

  if (background.kind === "animated") {
    const preset = getAnimatedPreset(background.id);
    return {
      className: `chat-anim chat-anim-${preset.id}`,
      style: {
        backgroundColor: isDark ? "#0b0b0d" : "#f2f3f5",
        backgroundImage: "none",
      },
    };
  }

  if (background.kind === "video") {
    // Mode panel: biarkan pola bawaan tema, videonya tampil sebagai kartu di atas pesan.
    if (background.layout === "tile") return { className: "", style: {} };
    return {
      className: "chat-video",
      style: { backgroundColor: "#07070a", backgroundImage: "none" },
    };
  }

  const dim = Math.min(0.75, Math.max(0, background.dim ?? 0.25));
  return {
    className: "",
    style: {
      backgroundColor: isDark ? "#0b0b0d" : "#f7f8fa",
      backgroundImage: `linear-gradient(rgba(0,0,0,${dim}), rgba(0,0,0,${dim})), url("${background.imageUrl}")`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    },
  };
}
