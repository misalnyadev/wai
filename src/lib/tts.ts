"use client";

import type { VoiceSettings } from "@/types/chat";
import { markSpeaking, onStopSpeaking, speak as fallbackSpeak, speakableText } from "./voice";
import { getCachedAudio, putCachedAudio, ttsKey } from "./ttsCache";

/**
 * Suara HD dari API (Gemini TTS) dengan cache di perangkat.
 *
 * Alurnya:
 * 1. Teks dipecah per klausa (bukan per kata) — batas koma/titik membuat
 *    gabungan potongan tetap terdengar wajar, sedangkan potongan pendek
 *    membuat peluang cache-hit jauh lebih besar.
 * 2. Tiap klausa dicari di cache lokal. Yang belum ada diambil dari /api/tts
 *    lalu disimpan, sehingga pemutaran berikutnya instan.
 * 3. Klausa berikutnya mulai diunduh sambil klausa sekarang diputar, jadi jeda
 *    antar kalimat tidak terasa.
 *
 * Sengaja TIDAK memotong per kata: intonasi tiap kata bergantung pada kalimat
 * utuhnya, sehingga tempelan per kata terdengar patah dan robotik.
 */

/** Panjang potongan yang dianggap sehat untuk cache & jeda alami. */
const MIN_PART = 40;
const MAX_PART = 200;

let hdGeneration = 0;
/** Laporan terakhir untuk halaman setelan. */
let lastError: string | null = null;

/** Supaya pemutar ikut berhenti saat "Hentikan" atau bacaan baru dimulai. */
onStopSpeaking(() => stopHd());

export function getLastTtsError(): string | null {
  return lastError;
}

/**
 * Pecah teks menjadi klausa. Dipisah di tanda baca lemah (koma, titik koma,
 * titik dua, em dash) dan kuat (titik, tanya, seru), lalu potongan pendek
 * digabung supaya tidak terpatah-patah.
 */
export function splitClauses(text: string): string[] {
  const clean = speakableText(text);
  if (!clean) return [];

  const raw = clean
    .split(/(?<=[.!?…])\s+|(?<=[,;:])\s+/u)
    .map((part) => part.trim())
    .filter(Boolean);

  const out: string[] = [];
  let buffer = "";
  for (const part of raw) {
    const next = buffer ? `${buffer} ${part}` : part;
    if (next.length > MAX_PART && buffer) {
      // Terlalu panjang bila digabung: tutup potongan sekarang.
      out.push(buffer);
      buffer = part;
    } else if (buffer && buffer.length < MIN_PART) {
      // Potongan pendek menempel ke berikutnya supaya tidak terpatah.
      buffer = next;
    } else {
      if (buffer) out.push(buffer);
      buffer = part;
    }
  }
  if (buffer) out.push(buffer);

  // Sisa yang terlalu panjang dipecah di batas kata.
  const safe: string[] = [];
  for (const part of out) {
    if (part.length <= MAX_PART) {
      safe.push(part);
      continue;
    }
    let current = "";
    for (const word of part.split(" ")) {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length > MAX_PART && current) {
        safe.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) safe.push(current);
  }
  return safe;
}

function cacheKey(part: string, settings: VoiceSettings): string {
  return ttsKey(
    [settings.hdModel, settings.hdVoice, settings.hdStyle.trim(), part].join("|")
  );
}

/** Ambil audio satu klausa: cache dulu, baru API. */
async function audioFor(part: string, settings: VoiceSettings): Promise<Blob | null> {
  const key = cacheKey(part, settings);
  const cached = await getCachedAudio(key);
  if (cached) return cached;

  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: settings.hdKey,
        text: part,
        voice: settings.hdVoice,
        style: settings.hdStyle,
        model: settings.hdModel,
      }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      lastError = data?.error ?? `HTTP ${res.status}`;
      return null;
    }
    const blob = await res.blob();
    if (!blob.size) {
      lastError = "Audio kosong.";
      return null;
    }
    lastError = null;
    await putCachedAudio(key, blob);
    return blob;
  } catch {
    lastError = "Gagal menghubungi server suara.";
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Pemutar audio                                                       */
/* ------------------------------------------------------------------ */

/**
 * Satu elemen <audio> yang dipakai ulang seumur sesi.
 * iOS hanya mengizinkan pemutaran otomatis pada elemen yang pernah
 * "dibuka" oleh sentuhan pengguna — jadi elemen ini dibuka sekali dengan
 * klip hening, lalu src-nya diganti-ganti tanpa membuat elemen baru.
 */
let player: HTMLAudioElement | null = null;
let currentUrl: string | null = null;
/** Menyelesaikan penantian "audio selesai" saat bacaan dihentikan. */
let cancelCurrent: (() => void) | null = null;

function getPlayer(): HTMLAudioElement {
  if (!player) {
    player = new Audio();
    player.preload = "auto";
    player.setAttribute("playsinline", "true");
    player.volume = 1;
  }
  return player;
}

function releaseAudio() {
  cancelCurrent?.();
  cancelCurrent = null;
  if (player) {
    player.onended = null;
    player.onerror = null;
    player.pause();
  }
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
    currentUrl = null;
  }
}

/** Klip WAV berisi nol sampel — untuk membuka izin audio di iOS. */
function silentWavUrl(): string {
  const header = new Uint8Array(44);
  const view = new DataView(header.buffer);
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) header[offset + i] = text.charCodeAt(i);
  };
  ascii(0, "RIFF");
  view.setUint32(4, 36, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 24000, true);
  view.setUint32(28, 48000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, "data");
  view.setUint32(40, 0, true);
  return URL.createObjectURL(new Blob([header], { type: "audio/wav" }));
}

let unlocked = false;

/**
 * Buka izin pemutaran audio pada sentuhan pengguna. Dipanggil otomatis pada
 * sentuhan pertama; kalau dibutuhkan lebih awal, panggil manual.
 */
export function unlockTtsAudio() {
  if (unlocked || typeof window === "undefined") return;
  unlocked = true;
  const el = getPlayer();
  const url = silentWavUrl();
  const volume = el.volume;
  el.volume = 0;
  el.src = url;
  el.play()
    .catch(() => {
      // Safari bisa tetap menolak; percobaan berikutnya memakai klip asli.
    })
    .finally(() => {
      el.volume = volume;
      URL.revokeObjectURL(url);
    });
}

if (typeof document !== "undefined") {
  const onGesture = () => unlockTtsAudio();
  document.addEventListener("touchend", onGesture, true);
  document.addEventListener("click", onGesture, true);
  document.addEventListener("keydown", onGesture, true);
}

/** Putar satu blob; selesai saat audio habis atau dihentikan. */
function playBlob(blob: Blob, generation: number): Promise<void> {
  return new Promise((resolve) => {
    const el = getPlayer();
    releaseAudio();

    currentUrl = URL.createObjectURL(blob);
    el.src = currentUrl;

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      el.onended = null;
      el.onerror = null;
      cancelCurrent = null;
      resolve();
    };
    cancelCurrent = finish;

    el.onended = finish;
    el.onerror = () => {
      lastError = "Audio tidak bisa diputar.";
      finish();
    };

    el.play().catch(() => {
      lastError = "Pemutaran diblokir. Sentuh layar sekali lalu coba lagi.";
      finish();
    });

    // Jaring pengaman kalau peristiwa ended tidak pernah datang.
    const guard = window.setInterval(() => {
      if (settled || generation !== hdGeneration) {
        window.clearInterval(guard);
        if (generation !== hdGeneration) finish();
      }
    }, 250);
    el.addEventListener(
      "ended",
      () => window.clearInterval(guard),
      { once: true }
    );
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** Antrean supaya bubble yang berurutan tidak saling menimpa. */
let hdQueue: Promise<unknown> = Promise.resolve();
/** Berapa bagian yang masih menunggu/berjalan — untuk status "sedang bersuara". */
let hdPending = 0;

/**
 * Bacakan teks dengan suara HD. Mengembalikan false kalau tidak ada satu pun
 * bagian yang berhasil diputar (mis. API key salah), supaya pemanggil bisa
 * jatuh ke suara perangkat.
 */
export function speakHd(
  text: string,
  settings: VoiceSettings,
  options: { append?: boolean; onStart?: () => void } = {}
): Promise<boolean> {
  if (!settings.hdEnabled || !settings.hdKey.trim()) return Promise.resolve(false);
  const parts = splitClauses(text);
  if (!parts.length) return Promise.resolve(false);

  // Bacaan baru menggantikan bacaan lama, kecuali append (beberapa bubble).
  if (!options.append) stopHd();
  const generation = options.append ? hdGeneration : ++hdGeneration;

  hdPending += 1;
  markSpeaking(true);

  const run = async (): Promise<boolean> => {
    let played = 0;
    try {
      if (generation !== hdGeneration) return false;

      // Mulai ambil bagian pertama dan kedua bersamaan supaya tidak menunggu.
      const pending: (Promise<Blob | null> | null)[] = new Array(parts.length).fill(null);
      const ensure = (i: number) => {
        if (!pending[i]) pending[i] = audioFor(parts[i], settings);
        return pending[i] as Promise<Blob | null>;
      };
      ensure(0);
      if (parts.length > 1) ensure(1);

      for (let i = 0; i < parts.length; i++) {
        if (generation !== hdGeneration) return played > 0;
        const blob = await ensure(i);
        if (generation !== hdGeneration) return played > 0;
        if (!blob) break;
        // Siapkan bagian berikutnya sambil yang ini diputar.
        if (i + 2 < parts.length) ensure(i + 2);
        if (i === 0) options.onStart?.();
        await playBlob(blob, generation);
        played += 1;
        if (i < parts.length - 1) await sleep(Math.max(0, settings.pause ?? 120));
      }
    } finally {
      hdPending = Math.max(0, hdPending - 1);
      if (generation === hdGeneration && hdPending === 0) {
        releaseAudio();
        markSpeaking(false);
      }
    }
    return played > 0;
  };

  const result = hdQueue.then(run, run);
  hdQueue = result.catch(() => false);
  return result;
}

/**
 * Frasa pendek yang paling sering muncul di percakapan. Dibuat sekali per
 * karakter, lalu diputar instan dari cache — persis ide "rekam dulu kalimat
 * yang sering diucapkan", tapi per frasa utuh supaya intonasinya tetap wajar.
 */
export const COMMON_PHRASES = [
  "Hai!",
  "Halo.",
  "Iya.",
  "Hmm...",
  "Hehe.",
  "Apa kabar?",
  "Kamu lagi apa?",
  "Aku kangen kamu.",
  "Nanti aku kabari lagi ya.",
  "Maaf ya.",
  "Makasih.",
  "Sampai nanti.",
];

/**
 * Buat & simpan audio untuk daftar frasa tanpa memutarnya. Mengembalikan
 * jumlah frasa yang siap dipakai (baru dibuat atau sudah ada di cache).
 */
export async function prewarmTts(
  phrases: string[],
  settings: VoiceSettings,
  onProgress?: (done: number, total: number) => void
): Promise<number> {
  if (!settings.hdEnabled || !settings.hdKey.trim()) return 0;
  let ready = 0;
  for (let i = 0; i < phrases.length; i++) {
    const blob = await audioFor(phrases[i], settings);
    if (blob) ready += 1;
    onProgress?.(i + 1, phrases.length);
  }
  return ready;
}

/** Hentikan suara HD yang sedang berjalan. */
export function stopHd() {
  hdGeneration += 1;
  hdPending = 0;
  hdQueue = Promise.resolve();
  releaseAudio();
  markSpeaking(false);
}

/**
 * Pintu masuk tunggal untuk membacakan balasan: suara HD kalau aktif dan
 * berhasil, kalau tidak jatuh ke suara perangkat (Web Speech).
 */
/** Jangan biarkan diam lebih lama dari ini sebelum pindah ke suara perangkat. */
const FALLBACK_DELAY = 6000;

export function speakBest(
  text: string,
  settings: VoiceSettings,
  options: { append?: boolean } = {}
): boolean {
  if (!settings.hdEnabled || !settings.hdKey.trim()) {
    // Impor dinamis dihindari supaya bundel tetap satu; speak() ringan saja.
    return fallbackSpeak(text, settings, options);
  }

  let started = false;
  let fellBack = false;
  const useDeviceVoice = () => {
    if (fellBack) return;
    fellBack = true;
    window.clearTimeout(watchdog);
    fallbackSpeak(text, settings, options);
  };

  // Kalau API lambat atau key bermasalah, pembaca tetap bersuara.
  const watchdog = window.setTimeout(() => {
    if (started) return;
    stopHd();
    useDeviceVoice();
  }, FALLBACK_DELAY);

  void speakHd(text, settings, {
    append: options.append,
    onStart: () => {
      started = true;
      window.clearTimeout(watchdog);
    },
  }).then((ok) => {
    window.clearTimeout(watchdog);
    if (ok || started) return;
    const message = getLastTtsError();
    if (message) console.warn("[tts]", message);
    useDeviceVoice();
  });

  return true;
}
