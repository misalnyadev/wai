"use client";

import { useMemo, useState } from "react";
import type { Character, UserProfile } from "@/types/chat";
import { Avatar } from "./Avatar";
import { ThemeQuickToggle } from "./ThemeToggle";
import { PlusIcon, SearchIcon, SettingsIcon } from "./icons";

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
  profile,
  onSelect,
  onNewCharacter,
  onOpenSettings,
  onOpenProfile,
  hasProviders,
}: {
  characters: Character[];
  activeId: string | null;
  profile: UserProfile;
  onSelect: (id: string) => void;
  onNewCharacter: () => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  hasProviders: boolean;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => characters.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())),
    [characters, query]
  );

  return (
    <div className="flex h-full w-full flex-col bg-surface md:w-[380px] lg:w-[400px]">
      <div className="flex items-center justify-between gap-2 bg-header px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <button
          onClick={onOpenProfile}
          className="flex min-w-0 items-center gap-2 text-left md:pointer-events-none"
          title={profile.name ? `Profil: ${profile.name}` : "Isi profil kamu"}
        >
          <span className="md:hidden">
            <Avatar
              name={profile.nickname || profile.name || "Kamu"}
              src={profile.avatarUrl}
              size={34}
            />
          </span>
          <img
            src="/images/logo-wai-128.png"
            alt=""
            className="hidden h-7 w-7 shrink-0 rounded-lg md:block"
          />
          <span className="min-w-0">
            <h1 className="font-display truncate text-lg font-extrabold tracking-tight text-ink">
              WaiChat<span className="text-muted">.</span>
            </h1>
            <p className="truncate text-[12px] font-semibold uppercase tracking-wider text-muted">
              {profile.nickname?.trim()
                ? `hai, ${profile.nickname.trim()}`
                : "privat · di perangkatmu"}
            </p>
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <span className="hidden md:block">
            <ThemeQuickToggle />
          </span>
          <button
            onClick={onOpenSettings}
            className="relative rounded-full p-2 text-ink-soft transition hover:bg-line/60"
            title="Setelan"
            aria-label="Setelan"
          >
            <SettingsIcon className="h-5 w-5" />
            {!hasProviders && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 animate-pulse rounded-full bg-ink/40 ring-2 ring-header" />
            )}
          </button>
          <button
            onClick={onNewCharacter}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-brand-ink shadow-sm transition hover:bg-brand-strong active:scale-95"
            title="Buat karakter baru"
            aria-label="Buat karakter baru"
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="px-3 py-2.5">
        <div className="flex items-center gap-2 rounded-full bg-surface-2 px-3 py-2 ring-1 ring-line transition">
          <SearchIcon className="h-4 w-4 shrink-0 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari karakter"
            aria-label="Cari karakter"
            className="min-w-0 w-full bg-transparent text-base text-ink outline-none placeholder:text-muted sm:text-sm"
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
          className="mx-3 mb-2 rounded-xl border border-line bg-surface-2 px-3 py-2 text-left text-xs font-medium text-ink-soft transition hover:text-ink"
        >
          Belum ada API key · atur di sini
        </button>
      )}

      <div className="flex-1 overflow-y-auto pb-[var(--tabbar-space)] md:pb-0">
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
              <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-ink" />
            )}
            <Avatar name={c.name} src={c.avatarUrl} size={48} />
            <div className="min-w-0 flex-1 pb-3 pt-0.5">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold text-ink">{c.name}</p>
                <span className="shrink-0 text-[12px] text-muted">
                  {formatListTime(c.updatedAt)}
                </span>
              </div>
              <p className="truncate text-xs text-ink-soft">{c.preview}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
