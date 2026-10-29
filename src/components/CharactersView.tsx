"use client";

import type { Character } from "@/types/chat";
import { Avatar } from "./Avatar";
import { ChatsIcon, PencilIcon, PlusIcon, TrashIcon } from "./icons";

export function CharactersView({
  characters,
  onChat,
  onNew,
  onEdit,
  onDelete,
}: {
  characters: Character[];
  onChat: (id: string) => void;
  onNew: () => void;
  onEdit: (character: Character) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-surface">
      <header className="flex items-center justify-between gap-2 border-b border-line bg-header px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div>
          <h2 className="font-display text-lg font-bold text-ink">Karakter</h2>
          <p className="text-xs text-ink-soft">
            {characters.length} karakter · buat sendiri atau pakai contoh
          </p>
        </div>
        <button
          onClick={onNew}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-accent text-white shadow-sm transition hover:brightness-95 active:scale-95"
          title="Buat karakter baru"
          aria-label="Buat karakter baru"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 pb-[calc(var(--tabbar-space)+0.5rem)]">
        {characters.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <p className="text-sm text-ink-soft">Belum ada karakter.</p>
            <button
              onClick={onNew}
              className="flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-strong"
            >
              <PlusIcon className="h-4 w-4" /> Buat karakter pertama
            </button>
          </div>
        ) : (
          <div className="mx-auto grid w-full max-w-4xl gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {characters.map((c) => (
              <div
                key={c.id}
                className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={c.name} src={c.avatarUrl} size={52} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{c.name}</p>
                    <p className="truncate text-xs text-ink-soft">{c.shortBio || "online"}</p>
                  </div>
                </div>
                <p className="line-clamp-3 break-words text-xs leading-relaxed text-ink-soft">
                  {c.personality}
                </p>
                <div className="mt-auto flex items-center gap-2">
                  <button
                    onClick={() => onChat(c.id)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-brand py-2 text-xs font-semibold text-white transition hover:bg-brand-strong"
                  >
                    <ChatsIcon className="h-4 w-4" /> Chat
                  </button>
                  <button
                    onClick={() => onEdit(c)}
                    className="rounded-full border border-line p-2 text-ink-soft transition hover:bg-surface-2"
                    title="Edit karakter"
                    aria-label={`Edit ${c.name}`}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(c.id)}
                    className="rounded-full border border-line p-2 text-ink-soft transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                    title="Hapus karakter"
                    aria-label={`Hapus ${c.name}`}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
