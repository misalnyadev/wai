"use client";

import { useEffect, useRef, useState } from "react";
import type { Character, CharacterMedia, ChatBackground, VoiceSettings } from "@/types/chat";
import { ensureCallAudio, useCallAudioUrl } from "@/lib/callAudio";
import { speak, stopSpeaking, useIsSpeaking } from "@/lib/voice";
import { useEscape } from "@/lib/useEscape";
import { resetStatusBarColor, setStatusBarColor } from "@/lib/theme";
import { Avatar } from "./Avatar";
import { ChatVideoBackground } from "./ChatVideo";
import { CallEndIcon, SpeakerIcon, SpeakerOffIcon } from "./icons";

const CONNECT_DELAY = 1400;

function formatDuration(total: number) {
  const minutes = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (total % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

/**
 * Layar panggilan ala WhatsApp.
 * - `video`: memutar klip "video video call" milik karakter (kalau ada), dengan
 *   suara video aktif bila browser mengizinkan.
 * - `audio`: memutar rekaman MP3 karakter (kalau ada); tanpa MP3 memakai TTS.
 */
export function CallOverlay({
  character,
  mode,
  background,
  media,
  voice,
  onClose,
}: {
  character: Character;
  mode: "video" | "audio";
  background?: ChatBackground;
  media?: CharacterMedia | null;
  voice: VoiceSettings;
  onClose: () => void;
}) {
  const [connected, setConnected] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  /** true bila browser menolak memutar audio tanpa ketukan pengguna. */
  const [audioBlocked, setAudioBlocked] = useState(false);
  const speaking = useIsSpeaking();
  const audioRef = useRef<HTMLAudioElement>(null);

  // Klip video call khusus karakter, atau jatuh ke latar video lama.
  const video = media?.callVideoId
    ? { videoId: media.callVideoId, posterUrl: media.callVideoPosterUrl ?? "" }
    : background?.kind === "video"
      ? { videoId: background.videoId, posterUrl: background.posterUrl }
      : null;

  const audioId = media?.callAudioId ?? null;
  const audioUrl = useCallAudioUrl(audioId);
  const hasRecording = Boolean(audioId);

  const greeting = (character.greeting?.trim() || `Halo, ini ${character.name}.`).slice(0, 220);

  useEscape(onClose);

  // Warnai area status bar supaya video terlihat sampai tepi atas layar.
  useEffect(() => {
    setStatusBarColor("#0a0a0c");
    return () => resetStatusBarColor();
  }, []);

  useEffect(() => {
    if (audioId) ensureCallAudio(audioId);
  }, [audioId]);

  // "Menyambungkan" panggilan sebentar, lalu karakter menyapa.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setConnected(true);
      // Rekaman MP3 diputar oleh <audio>; tanpa rekaman pakai suara perangkat.
      if (!hasRecording) speak(greeting, voice);
    }, CONNECT_DELAY);
    return () => window.clearTimeout(timer);
  }, [greeting, voice, hasRecording]);

  // Putar rekaman suara telepon begitu tersambung (dan ikuti tombol bisukan).
  useEffect(() => {
    const el = audioRef.current;
    if (!connected || !audioUrl || !el) return;
    el.muted = muted;
    void el.play().catch(() => setAudioBlocked(true));
  }, [connected, audioUrl, muted]);

  // Penghitung durasi panggilan.
  useEffect(() => {
    if (!connected) return;
    const id = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [connected]);

  // Pastikan semua suara berhenti saat panggilan ditutup.
  useEffect(() => () => stopSpeaking(), []);

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    setAudioBlocked(false);
    const el = audioRef.current;
    if (el) {
      el.muted = next;
      // Dipanggil dari ketukan pengguna → browser mengizinkan suara.
      if (!next) void el.play().catch(() => setAudioBlocked(true));
    }
    if (next) stopSpeaking();
  }

  function endCall() {
    stopSpeaking();
    const el = audioRef.current;
    if (el) el.pause();
    onClose();
  }

  const showWave = connected && !muted && (speaking || (hasRecording && mode === "audio"));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${mode === "video" ? "Video call" : "Panggilan suara"} dengan ${character.name}`}
      className="fade-in fixed inset-0 z-[65] overflow-hidden bg-[#0a0a0c] text-white"
    >
      {/* Latar: klip video call karakter, atau gradasi gelap */}
      <div className="absolute inset-0 isolate overflow-hidden">
        {video && mode === "video" ? (
          <ChatVideoBackground
            videoId={video.videoId}
            posterUrl={video.posterUrl}
            dim={0.08}
            talkingVideoId={media?.callVideoId ? undefined : media?.chatVideoId}
            talking={speaking}
            sound={!muted}
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,#1d1d24,#0a0a0c_72%)]" />
        )}
      </div>

      <div className="relative flex h-full flex-col justify-between px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
            {mode === "video" ? "Video call" : "Panggilan suara"}
          </p>
          <h2 className="mt-1 text-lg font-semibold drop-shadow">{character.name}</h2>
          <p className="mt-0.5 text-[13px] text-white/65">
            {connected ? `Tersambung · ${formatDuration(seconds)}` : "Memanggil..."}
          </p>
          {audioBlocked && (
            <p className="mt-1 text-[12px] text-white/55">
              Ketuk ikon suara untuk menyalakan audio.
            </p>
          )}
        </div>

        {mode === "audio" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5">
            <div className="relative">
              {!connected && (
                <span className="absolute inset-0 -m-5 animate-ping rounded-full border border-white/15" />
              )}
              <Avatar name={character.name} src={character.avatarUrl} size={140} />
            </div>
            {showWave && (
              <div className="flex items-end gap-1" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className="w-1 animate-pulse rounded-full bg-white/70"
                    style={{ height: 6 + (i % 3) * 6, animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            {!video && (
              <div className="relative">
                {!connected && (
                  <span className="absolute inset-0 -m-5 animate-ping rounded-full border border-white/15" />
                )}
                <Avatar name={character.name} src={character.avatarUrl} size={140} />
              </div>
            )}
          </div>
        )}

        <div className="flex items-start justify-center gap-8">
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={toggleMute}
              aria-pressed={muted}
              aria-label={muted ? "Nyalakan suara panggilan" : "Bisukan panggilan"}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25 active:scale-95"
            >
              {muted ? <SpeakerOffIcon className="h-6 w-6" /> : <SpeakerIcon className="h-6 w-6" />}
            </button>
            <span className="text-[11px] text-white/60">{muted ? "Nyalakan" : "Bisukan"}</span>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={endCall}
              aria-label="Akhiri panggilan"
              className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#0a0a0c] shadow-lg transition hover:bg-white/90 active:scale-95"
            >
              <CallEndIcon className="h-6 w-6" />
            </button>
            <span className="text-[11px] text-white/60">Akhiri</span>
          </div>
        </div>
      </div>

      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} preload="auto" className="hidden" />
      )}
    </div>
  );
}
