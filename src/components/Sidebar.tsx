"use client";

import { useMemo, useState } from "react";
import type { Character } from "@/types/chat";
import { Avatar } from "./Avatar";
import { ThemeQuickToggle } from "./ThemeToggle";
import { LockIcon, PlusIcon, SearchIcon, SettingsIcon } from "./icons";

function formatListTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

export function Sidebar({
  characters,
  activeId,
  onSelect,
  onNewCharacter,
  onOpenSettings,
  hasProviders,
}: {
  characters: Character[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewCharacter: () => void;
  onOpenSettings: () => void;
  hasProviders: boolean;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => characters.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())),
    [characters, query]
  );

  return (
    <div className="flex h-full w-full flex-col border-r border-line bg-surface md:w-[380px] lg:w-[400px]">
      <div className="flex items-center justify-between gap-2 border-b border-line bg-header px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <div className="min-w-0">
          <h1 className="font-display truncate text-lg font-extrabold tracking-tight text-ink">
            Persona<span className="text-emerald-500">.</span>
          </h1>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            privat · di perangkatmu
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <ThemeQuickToggle />
          <button
            onClick={onOpenSettings}
            className="relative rounded-full p-2 text-ink-soft transition hover:bg-line/60"
            title="Pengaturan"
            aria-label="Pengaturan"
          >
            <SettingsIcon className="h-5 w-5" />
            {!hasProviders && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 animate-pulse rounded-full bg-rose-500 ring-2 ring-header" />
            )}
          </button>
          <button
            onClick={onNewCharacter}
            className="flex items-center gap-1 rounded-full bg-emerald-600 py-1.5 pl-2.5 pr-3 text-xs font-semibold text-white transition hover:bg-emerald-700 active:scale-95 dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-emerald-950"
            title="Buat karakter baru"
          >
            <PlusIcon className="h-4 w-4" /> Baru
          </button>
        </div>
      </div>

      <div className="px-3 py-2.5">
        <div className="flex items-center gap-2 rounded-full bg-surface-2 px-3 py-2 ring-1 ring-line transition focus-within:ring-2 focus-within:ring-emerald-400">
          <SearchIcon className="h-4 w-4 shrink-0 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari karakter"
            aria-label="Cari karakter"
            className="w-full bg-transparent text-base text-ink outline-none placeholder:text-muted sm:text-sm"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="shrink-0 text-xs font-medium text-muted hover:text-ink"
              aria-label="Hapus pencarian"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {!hasProviders && (
        <button
          onClick={onOpenSettings}
          className="mx-3 mb-2 rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-left text-xs font-medium text-amber-800 transition hover:bg-amber-100 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/15"
        >
          ⚠️ Belum ada API key — ketuk di sini untuk menambahkan (Gemini gratis)
        </button>
      )}

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-muted">
            {characters.length === 0
              ? "Belum ada karakter. Buat karakter pertamamu!"
              : "Karakter tidak ditemukan."}
          </div>
        )}
        {filtered.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            aria-current={activeId === c.id}
            className={`group relative flex w-full items-center gap-3 px-4 py-3 text-left transition ${
              activeId === c.id ? "bg-surface-2" : "hover:bg-surface-2/70"
            }`}
          >
            {activeId === c.id && (
              <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-emerald-500" />
            )}
            <Avatar name={c.name} src={c.avatarUrl} size={48} />
            <div className="min-w-0 flex-1 border-b border-line/70 pb-3 pt-0.5">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold text-ink">{c.name}</p>
                <span className="shrink-0 text-[11px] text-muted">
                  {formatListTime(c.updatedAt)}
                </span>
              </div>
              <p className="truncate text-xs text-ink-soft">{c.preview}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-center gap-1.5 border-t border-line px-4 py-2.5 text-[11px] text-muted">
        <LockIcon className="h-3 w-3" />
        Tidak ada server penyimpanan · data di browser ini
      </div>
    </div>
  );
}
