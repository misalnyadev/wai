"use client";

import type { Character, CharacterMedia, ChatBackground } from "@/types/chat";
import { useEscape } from "@/lib/useEscape";
import { Avatar } from "./Avatar";
import { ChatBackgroundPicker } from "./ChatBackgroundPicker";
import { CharacterMediaSection } from "./CharacterMediaSection";
import { PencilIcon, TrashIcon, XIcon } from "./icons";

export function CharacterProfileModal({
  character,
  providerLabel,
  onClose,
  onEdit,
  onClearChat,
  onDelete,
  onBackgroundChange,
  onMediaChange,
}: {
  character: Character;
  providerLabel: string;
  onClose: () => void;
  onEdit: () => void;
  onClearChat: () => void;
  onDelete: () => void;
  onBackgroundChange: (next: ChatBackground | null) => void;
  onMediaChange: (next: CharacterMedia | null) => void;
}) {
  useEscape(onClose);

  return (
    <div
      className="fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="pop-in flex max-h-[85vh] w-full max-w-md flex-col rounded-3xl bg-surface shadow-2xl ring-1 ring-black/5 dark:ring-white/10"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Profil ${character.name}`}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-lg font-bold text-ink">Profil Karakter</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-ink-soft transition hover:bg-surface-2"
            aria-label="Tutup profil"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="flex flex-col items-center gap-2">
            <Avatar name={character.name} src={character.avatarUrl} size={110} ring />
            <h3 className="font-display mt-2 text-xl font-bold text-ink">{character.name}</h3>
            {character.shortBio && <p className="text-sm text-ink-soft">{character.shortBio}</p>}
            <span className="rounded-full bg-surface-2 px-3 py-1 text-[12px] font-medium text-ink-soft">
              {providerLabel}
            </span>
          </div>

          <div className="mt-5">
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
              Tentang karakter
            </h4>
            <p className="max-h-52 overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-surface-2 p-3 text-sm leading-relaxed text-ink-soft">
              {character.personality}
            </p>
          </div>

          <div className="mt-5">
            <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
              Latar chat
            </h4>
            <ChatBackgroundPicker
              value={character.chatBackground ?? null}
              onChange={onBackgroundChange}
              allowInherit
            />
          </div>

          <div className="mt-5">
            <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
              Media karakter
            </h4>
            <CharacterMediaSection media={character.media} onChange={onMediaChange} />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              onClick={onEdit}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-brand py-2.5 text-sm font-semibold text-brand-ink transition hover:bg-brand-strong"
            >
              <PencilIcon className="h-4 w-4" /> Edit Karakter
            </button>
            <button
              onClick={onClearChat}
              className="rounded-lg border border-line py-2.5 text-sm font-semibold text-ink-soft transition hover:bg-surface-2"
            >
              Hapus Riwayat Chat
            </button>
          </div>
          <button
            onClick={onDelete}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-line py-2.5 text-sm font-semibold text-ink-soft transition hover:bg-surface-2 hover:text-ink"
          >
            <TrashIcon className="h-4 w-4" /> Hapus Karakter
          </button>
        </div>
      </div>
    </div>
  );
}
