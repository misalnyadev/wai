"use client";

import { useSyncExternalStore, useState } from "react";
import { createPortal } from "react-dom";
import type { ChatMessage } from "@/types/chat";
import { copyText } from "@/lib/clipboard";
import { useEscape } from "@/lib/useEscape";
import {
  CheckIcon,
  CopyIcon,
  RefreshIcon,
  SpeakerIcon,
  TrashIcon,
} from "./icons";

const subscribeNothing = () => () => {};

/** true hanya setelah komponen hidup di browser (aman untuk portal). */
function useIsClient() {
  return useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
}

function snippet(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "Foto";
  return clean.length > 90 ? `${clean.slice(0, 90)}…` : clean;
}

/**
 * Deretan tombol kecil yang muncul saat kursor mengarah ke sebuah gelembung
 * (khusus desktop / perangkat berpointer). Di HP, aksi dibuka lewat tekan lama.
 */
export function MessageHoverActions({
  canSpeak,
  canRegenerate,
  onCopy,
  onSpeak,
  onRegenerate,
  onDelete,
  side,
}: {
  canSpeak: boolean;
  canRegenerate: boolean;
  onCopy: () => void;
  onSpeak: () => void;
  onRegenerate: () => void;
  onDelete: () => void;
  /** Sisi tempat tombol muncul, mengikuti posisi gelembung. */
  side: "left" | "right";
}) {
  const [copied, setCopied] = useState(false);
  const button =
    "rounded-full p-1.5 text-ink-soft transition hover:bg-surface-2/80 hover:text-ink";

  function handleCopy() {
    onCopy();
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div
      className={`pointer-events-none absolute top-1/2 hidden -translate-y-1/2 items-center gap-0.5 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 md:flex ${
        side === "right" ? "right-full mr-1" : "left-full ml-1"
      }`}
    >
      {canSpeak && (
        <button
          onClick={onSpeak}
          className={button}
          aria-label="Bacakan pesan"
          title="Bacakan"
        >
          <SpeakerIcon className="h-4 w-4" />
        </button>
      )}
      {canRegenerate && (
        <button
          onClick={onRegenerate}
          className={button}
          aria-label="Ulangi balasan karakter"
          title="Ulangi balasan"
        >
          <RefreshIcon className="h-4 w-4" />
        </button>
      )}
      <button
        onClick={handleCopy}
        className={button}
        aria-label={copied ? "Tersalin" : "Salin teks pesan"}
        title={copied ? "Tersalin" : "Salin"}
      >
        {copied ? (
          <CheckIcon className="h-4 w-4" />
        ) : (
          <CopyIcon className="h-4 w-4" />
        )}
      </button>
      <button
        onClick={onDelete}
        className={button}
        aria-label="Hapus pesan"
        title="Hapus"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * Lembar aksi dari bawah layar — muncul saat gelembung ditekan lama (HP) atau
 * diklik kanan (desktop). Sengaja memakai label, bukan ikon saja, supaya jelas.
 */
export function MessageActionsSheet({
  message,
  canSpeak,
  canRegenerate,
  onClose,
  onSpeak,
  onRegenerate,
  onDelete,
}: {
  message: ChatMessage;
  canSpeak: boolean;
  canRegenerate: boolean;
  onClose: () => void;
  onSpeak: () => void;
  onRegenerate: () => void;
  onDelete: () => void;
}) {
  const isClient = useIsClient();
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEscape(onClose);

  if (!isClient) return null;

  const row =
    "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-ink transition hover:bg-surface-2 active:scale-[0.99]";

  async function handleCopy() {
    const ok = await copyText(message.content);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(onClose, 650);
  }

  const content = (
    <div
      className="fade-in fixed inset-0 z-[85] flex flex-col justify-end bg-black/45"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Aksi pesan"
    >
      <div
        className="rounded-t-2xl bg-surface px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-2xl ring-1 ring-line"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="mx-auto mb-2 h-1 w-10 rounded-full bg-line"
          aria-hidden="true"
        />
        <p className="truncate px-3 pb-2 text-xs text-muted">
          {message.role === "user" ? "Pesanmu" : "Pesan karakter"} ·{" "}
          {snippet(message.content)}
        </p>

        {message.content.trim() && (
          <button onClick={handleCopy} className={row} disabled={copied}>
            <CopyIcon className="h-5 w-5 shrink-0 text-ink-soft" />
            {copied ? "Tersalin" : "Salin teks"}
          </button>
        )}

        {canSpeak && message.content.trim() && (
          <button
            onClick={() => {
              onSpeak();
              onClose();
            }}
            className={row}
          >
            <SpeakerIcon className="h-5 w-5 shrink-0 text-ink-soft" />
            Bacakan pesan ini
          </button>
        )}

        {canRegenerate && (
          <button
            onClick={() => {
              onRegenerate();
              onClose();
            }}
            className={row}
          >
            <RefreshIcon className="h-5 w-5 shrink-0 text-ink-soft" />
            Ulangi balasan
          </button>
        )}

        {confirmDelete ? (
          <div className="rounded-xl bg-surface-2 px-3 py-3">
            <p className="text-sm font-semibold text-ink">Hapus pesan ini?</p>
            <p className="mt-0.5 text-xs text-ink-soft">
              Tidak bisa dikembalikan.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 rounded-lg bg-surface px-3 py-2 text-sm font-semibold text-ink ring-1 ring-line transition hover:bg-surface-2"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  onDelete();
                  onClose();
                }}
                className="flex-1 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-strong"
              >
                Hapus
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className={row}>
            <TrashIcon className="h-5 w-5 shrink-0 text-ink-soft" />
            Hapus pesan
          </button>
        )}

        <button
          onClick={onClose}
          className="mt-1 w-full rounded-xl px-3 py-3 text-center text-sm font-semibold text-ink-soft transition hover:bg-surface-2"
        >
          Tutup
        </button>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
