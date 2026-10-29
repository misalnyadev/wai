"use client";

import { useEffect, useRef, useState } from "react";
import { ensureChatVideo, useChatVideoStatus, useChatVideoUrl } from "@/lib/chatVideo";
import { usePrefersReducedMotion } from "@/lib/motion";
import { PlayIcon, SpeakerIcon, SpeakerOffIcon } from "./icons";

type VideoBackgroundProps = {
  videoId: string;
  posterUrl: string;
  dim: number;
};

/**
 * Siapkan elemen <video>: muat blob-nya, putar saat seharusnya, dan rem
 * otomatis ketika tab tidak terlihat (hemat baterai di HP).
 */
function useVideoElement(videoId: string, shouldPlay: boolean) {
  const url = useChatVideoUrl(videoId);
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    ensureChatVideo(videoId);
  }, [videoId]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !url) return;
    if (shouldPlay) void el.play().catch(() => {});
    else el.pause();
  }, [url, shouldPlay]);

  useEffect(() => {
    function onVisibilityChange() {
      const el = ref.current;
      if (!el) return;
      if (document.hidden) el.pause();
      else if (shouldPlay) void el.play().catch(() => {});
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [shouldPlay]);

  return { ref, url };
}

/** Latar penuh: video memenuhi area chat, di belakang seluruh konten. */
export function ChatVideoBackground({ videoId, posterUrl, dim }: VideoBackgroundProps) {
  const reduced = usePrefersReducedMotion();
  const { ref, url } = useVideoElement(videoId, !reduced);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-[#07070a]"
    >
      {posterUrl && (
        <img src={posterUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      {url && (
        <video
          ref={ref}
          src={url}
          poster={posterUrl || undefined}
          muted
          loop
          playsInline
          autoPlay
          preload="auto"
          disablePictureInPicture
          tabIndex={-1}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-black" style={{ opacity: dim }} />
    </div>
  );
}

/** Panel 16:9 di atas pesan — gaya "tile" video call, karakternya kelihatan jelas. */
export function ChatVideoPanel({
  videoId,
  posterUrl,
  dim,
  name,
}: VideoBackgroundProps & { name: string }) {
  const reduced = usePrefersReducedMotion();
  const [sound, setSound] = useState(false);
  /** Saat perangkat memakai "Kurangi Gerakan", video boleh diputar manual. */
  const [forcePlay, setForcePlay] = useState(false);
  const shouldPlay = !reduced || forcePlay;
  const { ref, url } = useVideoElement(videoId, shouldPlay);
  const status = useChatVideoStatus(videoId);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-line bg-[#07070a] shadow-sm">
      {posterUrl && (
        <img src={posterUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      {url && (
        <video
          ref={ref}
          src={url}
          poster={posterUrl || undefined}
          muted={!sound}
          loop
          playsInline
          autoPlay
          preload="auto"
          disablePictureInPicture
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: dim }} />

      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-black/55 to-transparent px-3 pb-6 pt-2">
        <span className="min-w-0 truncate text-xs font-semibold text-white/90">{name}</span>
        <div className="flex shrink-0 items-center gap-1">
          {reduced && !forcePlay && (
            <button
              type="button"
              onClick={() => setForcePlay(true)}
              className="rounded-full bg-black/45 p-1.5 text-white/90 backdrop-blur transition hover:bg-black/65"
              aria-label="Putar video latar"
              title="Putar video"
            >
              <PlayIcon className="h-4 w-4" />
            </button>
          )}
          {url && shouldPlay && (
            <button
              type="button"
              onClick={() => setSound((value) => !value)}
              aria-pressed={sound}
              className="rounded-full bg-black/45 p-1.5 text-white/90 backdrop-blur transition hover:bg-black/65"
              aria-label={sound ? "Matikan suara video" : "Nyalakan suara video"}
              title={sound ? "Matikan suara" : "Nyalakan suara"}
            >
              {sound ? <SpeakerIcon className="h-4 w-4" /> : <SpeakerOffIcon className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {status === "missing" && (
        <div className="absolute inset-0 grid place-items-center bg-black/50 px-4 text-center text-xs text-white/85">
          Video latar tidak ditemukan di perangkat ini — pilih ulang videonya.
        </div>
      )}
    </div>
  );
}
