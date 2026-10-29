"use client";

import { useSyncExternalStore } from "react";
import {
  applyTheme,
  getIsDarkSnapshot,
  getThemeModeSnapshot,
  subscribeTheme,
  type ThemeMode,
} from "@/lib/theme";
import { MoonIcon, SunIcon } from "./icons";

/** Tombol cepat: berganti antara terang dan gelap. */
export function ThemeQuickToggle({ className = "" }: { className?: string }) {
  const isDark = useSyncExternalStore(subscribeTheme, getIsDarkSnapshot, () => false);

  function toggle() {
    applyTheme(isDark ? "light" : "dark");
  }

  return (
    <button
      onClick={toggle}
      className={`rounded-full p-2 text-ink-soft transition hover:bg-line/60 ${className}`}
      title={isDark ? "Ganti ke tema terang" : "Ganti ke tema gelap"}
      aria-label={isDark ? "Ganti ke tema terang" : "Ganti ke tema gelap"}
    >
      {isDark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
    </button>
  );
}

const OPTIONS: { value: ThemeMode; label: string; Icon: (p: { className?: string }) => React.JSX.Element }[] = [
  {
    value: "light",
    label: "Terang",
    Icon: ({ className }) => <SunIcon className={className} />,
  },
  {
    value: "dark",
    label: "Gelap",
    Icon: ({ className }) => <MoonIcon className={className} />,
  },
  {
    value: "system",
    label: "Sistem",
    Icon: ({ className }) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
        <rect x={2.5} y={4} width={19} height={13} rx={2} />
        <path d="M8 21h8m-4-4v4" strokeLinecap="round" />
      </svg>
    ),
  },
];

/** Pemilih tiga mode: terang / gelap / ikut sistem. */
export function ThemeSegmented() {
  const mode = useSyncExternalStore(subscribeTheme, getThemeModeSnapshot, () => "system" as ThemeMode);

  return (
    <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1 ring-1 ring-line">
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = mode === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => applyTheme(value)}
            aria-pressed={active}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition ${
              active ? "bg-surface text-ink shadow-sm ring-1 ring-line" : "text-ink-soft hover:text-ink"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
