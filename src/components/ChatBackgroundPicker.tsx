"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import type { ChatBackground } from "@/types/chat";
import {
  CHAT_ANIMATED_PRESETS,
  CHAT_COLOR_PRESETS,
  animatedSwatch,
  getAnimatedPreset,
  getPreset,
  presetSwatch,
} from "@/lib/chatBackground";
import { MAX_VIDEO_MB, importChatVideo, removeChatVideo, useChatVideoStatus } from "@/lib/chatVideo";
import { fileToDataUrl } from "@/lib/imageClient";
import { getIsDarkSnapshot, subscribeTheme } from "@/lib/theme";
import { CameraIcon, FilmIcon } from "./icons";

/**
 * Pemilih latar area chat: warna, gambar, animasi, atau video.
 * `value === null` berarti "ikut setelan" (dipakai di latar per karakter).
 */
export function ChatBackgroundPicker({
  value,
  onChange,
  allowInherit = false,
}: {
  value: ChatBackground | null;
  onChange: (next: ChatBackground | null) => void;
  allowInherit?: boolean;
}) {
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const talkingRef = useRef<HTMLInputElement>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [videoBusy, setVideoBusy] = useState(false);
  const [talkingBusy, setTalkingBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  /** Nilai sementara slider peredupan — disimpan saat jari dilepas. */
  const [dimDraft, setDimDraft] = useState<number | null>(null);
  const isDark = useSyncExternalStore(subscribeTheme, getIsDarkSnapshot, () => false);

  const current: ChatBackground = value ?? { kind: "default" };
  const isImage = value !== null && current.kind === "image";
  const isVideo = value !== null && current.kind === "video";
  const videoId = isVideo ? current.videoId : null;
  const videoStatus = useChatVideoStatus(videoId);
  const videoLayout = isVideo ? (current.layout ?? "full") : "full";

  const dimPercent =
    dimDraft ??
    Math.round((current.kind === "image" || current.kind === "video" ? current.dim : 0.25) * 100);

  async function handleImage(file: File) {
    setError(null);
    setNote(null);
    if (!file.type.startsWith("image/")) {
      setError("Pilih file gambar.");
      return;
    }
    setImageBusy(true);
    try {
      const imageUrl = await fileToDataUrl(file, 1600, 0.72);
      setDimDraft(null);
      onChange({ kind: "image", imageUrl, dim: 0.25 });
    } catch {
      setError("Gagal membaca gambar. Coba file lain.");
    } finally {
      setImageBusy(false);
      if (imageRef.current) imageRef.current.value = "";
    }
  }

  async function handleVideo(file: File) {
    setError(null);
    setNote(null);
    setVideoBusy(true);
    try {
      const imported = await importChatVideo(file);
      setDimDraft(null);
      onChange({
        kind: "video",
        videoId: imported.videoId,
        posterUrl: imported.posterUrl,
        dim: 0.15,
        layout: "full",
      });
      setNote(
        imported.duration
          ? `Video siap · ${Math.round(imported.duration)} detik`
          : "Video siap dipakai."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat video.");
    } finally {
      setVideoBusy(false);
      if (videoRef.current) videoRef.current.value = "";
    }
  }

  async function handleTalkingVideo(file: File) {
    if (current.kind !== "video") return;
    setError(null);
    setNote(null);
    setTalkingBusy(true);
    try {
      const imported = await importChatVideo(file);
      const previous = current.talkingVideoId;
      onChange({
        ...current,
        talkingVideoId: imported.videoId,
        talkingPosterUrl: imported.posterUrl,
      });
      if (previous) await removeChatVideo(previous);
      setNote("Klip bicara siap — diputar saat karakter mengetik atau bersuara.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat klip bicara.");
    } finally {
      setTalkingBusy(false);
      if (talkingRef.current) talkingRef.current.value = "";
    }
  }

  async function dropTalkingVideo() {
    if (current.kind !== "video") return;
    const previous = current.talkingVideoId;
    onChange({ ...current, talkingVideoId: undefined, talkingPosterUrl: undefined });
    if (previous) await removeChatVideo(previous);
  }

  function commitDim(percent: number) {
    setDimDraft(null);
    if (current.kind === "image") {
      onChange({ kind: "image", imageUrl: current.imageUrl, dim: percent / 100 });
    } else if (current.kind === "video") {
      onChange({ ...current, dim: percent / 100 });
    }
  }

  async function dropVideo() {
    if (current.kind !== "video") return;
    const id = current.videoId;
    setNote(null);
    onChange({ kind: "default" });
    await removeChatVideo(id);
  }

  const ring = "border-ink ring-2 ring-ink/25";
  const idle = "border-line hover:border-ink/40";

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-[12px] font-medium text-muted">Warna &amp; gambar</p>
        <div className="flex flex-wrap items-center gap-2">
          {allowInherit && (
            <button
              type="button"
              onClick={() => onChange(null)}
              title="Ikut setelan"
              aria-pressed={value === null}
              className={`flex h-10 items-center rounded-full border px-3 text-xs font-medium transition ${
                value === null ? `${ring} text-ink` : `${idle} bg-surface-2 text-ink-soft`
              }`}
            >
              Ikut setelan
            </button>
          )}

          {/* Bawaan */}
          <button
            type="button"
            onClick={() => onChange({ kind: "default" })}
            aria-pressed={!allowInherit && value !== null && current.kind === "default"}
            title="Bawaan"
            className={`relative h-10 w-10 shrink-0 overflow-hidden rounded-full border transition ${
              !allowInherit && value !== null && current.kind === "default" ? ring : idle
            }`}
            style={{
              backgroundColor: isDark ? "#0b0b0d" : "#f7f8fa",
              backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
              backgroundSize: "7px 7px",
              color: isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.14)",
            }}
          >
            <span className="sr-only">Latar bawaan</span>
          </button>

          {/* Warna */}
          {CHAT_COLOR_PRESETS.map((preset) => {
            const active = value !== null && current.kind === "preset" && current.id === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onChange({ kind: "preset", id: preset.id })}
                aria-pressed={active}
                title={preset.label}
                className={`relative h-10 w-10 shrink-0 overflow-hidden rounded-full border transition ${
                  active ? ring : idle
                }`}
                style={{ backgroundImage: presetSwatch(preset) }}
              >
                <span className="sr-only">{preset.label}</span>
              </button>
            );
          })}

          {/* Gambar sendiri */}
          <button
            type="button"
            onClick={() => imageRef.current?.click()}
            disabled={imageBusy}
            title="Pilih gambar"
            className={`relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border transition disabled:opacity-50 ${
              isImage ? ring : `${idle} bg-surface-2 text-ink-soft hover:text-ink`
            }`}
            style={
              isImage
                ? {
                    backgroundImage: `url("${current.imageUrl}")`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : undefined
            }
          >
            {!isImage && <CameraIcon className="h-4 w-4" />}
            <span className="sr-only">Pilih gambar latar</span>
          </button>
        </div>
      </div>

      {/* Animasi */}
      <div>
        <p className="mb-1.5 text-[12px] font-medium text-muted">Animasi</p>
        <div className="flex flex-wrap items-center gap-2">
          {CHAT_ANIMATED_PRESETS.map((preset) => {
            const active = value !== null && current.kind === "animated" && current.id === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onChange({ kind: "animated", id: preset.id })}
                aria-pressed={active}
                title={`${preset.label} · ${preset.hint}`}
                className={`relative h-10 w-10 shrink-0 overflow-hidden rounded-full border transition ${
                  active ? ring : idle
                }`}
                style={{ backgroundImage: animatedSwatch(preset, isDark) }}
              >
                <span aria-hidden="true" className="absolute inset-0 grid place-items-center text-[11px] font-bold text-ink-soft">
                  ▶
                </span>
                <span className="sr-only">{preset.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Video */}
      <div>
        <p className="mb-1.5 text-[12px] font-medium text-muted">Video</p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => videoRef.current?.click()}
            disabled={videoBusy}
            title={isVideo ? "Ganti video latar" : "Pilih video latar"}
            className={`flex h-10 items-center gap-2 overflow-hidden rounded-full border px-2.5 pr-3 text-xs font-medium transition disabled:opacity-50 ${
              isVideo ? `${ring} text-ink` : `${idle} bg-surface-2 text-ink-soft hover:text-ink`
            }`}
          >
            {isVideo && current.posterUrl ? (
              <img
                src={current.posterUrl}
                alt=""
                className="h-6 w-6 shrink-0 rounded-full object-cover"
              />
            ) : (
              <FilmIcon className="h-4 w-4 shrink-0" />
            )}
            <span>{isVideo ? "Ganti video" : "Pilih video"}</span>
          </button>

          {isVideo && (
            <button
              type="button"
              onClick={dropVideo}
              className="text-xs font-medium text-ink-soft transition hover:text-ink"
            >
              Hapus video
            </button>
          )}
        </div>
        <p className="mt-1.5 text-[12px] leading-snug text-muted">
          Klip pendek MP4/WebM (maks {MAX_VIDEO_MB} MB) — misalnya hasil rekaman atau video karakter
          dari Flow. Diputar berulang tanpa suara, dipasang per karakter.
        </p>
        {videoBusy && <p className="mt-1 text-xs text-muted">Memuat video...</p>}
        {note && !videoBusy && <p className="mt-1 text-xs text-ink-soft">{note}</p>}
        {isVideo && videoStatus === "missing" && (
          <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
            Blob videonya tidak ada di perangkat ini — pilih ulang videonya.
          </p>
        )}
      </div>

      <input
        ref={imageRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImage(file);
        }}
      />
      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleVideo(file);
        }}
      />
      <input
        ref={talkingRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleTalkingVideo(file);
        }}
      />

      {imageBusy && <p className="mt-2 text-xs text-muted">Memproses gambar...</p>}
      {error && <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{error}</p>}

      {isImage && (
        <div className="rounded-xl border border-line px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-ink-soft">Redup gambar · {dimPercent}%</span>
            <button
              type="button"
              onClick={() => onChange({ kind: "default" })}
              className="text-xs font-medium text-ink-soft transition hover:text-ink"
            >
              Hapus gambar
            </button>
          </div>
          <input
            type="range"
            min={0}
            max={70}
            step={5}
            value={dimPercent}
            onChange={(e) => setDimDraft(Number(e.target.value))}
            onPointerUp={(e) => commitDim(Number(e.currentTarget.value))}
            onKeyUp={(e) => commitDim(Number(e.currentTarget.value))}
            onBlur={(e) => commitDim(Number(e.currentTarget.value))}
            aria-label="Tingkat peredupan gambar"
            className="mt-2 w-full accent-ink"
          />
        </div>
      )}

      {isVideo && (
        <div className="space-y-2 rounded-xl border border-line px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-ink-soft">Tampilan video</span>
            <div className="flex gap-0.5 rounded-full bg-surface-2 p-0.5">
              {[
                { id: "full" as const, label: "Latar penuh" },
                { id: "tile" as const, label: "Panel atas" },
              ].map((option) => {
                const active = videoLayout === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() =>
                      current.kind === "video" && onChange({ ...current, layout: option.id })
                    }
                    aria-pressed={active}
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
          <p className="text-[12px] leading-snug text-muted">
            {videoLayout === "tile"
              ? "Panel atas: karakter terlihat jelas seperti di video call."
              : "Latar penuh: video memenuhi area chat di belakang pesan."}
          </p>
          <div>
            <span className="text-xs font-medium text-ink-soft">Redup video · {dimPercent}%</span>
            <input
              type="range"
              min={0}
              max={70}
              step={5}
              value={dimPercent}
              onChange={(e) => setDimDraft(Number(e.target.value))}
              onPointerUp={(e) => commitDim(Number(e.currentTarget.value))}
              onKeyUp={(e) => commitDim(Number(e.currentTarget.value))}
              onBlur={(e) => commitDim(Number(e.currentTarget.value))}
              aria-label="Tingkat peredupan video"
              className="mt-1 w-full accent-ink"
            />
          </div>

          <div className="border-t border-line pt-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-ink-soft">Video saat bicara</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => talkingRef.current?.click()}
                  disabled={talkingBusy}
                  className="rounded-full border border-line px-2.5 py-1 text-[12px] font-medium text-ink-soft transition hover:text-ink disabled:opacity-50"
                >
                  {talkingBusy
                    ? "Memuat..."
                    : current.kind === "video" && current.talkingVideoId
                      ? "Ganti"
                      : "Pilih"}
                </button>
                {current.kind === "video" && current.talkingVideoId && (
                  <button
                    type="button"
                    onClick={dropTalkingVideo}
                    className="text-[12px] font-medium text-ink-soft transition hover:text-ink"
                  >
                    Hapus
                  </button>
                )}
              </div>
            </div>
            <p className="mt-1 text-[12px] leading-snug text-muted">
              Opsional — klip ini diputar saat karakter mengetik atau suaranya dibacakan. Tanpa klip
              ini, video utama terus berjalan.
            </p>
          </div>

          <p className="border-t border-line pt-2 text-[12px] leading-snug text-muted">
            Supaya video lebih terlihat di balik pesan, nyalakan <b>Gelembung tembus pandang</b> di
            Setelan → Latar chat.
          </p>
        </div>
      )}

      {value !== null && current.kind === "preset" && (
        <p className="text-xs text-muted">{getPreset(current.id).label}</p>
      )}

      {value !== null && current.kind === "animated" && (
        <p className="text-xs text-muted">
          {getAnimatedPreset(current.id).label} · {getAnimatedPreset(current.id).hint}
        </p>
      )}
    </div>
  );
}
