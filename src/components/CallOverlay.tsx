"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { Character, CharacterMedia, ChatBackground, VoiceSettings } from "@/types/chat";
import { ensureCallAudio, useCallAudioUrl } from "@/lib/callAudio";
import { speak, stopSpeaking, useIsSpeaking } from "@/lib/voice";
import { useEscape } from "@/lib/useEscape";
import { resetStatusBarColor, setStatusBarColor } from "@/lib/theme";
import { Avatar } from "./Avatar";
import { ChatVideoBackground } from "./ChatVideo";
import { CallEndIcon, SpeakerIcon, SpeakerOffIcon } from "./icons";

const CONNECT_DELAY = 1400;

const subscribeNothing = () => () => {};

/** true hanya setelah komponen hidup di browser (aman untuk portal). */
function useIsClient() {
  return useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false
  );
}

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
  onZoomChange,
}: {
  character: Character;
  mode: "video" | "audio";
  background?: ChatBackground;
  media?: CharacterMedia | null;
  voice: VoiceSettings;
  onClose: () => void;
  /** Simpan pembesaran video panggilan supaya dipakai lagi lain kali. */
  onZoomChange?: (zoomPercent: number) => void;
}) {
  const isClient = useIsClient();
  const [connected, setConnected] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  /** true bila browser menolak memutar audio tanpa ketukan pengguna. */
  const [audioBlocked, setAudioBlocked] = useState(false);
  /** true bila autoplay video bersuara ditolak (butuh ketukan pengguna). */
  const [soundBlocked, setSoundBlocked] = useState(false);
  /** Naikkan angka ini untuk mencoba menyalakan suara video lagi. */
  const [soundReplay, setSoundReplay] = useState(0);
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
  // Rekaman telepon & TTS hanya untuk panggilan suara — video call memakai
  // suara dari video itu sendiri (kalau diputar dua-duanya jadi dobel).
  const voiceCall = mode === "audio";
  const hasRecording = Boolean(audioId) && voiceCall;
  const savedZoom = Math.min(200, Math.max(100, media?.callVideoZoom ?? 100));
  const [zoomPercent, setZoomPercent] = useState(savedZoom);
  const zoom = zoomPercent / 100;

  function changeZoom(delta: number) {
    const next = Math.min(200, Math.max(100, zoomPercent + delta));
    if (next === zoomPercent) return;
    setZoomPercent(next);
    onZoomChange?.(next);
  }

  const greeting = (character.greeting?.trim() || `Halo, ini ${character.name}.`).slice(0, 220);

  useEscape(onClose);

  // Warnai area status bar supaya video terlihat sampai tepi atas layar,
  // dan hentikan suara chat yang mungkin masih berjalan.
  useEffect(() => {
    setStatusBarColor("#0a0a0c");
    // Latar body ikut digelapkan supaya tidak ada sisa warna terang di tepi.
    const previousBody = document.body.style.backgroundColor;
    document.body.style.backgroundColor = "#0a0a0c";
    stopSpeaking();
    return () => {
      resetStatusBarColor();
      document.body.style.backgroundColor = previousBody;
    };
  }, []);

  useEffect(() => {
    if (audioId && voiceCall) ensureCallAudio(audioId);
  }, [audioId, voiceCall]);

  // "Menyambungkan" panggilan sebentar, lalu karakter menyapa.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setConnected(true);
      // Hanya panggilan suara: rekaman MP3 diputar oleh <audio>, dan bila tidak
      // ada rekaman pakai suara perangkat. Video call pakai suara videonya.
      if (voiceCall && !hasRecording) speak(greeting, voice);
    }, CONNECT_DELAY);
    return () => window.clearTimeout(timer);
  }, [greeting, voice, hasRecording, voiceCall]);

  // Putar rekaman suara telepon begitu tersambung (dan ikuti tombol bisukan).
  useEffect(() => {
    const el = audioRef.current;
    if (!connected || !audioUrl || !el || !voiceCall) return;
    el.muted = muted;
    void el.play().catch(() => setAudioBlocked(true));
  }, [connected, audioUrl, muted, voiceCall]);

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
    setSoundBlocked(false);
    // Ketukan pengguna = izin autoplay bersuara; coba putar ulang video.
    if (!next) setSoundReplay((value) => value + 1);
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

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${mode === "video" ? "Video call" : "Panggilan suara"} dengan ${character.name}`}
      className="fade-in fixed inset-0 z-[80] w-full overflow-hidden bg-[#0a0a0c] text-white"
    >
      {/* Latar: klip video call karakter, atau gradasi gelap */}
      <div className="absolute inset-0 isolate overflow-hidden">
        {video && mode === "video" ? (
          <ChatVideoBackground
            videoId={video.videoId}
            posterUrl={video.posterUrl}
            dim={0.08}
            sound={!muted}
            zoom={zoom}
            onSoundBlocked={() => setSoundBlocked(true)}
            replayKey={soundReplay}
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,#1d1d24,#0a0a0c_72%)]" />
        )}
      </div>

      {mode === "video" && video && (
        <div
          className="absolute right-3 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-0.5 rounded-full bg-black/40 px-1 py-1.5 text-white ring-1 ring-white/15 backdrop-blur"
          aria-label="Ukuran video panggilan"
        >
          <button
            type="button"
            onClick={() => changeZoom(-5)}
            disabled={zoomPercent <= 100}
            aria-label="Perkecil video panggilan"
            className="flex h-7 w-7 items-center justify-center rounded-full text-lg leading-none transition hover:bg-white/15 disabled:opacity-35"
          >
            −
          </button>
          <span className="min-w-[3.2ch] text-center text-[11px] font-semibold tabular-nums">
            {zoomPercent}%
          </span>
          <button
            type="button"
            onClick={() => changeZoom(5)}
            disabled={zoomPercent >= 200}
            aria-label="Perbesar video panggilan"
            className="flex h-7 w-7 items-center justify-center rounded-full text-lg leading-none transition hover:bg-white/15 disabled:opacity-35"
          >
            +
          </button>
        </div>
      )}

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
          {mode === "video" && video && soundBlocked && !muted && (
            <button
              type="button"
              onClick={() => {
                setSoundBlocked(false);
                setSoundReplay((value) => value + 1);
              }}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-semibold text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/25 active:scale-95"
            >
              <SpeakerOffIcon className="h-4 w-4" />
              Ketuk untuk menyalakan suara
            </button>
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

      {audioUrl && voiceCall && (
        <audio ref={audioRef} src={audioUrl} preload="auto" className="hidden" />
      )}
    </div>
  );

  // Portal ke <body> supaya layar panggilan benar-benar di atas segalanya —
  // tidak terpotong status bar, app-shell, atau stacking context mana pun.
  if (!isClient) return null;
  return createPortal(content, document.body);
}
