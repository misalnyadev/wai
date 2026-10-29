"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { ensureChatVideo, useChatVideoStatus, useChatVideoUrl } from "@/lib/chatVideo";
import { usePrefersReducedMotion } from "@/lib/motion";
import { PlayIcon, SpeakerIcon, SpeakerOffIcon } from "./icons";

type VideoBackgroundProps = {
  videoId: string;
  posterUrl: string;
  dim: number;
  /** Klip pengganti saat karakter "bicara". Kosong = video utama terus berjalan. */
  talkingVideoId?: string;
  talkingPosterUrl?: string;
  /** true saat karakter mengetik atau suaranya sedang dibacakan. */
  talking?: boolean;
};

/**
 * Siapkan elemen <video>: muat blob-nya, putar saat seharusnya, dan rem
 * otomatis ketika tab tidak terlihat (hemat baterai di HP).
 * Mengembalikan URL blob yang siap dipakai sebagai `src`.
 */
function useVideoPlayback(
  ref: RefObject<HTMLVideoElement | null>,
  videoId: string | null,
  shouldPlay: boolean
): string | null {
  const url = useChatVideoUrl(videoId);

  useEffect(() => {
    if (videoId) ensureChatVideo(videoId);
  }, [videoId]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !url) return;
    if (shouldPlay) void el.play().catch(() => {});
    else el.pause();
  }, [ref, url, shouldPlay]);

  useEffect(() => {
    function onVisibilityChange() {
      const el = ref.current;
      if (!el) return;
      if (document.hidden) el.pause();
      else if (shouldPlay) void el.play().catch(() => {});
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [ref, shouldPlay]);

  return url;
}

/** Latar penuh: video memenuhi area chat, di belakang seluruh konten. */
export function ChatVideoBackground({
  videoId,
  posterUrl,
  dim,
  talkingVideoId,
  talkingPosterUrl,
  talking = false,
}: VideoBackgroundProps) {
  const reduced = usePrefersReducedMotion();
  const baseRef = useRef<HTMLVideoElement>(null);
  const talkRef = useRef<HTMLVideoElement>(null);

  // Saat "bicara", klip kedua menimpa klip utama; keduanya diem kalau
  // perangkat memakai mode "Kurangi Gerakan". Kalau blob klip bicara hilang,
  // tetap pakai klip utama supaya latar tidak jadi hitam.
  const talkingStatus = useChatVideoStatus(talkingVideoId ?? null);
  const talkingActive = Boolean(
    talking && talkingVideoId && !reduced && talkingStatus !== "missing"
  );
  const baseUrl = useVideoPlayback(baseRef, videoId, !reduced && !talkingActive);
  const talkUrl = useVideoPlayback(talkRef, talkingVideoId ?? null, talkingActive);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-[#07070a]"
    >
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          talkingActive ? "opacity-0" : "opacity-100"
        }`}
      >
        {posterUrl && (
          <img src={posterUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        {baseUrl && (
          <video
            ref={baseRef}
            src={baseUrl}
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
      </div>

      {talkingActive && (
        <div className="fade-in absolute inset-0">
          {talkingPosterUrl && (
            <img
              src={talkingPosterUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          {talkUrl && (
            <video
              ref={talkRef}
              src={talkUrl}
              poster={talkingPosterUrl || undefined}
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
        </div>
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
  talkingVideoId,
  talkingPosterUrl,
  talking = false,
}: VideoBackgroundProps & { name: string }) {
  const reduced = usePrefersReducedMotion();
  const baseRef = useRef<HTMLVideoElement>(null);
  const talkRef = useRef<HTMLVideoElement>(null);
  const [sound, setSound] = useState(false);
  /** Saat perangkat memakai "Kurangi Gerakan", video boleh diputar manual. */
  const [forcePlay, setForcePlay] = useState(false);

  const talkingStatus = useChatVideoStatus(talkingVideoId ?? null);
  const talkingActive = Boolean(
    talking && talkingVideoId && !reduced && talkingStatus !== "missing"
  );
  const shouldPlay = !reduced || forcePlay;
  const baseUrl = useVideoPlayback(baseRef, videoId, shouldPlay && !talkingActive);
  const talkUrl = useVideoPlayback(talkRef, talkingVideoId ?? null, shouldPlay && talkingActive);
  const status = useChatVideoStatus(videoId);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-line bg-[#07070a] shadow-sm">
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          talkingActive ? "opacity-0" : "opacity-100"
        }`}
      >
        {posterUrl && (
          <img src={posterUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        {baseUrl && (
          <video
            ref={baseRef}
            src={baseUrl}
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
      </div>

      {talkingActive && (
        <div className="fade-in absolute inset-0">
          {talkingPosterUrl && (
            <img
              src={talkingPosterUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          {talkUrl && (
            <video
              ref={talkRef}
              src={talkUrl}
              poster={talkingPosterUrl || undefined}
              muted={!sound}
              loop
              playsInline
              autoPlay
              preload="auto"
              disablePictureInPicture
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
        </div>
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
          {baseUrl && shouldPlay && (
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
