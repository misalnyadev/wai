"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { Character, ChatBackground, ChatMessage } from "@/types/chat";
import { chatBackgroundProps } from "@/lib/chatBackground";
import { getIsDarkSnapshot, subscribeTheme } from "@/lib/theme";
import { copyText } from "@/lib/clipboard";
import { Avatar } from "./Avatar";
import { useIsSpeaking } from "@/lib/voice";
import { ChatVideoBackground, ChatVideoPanel } from "./ChatVideo";
import { MessageActionsSheet, MessageHoverActions } from "./MessageActions";
import { BackIcon, DoubleCheckIcon, PhoneCallIcon, SpeakerIcon, VideoCallIcon } from "./icons";

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

function TypingBubble({ glass = false, glassOpacity = 70 }: { glass?: boolean; glassOpacity?: number }) {
  return (
    <div className="bubble-in flex justify-start">
      <div
        className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-bubble-in px-4 py-3 shadow-sm"
        style={
          glass
            ? { backgroundColor: `color-mix(in oklab, var(--bubble-in) ${glassOpacity}%, transparent)` }
            : undefined
        }
      >
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
  return <DoubleCheckIcon className="h-3 w-3 text-ink-soft" />;
}

export function ChatWindow({
  character,
  messages,
  isTyping,
  background,
  glass = false,
  glassOpacity = 70,
  onBack,
  onOpenProfile,
  onImageClick,
  onSpeak,
  onVideoCall,
  onAudioCall,
  onDeleteMessage,
  onRegenerate,
}: {
  character: Character;
  messages: ChatMessage[];
  isTyping: boolean;
  background?: ChatBackground;
  /** Gelembung tembus pandang agar latar video/gambar terlihat di baliknya. */
  glass?: boolean;
  /** Kepekatan gelembung tembus pandang (40–95%). */
  glassOpacity?: number;
  onBack: () => void;
  onOpenProfile: () => void;
  onImageClick: (url: string) => void;
  onSpeak?: (text: string) => void;
  onVideoCall?: () => void;
  onAudioCall?: () => void;
  /** Hapus satu pesan (tekan lama / klik kanan pada gelembung). */
  onDeleteMessage?: (messageId: string) => void;
  /** Minta balasan baru untuk pesan terakhir (hanya bila memungkinkan). */
  onRegenerate?: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  /** Pesan yang sedang dibuka lembar aksinya (tekan lama / klik kanan). */
  const [actionMessage, setActionMessage] = useState<ChatMessage | null>(null);
  const pressTimer = useRef<number | null>(null);
  const pressOrigin = useRef<{ x: number; y: number } | null>(null);
  const didLongPress = useRef(false);
  const isDark = useSyncExternalStore(subscribeTheme, getIsDarkSnapshot, () => false);
  const backdrop = chatBackgroundProps(background, isDark);
  const video = background?.kind === "video" ? background : null;
  const chatMedia = character.media;
  const chatVideo = chatMedia?.chatVideoId
    ? { videoId: chatMedia.chatVideoId, posterUrl: chatMedia.chatVideoPosterUrl ?? "" }
    : null;
  // "Latar penuh" = video menutup area chat; "Panel atas" = kartu di atas pesan.
  const chatVideoFull = Boolean(chatVideo && (chatMedia?.chatVideoLayout ?? "tile") === "full");
  // Karakter dianggap "bicara" saat mengetik atau saat suaranya dibacakan —
  // dipakai untuk berganti ke klip video bicara bila pengguna memasangnya.
  const speaking = useIsSpeaking();
  const talking = isTyping || speaking;

  useEffect(() => {
    if (atBottom && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, atBottom]);

  // Bersihkan timer tekan lama saat percakapan ditutup / berganti karakter.
  useEffect(() => {
    return () => {
      if (pressTimer.current !== null) window.clearTimeout(pressTimer.current);
    };
  }, []);

  function clearPressTimer() {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }

  function startLongPress(e: ReactPointerEvent, message: ChatMessage) {
    // Mouse memakai hover / klik kanan; tekan lama hanya untuk layar sentuh.
    if (e.pointerType === "mouse") return;
    pressOrigin.current = { x: e.clientX, y: e.clientY };
    didLongPress.current = false;
    clearPressTimer();
    pressTimer.current = window.setTimeout(() => {
      pressTimer.current = null;
      didLongPress.current = true;
      setActionMessage(message);
      navigator.vibrate?.(12);
    }, 420);
  }

  function cancelLongPress() {
    clearPressTimer();
    pressOrigin.current = null;
  }

  function cancelOnMove(e: ReactPointerEvent) {
    const origin = pressOrigin.current;
    if (!origin) return;
    if (Math.abs(e.clientX - origin.x) > 10 || Math.abs(e.clientY - origin.y) > 10) {
      cancelLongPress();
    }
  }

  // Balasan karakter paling akhir — satu-satunya yang boleh diulang.
  const lastReplyId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return messages[i].id;
    }
    return null;
  }, [messages]);

  const lastReply = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant" && messages[i].content.trim()) return messages[i].content;
    }
    return "";
  }, [messages]);

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
    <div
      className={`chat-wallpaper flex h-full min-h-0 flex-1 flex-col ${backdrop.className} ${
        chatVideoFull ? "chat-video" : ""
      }`}
      style={backdrop.style}
    >
      {chatVideoFull && chatVideo && (
        <ChatVideoBackground
          videoId={chatVideo.videoId}
          posterUrl={chatVideo.posterUrl}
          dim={0.12}
        />
      )}

      {video && video.layout !== "tile" && (
        <ChatVideoBackground
          videoId={video.videoId}
          posterUrl={video.posterUrl}
          dim={video.dim}
          talkingVideoId={video.talkingVideoId}
          talkingPosterUrl={video.talkingPosterUrl}
          talking={talking}
        />
      )}

      {/* Header */}
      <div className="z-10 flex items-center gap-3 bg-header px-2 pb-2.5 pt-[max(0.625rem,var(--safe-top))] sm:px-4">
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
                isTyping ? "text-ink" : "text-ink-soft"
              }`}
            >
              {isTyping ? "sedang mengetik..." : character.shortBio || "online"}
            </p>
          </div>
        </button>
        {onSpeak && (
          <span className="hidden sm:block">
          <button
            onClick={() => onSpeak(lastReply)}
            disabled={!lastReply}
            className="rounded-full p-2 text-ink-soft transition hover:bg-line/60 hover:text-ink disabled:opacity-40"
            aria-label="Bacakan pesan terakhir karakter"
            title="Bacakan pesan terakhir"
          >
            <SpeakerIcon className="h-5 w-5" />
          </button>
          </span>
        )}
        {onVideoCall && (
          <button
            onClick={onVideoCall}
            className="rounded-full p-2 text-ink-soft transition hover:bg-line/60 hover:text-ink"
            aria-label={`Video call dengan ${character.name}`}
            title="Video call"
          >
            <VideoCallIcon className="h-8 w-8" />
          </button>
        )}
        {onAudioCall && (
          <button
            onClick={onAudioCall}
            className="rounded-full p-2 text-ink-soft transition hover:bg-line/60 hover:text-ink"
            aria-label={`Panggilan suara dengan ${character.name}`}
            title="Panggilan suara"
          >
            <PhoneCallIcon className="h-6 w-6" />
          </button>
        )}
      </div>

      {((chatVideo && !chatVideoFull) || video?.layout === "tile") && (
        <div className="px-3 pt-3 sm:px-4">
          <div className="mx-auto w-full max-w-lg">
            {chatVideo && !chatVideoFull ? (
              <ChatVideoPanel
                videoId={chatVideo.videoId}
                posterUrl={chatVideo.posterUrl}
                dim={0.05}
                name={character.name}
              />
            ) : video && video.layout === "tile" ? (
              <ChatVideoPanel
                videoId={video.videoId}
                posterUrl={video.posterUrl}
                dim={video.dim}
                name={character.name}
                talkingVideoId={video.talkingVideoId}
                talkingPosterUrl={video.talkingPosterUrl}
                talking={talking}
              />
            ) : null}
          </div>
        </div>
      )}

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
          {items.map(({ message: m, divider }) => {
            const canSpeak = m.role === "assistant" && Boolean(m.content.trim()) && Boolean(onSpeak);
            const canRegenerate = Boolean(onRegenerate) && m.id === lastReplyId && !isTyping;
            return (
              <div key={m.id}>
                {divider && (
                  <div className="my-3 flex justify-center">
                    <span className="rounded-lg bg-surface/80 px-2.5 py-1 text-[12px] font-medium text-ink-soft shadow-sm ring-1 ring-line/60 backdrop-blur">
                      {divider}
                    </span>
                  </div>
                )}
                <div
                  className={`group mb-1.5 flex items-end gap-1 ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setActionMessage(m);
                  }}
                  onPointerDown={(e) => startLongPress(e, m)}
                  onPointerMove={cancelOnMove}
                  onPointerUp={cancelLongPress}
                  onPointerCancel={cancelLongPress}
                  onPointerLeave={cancelLongPress}
                >
                  <div className="relative max-w-[85%] sm:max-w-[75%]">
                    {onDeleteMessage && (
                      <MessageHoverActions
                        side={m.role === "user" ? "right" : "left"}
                        canSpeak={canSpeak}
                        canRegenerate={canRegenerate}
                        onCopy={() => copyText(m.content)}
                        onSpeak={() => onSpeak?.(m.content)}
                        onRegenerate={() => onRegenerate?.()}
                        onDelete={() => setActionMessage(m)}
                      />
                    )}
                    <div
                      className={`bubble-in relative max-w-full rounded-2xl px-3 py-2 text-sm shadow-sm max-md:select-none ${
                        m.role === "user"
                          ? "rounded-br-sm bg-bubble-out text-bubble-out-ink"
                          : "rounded-bl-sm bg-bubble-in text-bubble-in-ink"
                      } ${m.pending ? "opacity-60" : ""}`}
                      style={
                        glass
                          ? {
                              backgroundColor: `color-mix(in oklab, var(--bubble-${
                                m.role === "user" ? "out" : "in"
                              }) ${glassOpacity}%, transparent)`,
                            }
                          : undefined
                      }
                    >
                      {m.imageUrl && (
                        <img
                          src={m.imageUrl}
                          alt="lampiran foto"
                          onClick={() => {
                            if (didLongPress.current) {
                              didLongPress.current = false;
                              return;
                            }
                            onImageClick(m.imageUrl!);
                          }}
                          className="mb-1.5 max-h-64 w-full cursor-pointer rounded-lg object-cover transition hover:opacity-90"
                        />
                      )}
                      {m.content && (
                        <p className="whitespace-pre-wrap break-words">{m.content}</p>
                      )}
                      <span className="float-right ml-2 mt-1 flex translate-y-0.5 items-center gap-1 select-none text-[12px] text-ink-soft/80">
                        {formatTime(m.createdAt)}
                        {m.role === "user" && <Ticks pending={m.pending} />}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {isTyping && <TypingBubble glass={glass} glassOpacity={glassOpacity} />}
        </div>
      </div>

      {actionMessage && (
        <MessageActionsSheet
          message={actionMessage}
          canSpeak={
            actionMessage.role === "assistant" &&
            Boolean(actionMessage.content.trim()) &&
            Boolean(onSpeak)
          }
          canRegenerate={Boolean(onRegenerate) && actionMessage.id === lastReplyId && !isTyping}
          onClose={() => setActionMessage(null)}
          onSpeak={() => onSpeak?.(actionMessage.content)}
          onRegenerate={() => onRegenerate?.()}
          onDelete={() => onDeleteMessage?.(actionMessage.id)}
        />
      )}
    </div>
  );
}
