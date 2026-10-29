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
import { fileToDataUrl } from "@/lib/imageClient";
import { getIsDarkSnapshot, subscribeTheme } from "@/lib/theme";
import { CameraIcon } from "./icons";

/**
 * Pemilih latar area chat: warna, gambar sendiri, atau animasi.
 * `value === null` berarti "ikut setelan" (dipakai di latar per karakter).
 *
 * Video tidak lagi dipilih di sini — klip video (video call, video saat chat,
 * suara telepon) diatur di halaman karakter lewat bagian "Media karakter".
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Nilai sementara slider peredupan — disimpan saat jari dilepas. */
  const [dimDraft, setDimDraft] = useState<number | null>(null);
  const isDark = useSyncExternalStore(subscribeTheme, getIsDarkSnapshot, () => false);

  const current: ChatBackground = value ?? { kind: "default" };
  const isImage = value !== null && current.kind === "image";
  const isLegacyVideo = value !== null && current.kind === "video";

  const dimPercent =
    dimDraft ??
    Math.round((current.kind === "image" || current.kind === "video" ? current.dim : 0.25) * 100);

  async function handleImage(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Pilih file gambar.");
      return;
    }
    setBusy(true);
    try {
      const imageUrl = await fileToDataUrl(file, 1600, 0.72);
      setDimDraft(null);
      onChange({ kind: "image", imageUrl, dim: 0.25 });
    } catch {
      setError("Gagal membaca gambar. Coba file lain.");
    } finally {
      setBusy(false);
      if (imageRef.current) imageRef.current.value = "";
    }
  }

  function commitDim(percent: number) {
    if (current.kind !== "image") return;
    setDimDraft(null);
    onChange({ kind: "image", imageUrl: current.imageUrl, dim: percent / 100 });
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
            disabled={busy}
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

      {/* Latar video lama: masih bisa ditampilkan, tinggal dihapus */}
      {isLegacyVideo && current.kind === "video" && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2">
          <span className="min-w-0 truncate text-xs text-ink-soft">
            Latar video aktif. Untuk klip karakter, pakai bagian <b>Media karakter</b>.
          </span>
          <button
            type="button"
            onClick={() => onChange({ kind: "default" })}
            className="shrink-0 text-xs font-medium text-ink-soft transition hover:text-ink"
          >
            Hapus
          </button>
        </div>
      )}

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

      {busy && <p className="mt-2 text-xs text-muted">Memproses gambar...</p>}
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
