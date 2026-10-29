"use client";

import { useSyncExternalStore } from "react";
import { deleteVideoBlob, genId, getVideoBlob, saveVideoBlob } from "@/lib/storage";

/**
 * Latar video per karakter.
 *
 * Blob video disimpan di IndexedDB (bukan data URL) supaya tidak membengkakkan
 * objek setelan maupun file cadangan. Untuk diputar, blob diubah menjadi
 * object URL sekali per sesi lalu di-cache — jadi berpindah karakter tidak
 * memuat ulang file, tapi juga tidak menahan memori lebih dari yang dipakai.
 */

/** Batas ukuran file. Di atas ini biasanya bukan klip latar lagi. */
export const MAX_VIDEO_MB = 24;
const MAX_VIDEO_BYTES = MAX_VIDEO_MB * 1024 * 1024;

export type ChatVideoImport = {
  videoId: string;
  posterUrl: string;
  /** Durasi dalam detik (0 bila tidak terbaca). */
  duration: number;
};

type Entry = { url: string | null; status: "loading" | "ready" | "error" };

const cache = new Map<string, Entry>();
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeChatVideo(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getChatVideoUrl(videoId: string | null | undefined): string | null {
  if (!videoId) return null;
  return cache.get(videoId)?.url ?? null;
}

/** `missing` = blob sudah tidak ada (mis. setelah memulihkan cadangan). */
export function getChatVideoStatus(videoId: string | null | undefined): "idle" | "loading" | "ready" | "missing" {
  if (!videoId) return "idle";
  const entry = cache.get(videoId);
  if (!entry) return "idle";
  if (entry.status === "ready") return "ready";
  if (entry.status === "loading") return "loading";
  return "missing";
}

/** Muat blob video dari IndexedDB. Aman dipanggil berkali-kali. */
export function ensureChatVideo(videoId: string | null | undefined): void {
  if (!videoId || cache.has(videoId)) return;
  cache.set(videoId, { url: null, status: "loading" });
  getVideoBlob(videoId)
    .then((blob) => {
      if (!blob) {
        cache.set(videoId, { url: null, status: "error" });
        emit();
        return;
      }
      cache.set(videoId, { url: URL.createObjectURL(blob), status: "ready" });
      emit();
    })
    .catch(() => {
      cache.set(videoId, { url: null, status: "error" });
      emit();
    });
}

function primeChatVideo(videoId: string, blob: Blob): void {
  const previous = cache.get(videoId);
  if (previous?.url) URL.revokeObjectURL(previous.url);
  cache.set(videoId, { url: URL.createObjectURL(blob), status: "ready" });
  emit();
}

function forgetChatVideo(videoId: string): void {
  const entry = cache.get(videoId);
  if (entry?.url) URL.revokeObjectURL(entry.url);
  cache.delete(videoId);
  emit();
}

/** Hapus video dari perangkat sekaligus lepaskan object URL-nya. */
export async function removeChatVideo(videoId: string): Promise<void> {
  forgetChatVideo(videoId);
  await deleteVideoBlob(videoId);
}

/* ------------------------------------------------------------------ */
/* Membaca file video: validasi, ambil bingkai pertama, simpan blob     */
/* ------------------------------------------------------------------ */

function seek(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      video.removeEventListener("seeked", done);
      resolve();
    };
    video.addEventListener("seeked", done);
    video.currentTime = time;
    // Jaring pengaman: beberapa browser tidak mengirim `seeked` untuk klip pendek.
    window.setTimeout(done, 900);
  });
}

async function readVideoMeta(file: File): Promise<{ posterUrl: string; duration: number }> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.src = objectUrl;

    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("Video tidak bisa dibaca browser ini."));
      video.load();
    });

    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    // Ambil bingkai sedikit setelah awal supaya tidak kena layar hitam.
    if (duration > 0.2) await seek(video, Math.min(0.6, duration / 4));

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 360;
    const scale = Math.min(1, 960 / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas tidak didukung browser ini.");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return { posterUrl: canvas.toDataURL("image/jpeg", 0.7), duration };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Impor video dari perangkat. Melempar `Error` berpesan Indonesia bila gagal —
 * pemanggil tinggal menampilkan pesannya ke pengguna.
 */
export async function importChatVideo(file: File): Promise<ChatVideoImport> {
  const isVideo = file.type.startsWith("video/") || /\.(mp4|webm|mov|m4v)$/i.test(file.name);
  if (!isVideo) throw new Error("Pilih file video (MP4 atau WebM).");
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error(`Video terlalu besar (${Math.round(file.size / 1024 / 1024)} MB). Maksimal ${MAX_VIDEO_MB} MB — potong dulu jadi klip pendek.`);
  }

  const meta = await readVideoMeta(file);
  const videoId = `vid-${genId()}`;
  await saveVideoBlob(videoId, file);
  primeChatVideo(videoId, file);

  return { videoId, posterUrl: meta.posterUrl, duration: meta.duration };
}

/** URL siap putar untuk sebuah latar video (null selama belum termuat). */
export function useChatVideoUrl(videoId: string | null | undefined): string | null {
  return useSyncExternalStore(
    subscribeChatVideo,
    () => getChatVideoUrl(videoId),
    () => null
  );
}

export function useChatVideoStatus(
  videoId: string | null | undefined
): "idle" | "loading" | "ready" | "missing" {
  return useSyncExternalStore(
    subscribeChatVideo,
    () => getChatVideoStatus(videoId),
    () => "idle" as const
  );
}
