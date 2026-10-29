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

/**
 * Ubah pilihan latar menjadi style inline untuk area chat.
 * `default` dibiarkan kosong supaya memakai pola bawaan `.chat-wallpaper`.
 */
export function chatBackgroundStyle(
  background: ChatBackground | undefined,
  isDark: boolean
): CSSProperties {
  if (!background || background.kind === "default") return {};

  if (background.kind === "preset") {
    const preset = getPreset(background.id);
    return {
      backgroundColor: isDark ? preset.dark : preset.light,
      backgroundImage: "none",
    };
  }

  const dim = Math.min(0.75, Math.max(0, background.dim ?? 0.25));
  return {
    backgroundColor: isDark ? "#0b0b0d" : "#f7f8fa",
    backgroundImage: `linear-gradient(rgba(0,0,0,${dim}), rgba(0,0,0,${dim})), url("${background.imageUrl}")`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  };
}
