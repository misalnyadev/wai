"use client";

import { useEffect, useRef, useState } from "react";
import type { Character, ChatMessage } from "@/types/chat";
import { Avatar } from "./Avatar";
import { BackIcon, LockIcon } from "./icons";

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function TypingBubble() {
  return (
    <div className="bubble-in flex justify-start">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-sm">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
      </div>
    </div>
  );
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

  return (
    <div className="chat-wallpaper flex h-full min-h-0 flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 bg-[#f0f2f5] px-4 py-2.5 shadow-sm">
        <button
          onClick={onBack}
          className="rounded-full p-1.5 text-slate-600 transition hover:bg-slate-200 md:hidden"
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
            <p className="truncate text-sm font-semibold text-slate-900">{character.name}</p>
            <p className="truncate text-xs text-emerald-600">
              {isTyping ? "sedang mengetik..." : character.shortBio || "online"}
            </p>
          </div>
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 120);
        }}
        className="flex-1 space-y-1.5 overflow-y-auto px-4 py-4 md:px-10"
      >
        <div className="mb-3 flex justify-center">
          <span className="flex items-center gap-1.5 rounded-full bg-[#fdf4c5] px-3 py-1.5 text-center text-[11px] text-slate-600 shadow-sm">
            <LockIcon className="h-3 w-3 shrink-0" />
            Percakapan & foto tersimpan hanya di perangkat ini
          </span>
        </div>

        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`bubble-in relative max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                m.role === "user"
                  ? "rounded-br-sm bg-[#d9fdd3] text-slate-800"
                  : "rounded-bl-sm bg-white text-slate-800"
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
              <span className="float-right ml-2 mt-1 select-none text-[10px] text-slate-400">
                {formatTime(m.createdAt)}
              </span>
            </div>
          </div>
        ))}
        {isTyping && <TypingBubble />}
      </div>
    </div>
  );
}
