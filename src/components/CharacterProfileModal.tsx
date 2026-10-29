"use client";

import type { Character } from "@/types/chat";
import { Avatar } from "./Avatar";
import { PencilIcon, TrashIcon, XIcon } from "./icons";

export function CharacterProfileModal({
  character,
  providerLabel,
  onClose,
  onEdit,
  onClearChat,
  onDelete,
}: {
  character: Character;
  providerLabel: string;
  onClose: () => void;
  onEdit: () => void;
  onClearChat: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Profil ${character.name}`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="font-display text-lg font-bold text-slate-900">Profil Karakter</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100"
            aria-label="Tutup profil"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="flex flex-col items-center gap-2">
            <Avatar name={character.name} src={character.avatarUrl} size={110} ring />
            <h3 className="font-display mt-2 text-xl font-bold text-slate-900">{character.name}</h3>
            {character.shortBio && <p className="text-sm text-slate-500">{character.shortBio}</p>}
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-500">
              {providerLabel}
            </span>
          </div>

          <div className="mt-5">
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Tentang karakter
            </h4>
            <p className="max-h-52 overflow-y-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
              {character.personality}
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              onClick={onEdit}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              <PencilIcon className="h-4 w-4" /> Edit Karakter
            </button>
            <button
              onClick={onClearChat}
              className="rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Hapus Riwayat Chat
            </button>
          </div>
          <button
            onClick={onDelete}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-rose-200 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
          >
            <TrashIcon className="h-4 w-4" /> Hapus Karakter
          </button>
        </div>
      </div>
    </div>
  );
}
