"use client";

import { useSyncExternalStore } from "react";
import { deleteAudioBlob, genId, getAudioBlob, saveAudioBlob } from "@/lib/storage";

/**
 * Suara telepon karakter (MP3).
 *
 * Disimpan sebagai blob di IndexedDB lalu diubah menjadi object URL sekali per
 * sesi — sama seperti video — supaya file besar tidak masuk ke objek setelan.
 */

export const MAX_AUDIO_MB = 12;
const MAX_AUDIO_BYTES = MAX_AUDIO_MB * 1024 * 1024;

export type CallAudioImport = {
  audioId: string;
  name: string;
  /** Durasi dalam detik (0 bila tidak terbaca). */
  duration: number;
};

type Entry = { url: string | null; status: "loading" | "ready" | "error" };

const cache = new Map<string, Entry>();
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeCallAudio(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getUrl(audioId: string | null | undefined): string | null {
  if (!audioId) return null;
  return cache.get(audioId)?.url ?? null;
}

export function ensureCallAudio(audioId: string | null | undefined): void {
  if (!audioId || cache.has(audioId)) return;
  cache.set(audioId, { url: null, status: "loading" });
  getAudioBlob(audioId)
    .then((blob) => {
      if (!blob) {
        cache.set(audioId, { url: null, status: "error" });
        emit();
        return;
      }
      cache.set(audioId, { url: URL.createObjectURL(blob), status: "ready" });
      emit();
    })
    .catch(() => {
      cache.set(audioId, { url: null, status: "error" });
      emit();
    });
}

export async function removeCallAudio(audioId: string): Promise<void> {
  const entry = cache.get(audioId);
  if (entry?.url) URL.revokeObjectURL(entry.url);
  cache.delete(audioId);
  emit();
  await deleteAudioBlob(audioId);
}

function readDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    const done = (value: number) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    audio.preload = "metadata";
    audio.onloadedmetadata = () => done(Number.isFinite(audio.duration) ? audio.duration : 0);
    audio.onerror = () => done(0);
    audio.src = url;
    // Jaring pengaman bila metadata tidak pernah datang.
    window.setTimeout(() => done(Number.isFinite(audio.duration) ? audio.duration : 0), 2500);
  });
}

/** Impor rekaman suara untuk panggilan telepon. */
export async function importCallAudio(file: File): Promise<CallAudioImport> {
  const isAudio = file.type.startsWith("audio/") || /\.(mp3|m4a|aac|ogg|wav)$/i.test(file.name);
  if (!isAudio) throw new Error("Pilih file suara (MP3).");
  if (file.size > MAX_AUDIO_BYTES) {
    throw new Error(
      `File suara terlalu besar (${Math.round(file.size / 1024 / 1024)} MB). Maksimal ${MAX_AUDIO_MB} MB.`
    );
  }

  const duration = await readDuration(file);
  const audioId = `aud-${genId()}`;
  await saveAudioBlob(audioId, file);
  cache.set(audioId, { url: URL.createObjectURL(file), status: "ready" });
  emit();

  return { audioId, name: file.name, duration };
}

/** URL siap putar untuk suara telepon (null selama belum termuat). */
export function useCallAudioUrl(audioId: string | null | undefined): string | null {
  return useSyncExternalStore(
    subscribeCallAudio,
    () => getUrl(audioId),
    () => null
  );
}
