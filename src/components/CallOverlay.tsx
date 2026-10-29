"use client";

import { useEffect, useState } from "react";
import type { Character, ChatBackground, VoiceSettings } from "@/types/chat";
import { speak, stopSpeaking, useIsSpeaking } from "@/lib/voice";
import { useEscape } from "@/lib/useEscape";
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
 * - `video`: memakai latar video karakter (kalau ada), klip "bicara" ikut aktif
 *   saat karakter bersuara.
 * - `audio`: avatar besar dengan denyut halus.
 * Suara memakai mesin TTS yang sama dengan tombol "bacakan pesan".
 */
export function CallOverlay({
  character,
  mode,
  background,
  voice,
  onClose,
}: {
  character: Character;
  mode: "video" | "audio";
  background?: ChatBackground;
  voice: VoiceSettings;
  onClose: () => void;
}) {
  const [connected, setConnected] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const speaking = useIsSpeaking();

  const video = background?.kind === "video" ? background : null;
  const greeting = (character.greeting?.trim() || `Halo, ini ${character.name}.`).slice(0, 220);

  useEscape(onClose);

  // "Menyambungkan" panggilan sebentar, lalu karakter menyapa dengan suara.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setConnected(true);
      speak(greeting, voice);
    }, CONNECT_DELAY);
    return () => window.clearTimeout(timer);
  }, [greeting, voice]);

  // Penghitung durasi panggilan.
  useEffect(() => {
    if (!connected) return;
    const id = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [connected]);

  // Pastikan suara berhenti saat panggilan ditutup.
  useEffect(() => () => stopSpeaking(), []);

  function toggleMute() {
    if (muted) {
      setMuted(false);
    } else {
      stopSpeaking();
      setMuted(true);
    }
  }

  function endCall() {
    stopSpeaking();
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${mode === "video" ? "Video call" : "Panggilan suara"} dengan ${character.name}`}
      className="fade-in fixed inset-0 z-[65] overflow-hidden bg-[#0a0a0c] text-white"
    >
      {/* Latar: video karakter, atau gradasi gelap + avatar */}
      <div className="absolute inset-0 isolate overflow-hidden">
        {video && mode === "video" ? (
          <ChatVideoBackground
            videoId={video.videoId}
            posterUrl={video.posterUrl}
            dim={Math.max(video.dim ?? 0, 0.12)}
            talkingVideoId={video.talkingVideoId}
            talkingPosterUrl={video.talkingPosterUrl}
            talking={speaking}
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
        </div>

        {mode === "audio" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5">
            <div className="relative">
              {!connected && (
                <span className="absolute inset-0 -m-5 animate-ping rounded-full border border-white/15" />
              )}
              <Avatar name={character.name} src={character.avatarUrl} size={140} />
            </div>
            {speaking && (
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
              aria-label={muted ? "Nyalakan suara karakter" : "Bisukan suara karakter"}
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
    </div>
  );
}
