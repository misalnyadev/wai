"use client";

import { useMemo, useState } from "react";
import type { Character } from "@/types/chat";
import { Avatar } from "./Avatar";
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
    <div className="flex h-full w-full flex-col border-r border-slate-200 bg-white md:w-[380px]">
      <div className="flex items-center justify-between bg-[#f0f2f5] px-4 py-3">
        <div>
          <h1 className="font-display text-lg font-extrabold tracking-tight text-slate-900">
            Persona
          </h1>
          <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-600">
            privat · di perangkatmu
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenSettings}
            className="relative rounded-full p-2 text-slate-600 transition hover:bg-slate-200"
            title="Pengaturan API Key"
            aria-label="Pengaturan API Key"
          >
            <SettingsIcon className="h-5 w-5" />
            {!hasProviders && (
              <span className="absolute right-1 top-1 h-2 w-2 animate-pulse rounded-full bg-rose-500" />
            )}
          </button>
          <button
            onClick={onNewCharacter}
            className="flex items-center gap-1 rounded-full bg-emerald-600 py-1.5 pl-2.5 pr-3 text-xs font-semibold text-white transition hover:bg-emerald-700 active:scale-95"
            title="Buat karakter baru"
          >
            <PlusIcon className="h-4 w-4" /> Baru
          </button>
        </div>
      </div>

      <div className="px-3 py-2">
        <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 transition focus-within:ring-2 focus-within:ring-emerald-300">
          <SearchIcon className="h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari karakter"
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      {!hasProviders && (
        <button
          onClick={onOpenSettings}
          className="mx-3 mb-1 rounded-lg bg-amber-50 px-3 py-2 text-left text-xs font-medium text-amber-700 transition hover:bg-amber-100"
        >
          ⚠️ Belum ada API key — ketuk di sini untuk menambahkan (Gemini gratis)
        </button>
      )}

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-slate-400">
            {characters.length === 0
              ? "Belum ada karakter. Buat karakter pertamamu!"
              : "Karakter tidak ditemukan."}
          </div>
        )}
        {filtered.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 ${
              activeId === c.id ? "bg-slate-100" : ""
            }`}
          >
            <Avatar name={c.name} src={c.avatarUrl} size={48} />
            <div className="min-w-0 flex-1 border-b border-slate-100 pb-3 pt-0.5">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold text-slate-900">{c.name}</p>
                <span className="shrink-0 text-[11px] text-slate-400">
                  {formatListTime(c.updatedAt)}
                </span>
              </div>
              <p className="truncate text-xs text-slate-500">{c.preview}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
