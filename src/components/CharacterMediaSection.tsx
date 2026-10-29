"use client";

import { useRef, useState, type ReactNode } from "react";
import type { CharacterMedia } from "@/types/chat";
import { importCallAudio, removeCallAudio } from "@/lib/callAudio";
import { importChatVideo, removeChatVideo } from "@/lib/chatVideo";
import { FilmIcon, SpeakerIcon } from "./icons";

type Slot = "chatVideo" | "callVideo" | "callAudio";

function MediaRow({
  label,
  hint,
  active,
  thumb,
  icon,
  busy,
  onPick,
  onRemove,
}: {
  label: string;
  hint: string;
  active: boolean;
  thumb?: string;
  icon: ReactNode;
  busy: boolean;
  onPick: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line px-3 py-2">
      <div className="grid h-10 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-2 text-ink-soft">
        {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover" /> : icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-ink">{label}</p>
        <p className="truncate text-[12px] text-muted">{busy ? "Memuat..." : hint}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onPick}
          disabled={busy}
          className="rounded-full border border-line px-2.5 py-1 text-[12px] font-medium text-ink-soft transition hover:text-ink disabled:opacity-50"
        >
          {active ? "Ganti" : "Pilih"}
        </button>
        {active && (
          <button
            type="button"
            onClick={onRemove}
            className="text-[12px] font-medium text-ink-soft transition hover:text-ink"
          >
            Hapus
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Media pribadi karakter: klip video call, rekaman suara telepon, dan video
 * yang tampil selama mengobrol. Semua opsional — boleh diisi salah satu saja.
 */
export function CharacterMediaSection({
  media,
  onChange,
}: {
  media: CharacterMedia | null | undefined;
  onChange: (next: CharacterMedia | null) => void;
}) {
  const chatVideoRef = useRef<HTMLInputElement>(null);
  const callVideoRef = useRef<HTMLInputElement>(null);
  const callAudioRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<Slot | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pickVideo(slot: "chatVideo" | "callVideo", file: File) {
    setBusy(slot);
    setError(null);
    try {
      const imported = await importChatVideo(file);
      const next: CharacterMedia = { ...(media ?? {}) };
      const previous = slot === "chatVideo" ? media?.chatVideoId : media?.callVideoId;
      if (slot === "chatVideo") {
        next.chatVideoId = imported.videoId;
        next.chatVideoPosterUrl = imported.posterUrl;
      } else {
        next.callVideoId = imported.videoId;
        next.callVideoPosterUrl = imported.posterUrl;
      }
      onChange(next);
      if (previous) await removeChatVideo(previous);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat video.");
    } finally {
      setBusy(null);
      if (chatVideoRef.current) chatVideoRef.current.value = "";
      if (callVideoRef.current) callVideoRef.current.value = "";
    }
  }

  async function pickAudio(file: File) {
    setBusy("callAudio");
    setError(null);
    try {
      const imported = await importCallAudio(file);
      const previous = media?.callAudioId;
      onChange({ ...(media ?? {}), callAudioId: imported.audioId, callAudioName: imported.name });
      if (previous) await removeCallAudio(previous);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat suara.");
    } finally {
      setBusy(null);
      if (callAudioRef.current) callAudioRef.current.value = "";
    }
  }

  async function dropVideo(slot: "chatVideo" | "callVideo") {
    const previous = slot === "chatVideo" ? media?.chatVideoId : media?.callVideoId;
    const next: CharacterMedia = { ...(media ?? {}) };
    if (slot === "chatVideo") {
      next.chatVideoId = undefined;
      next.chatVideoPosterUrl = undefined;
    } else {
      next.callVideoId = undefined;
      next.callVideoPosterUrl = undefined;
    }
    onChange(next);
    if (previous) await removeChatVideo(previous);
  }

  async function dropAudio() {
    const previous = media?.callAudioId;
    const next: CharacterMedia = { ...(media ?? {}) };
    next.callAudioId = undefined;
    next.callAudioName = undefined;
    onChange(next);
    if (previous) await removeCallAudio(previous);
  }

  return (
    <div className="space-y-2">
      <MediaRow
        label="Video saat chat"
        hint={
          media?.chatVideoId
            ? "Tampil di atas pesan selama mengobrol."
            : "Adegan bicara — tampil di atas pesan."
        }
        active={Boolean(media?.chatVideoId)}
        thumb={media?.chatVideoPosterUrl}
        icon={<FilmIcon className="h-4 w-4" />}
        busy={busy === "chatVideo"}
        onPick={() => chatVideoRef.current?.click()}
        onRemove={() => void dropVideo("chatVideo")}
      />

      {media?.chatVideoId && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2">
          <span className="text-xs font-medium text-ink-soft">Tampilan video chat</span>
          <div className="flex gap-0.5 rounded-full bg-surface-2 p-0.5">
            {[
              { id: "tile" as const, label: "Panel atas" },
              { id: "full" as const, label: "Latar penuh" },
            ].map((option) => {
              const active = (media.chatVideoLayout ?? "tile") === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange({ ...media, chatVideoLayout: option.id })}
                  className={`rounded-full px-2.5 py-1 text-[12px] font-medium transition ${
                    active ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <MediaRow
        label="Video video call"
        hint={
          media?.callVideoId ? "Dipakai saat video call." : "Adegan untuk layar video call."
        }
        active={Boolean(media?.callVideoId)}
        thumb={media?.callVideoPosterUrl}
        icon={<FilmIcon className="h-4 w-4" />}
        busy={busy === "callVideo"}
        onPick={() => callVideoRef.current?.click()}
        onRemove={() => void dropVideo("callVideo")}
      />

      <MediaRow
        label="Suara telepon"
        hint={
          media?.callAudioId
            ? (media.callAudioName ?? "Rekaman suara aktif.")
            : "Rekaman MP3/WAV untuk panggilan telepon."
        }
        active={Boolean(media?.callAudioId)}
        icon={<SpeakerIcon className="h-4 w-4" />}
        busy={busy === "callAudio"}
        onPick={() => callAudioRef.current?.click()}
        onRemove={() => void dropAudio()}
      />

      <p className="text-[12px] leading-snug text-muted">
        Opsional — boleh diisi salah satu saja. Tanpa rekaman suara, panggilan memakai suara
        perangkat bawaan.
      </p>
      {error && <p className="text-[12px] text-rose-600 dark:text-rose-400">{error}</p>}

      <input
        ref={chatVideoRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void pickVideo("chatVideo", file);
        }}
      />
      <input
        ref={callVideoRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void pickVideo("callVideo", file);
        }}
      />
      <input
        ref={callAudioRef}
        type="file"
        accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/wave,audio/mp4,audio/aac,audio/ogg,audio/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void pickAudio(file);
        }}
      />
    </div>
  );
}
