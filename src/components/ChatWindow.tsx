"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Character, ChatMessage } from "@/types/chat";
import { Avatar } from "./Avatar";
import { BackIcon, DoubleCheckIcon, LockIcon } from "./icons";

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

const DAY_MS = 24 * 60 * 60 * 1000;

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getTime() - DAY_MS);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

  if (sameDay(d, today)) return "Hari ini";
  if (sameDay(d, yesterday)) return "Kemarin";
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
}

function TypingBubble() {
  return (
    <div className="bubble-in flex justify-start">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-bubble-in px-4 py-3 shadow-sm">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" />
      </div>
    </div>
  );
}

/** Tanda centang gaya WhatsApp: satu centang saat terkirim, dua saat diproses. */
function Ticks({ pending }: { pending?: boolean }) {
  if (pending) {
    return (
      <svg viewBox="0 0 16 11" className="h-3 w-3 text-muted" aria-label="mengirim">
        <path
          d="M1 6.5l3 3L11 2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return <DoubleCheckIcon className="h-3 w-3 text-sky-500 dark:text-sky-400" />;
}

export function ChatWindow({
  character,
  messages,
  isTyping,
  onBack,
  onOpenProfile,
  onImageClick,
}: {
  character: Character;
  messages: ChatMessage[];
  isTyping: boolean;
  onBack: () => void;
  onOpenProfile: () => void;
  onImageClick: (url: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);

  useEffect(() => {
    if (atBottom && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, atBottom]);

  // Tandai pesan pertama tiap hari untuk pemisah tanggal ala WhatsApp.
  const items = useMemo(
    () =>
      messages.map((message, index) => {
        const label = dayLabel(message.createdAt);
        const previousLabel =
          index > 0 ? dayLabel(messages[index - 1].createdAt) : null;
        return { message, divider: label === previousLabel ? null : label };
      }),
    [messages]
  );

  return (
    <div className="chat-wallpaper flex h-full min-h-0 flex-1 flex-col">
      {/* Header */}
      <div className="z-10 flex items-center gap-3 border-b border-line bg-header px-2 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] sm:px-4">
        <button
          onClick={onBack}
          className="rounded-full p-1.5 text-ink-soft transition hover:bg-line/60 md:hidden"
          aria-label="Kembali ke daftar chat"
        >
          <BackIcon className="h-5 w-5" />
        </button>
        <button
          onClick={onOpenProfile}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          title="Lihat profil karakter"
        >
          <Avatar name={character.name} src={character.avatarUrl} size={40} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{character.name}</p>
            <p
              className={`truncate text-xs ${
                isTyping ? "text-emerald-600 dark:text-emerald-400" : "text-ink-soft"
              }`}
            >
              {isTyping ? "sedang mengetik..." : character.shortBio || "online"}
            </p>
          </div>
        </button>
        <button
          onClick={onOpenProfile}
          className="rounded-full px-2.5 py-1.5 text-lg leading-none text-ink-soft transition hover:bg-line/60 hover:text-ink"
          aria-label="Buka profil dan opsi karakter"
          title="Profil & opsi karakter"
        >
          ⋯
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 120);
        }}
        className="flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4"
      >
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-3 flex justify-center">
            <span className="flex items-center gap-1.5 rounded-full bg-amber-100/90 px-3 py-1.5 text-center text-[11px] text-amber-900 shadow-sm dark:bg-amber-500/15 dark:text-amber-200">
              <LockIcon className="h-3 w-3 shrink-0" />
              Percakapan & foto tersimpan hanya di perangkat ini
            </span>
          </div>

          {items.map(({ message: m, divider }) => {
            return (
              <div key={m.id}>
                {divider && (
                  <div className="my-3 flex justify-center">
                    <span className="rounded-lg bg-surface/80 px-2.5 py-1 text-[11px] font-medium text-ink-soft shadow-sm ring-1 ring-line/60 backdrop-blur">
                      {divider}
                    </span>
                  </div>
                )}
                <div
                  className={`mb-1.5 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`bubble-in relative max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm sm:max-w-[75%] ${
                      m.role === "user"
                        ? "rounded-br-sm bg-bubble-out text-bubble-out-ink"
                        : "rounded-bl-sm bg-bubble-in text-bubble-in-ink"
                    } ${m.pending ? "opacity-60" : ""}`}
                  >
                    {m.imageUrl && (
                      <img
                        src={m.imageUrl}
                        alt="lampiran foto"
                        onClick={() => onImageClick(m.imageUrl!)}
                        className="mb-1.5 max-h-64 w-full cursor-pointer rounded-lg object-cover transition hover:opacity-90"
                      />
                    )}
                    {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                    <span className="float-right ml-2 mt-1 flex translate-y-0.5 items-center gap-1 select-none text-[10px] text-ink-soft/80">
                      {formatTime(m.createdAt)}
                      {m.role === "user" && <Ticks pending={m.pending} />}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          {isTyping && <TypingBubble />}
        </div>
      </div>
    </div>
  );
}
