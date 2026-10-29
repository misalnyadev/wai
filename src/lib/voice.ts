import { useSyncExternalStore } from "react";
import type { VoiceSettings } from "@/types/chat";

/**
 * Suara memakai Web Speech API bawaan browser — gratis, tanpa API key, dan
 * untuk suara lokal tetap jalan tanpa internet. Kualitas & daftar suara
 * tergantung perangkat (iOS Safari punya suara "Damayanti" untuk bahasa
 * Indonesia; Android Chrome memakai mesin TTS sistem).
 *
 * Supaya terdengar natural:
 * 1) teks dipecah per kalimat lalu dibacakan berurutan dengan jeda kecil —
 *    intonasi tiap kalimat jadi wajar dan tidak terpotong di iOS;
 * 2) suara "Enhanced/Premium/Neural" otomatis diprioritaskan;
 * 3) kecepatan sedikit di bawah 1× dan jeda antar kalimat meniru napas.
 */

export const VOICE_PRESETS: {
  id: string;
  label: string;
  hint: string;
  rate: number;
  pitch: number;
}[] = [
  { id: "natural", label: "Natural", hint: "paling seimbang", rate: 0.95, pitch: 1.0 },
  { id: "hangat", label: "Hangat", hint: "lebih pelan & rendah", rate: 0.88, pitch: 0.96 },
  { id: "santai", label: "Santai", hint: "mengalir seperti ngobrol", rate: 0.92, pitch: 1.04 },
  { id: "ceria", label: "Ceria", hint: "lebih cepat & tinggi", rate: 1.04, pitch: 1.1 },
  { id: "jelas", label: "Jelas", hint: "tempo normal", rate: 1, pitch: 1 },
];

export const VOICE_TEST_TEXT =
  "Hai, aku sudah siap menemani percakapanmu hari ini. Mau lanjut dari mana?";

/** Nama suara yang biasanya sudah "neural" / hasil unduhan kualitas tinggi. */
const NATURAL_VOICE = /(natural|neural|enhanced|premium|siri|wavenet|studio)/i;

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Suara ini kemungkinan besar sudah kualitas natural/enhanced. */
export function isNaturalVoice(voice: SpeechSynthesisVoice): boolean {
  return NATURAL_VOICE.test(voice.name ?? "");
}

/** Bersihkan teks balasan agar enak dibacakan (tanpa markdown/emoji). */
export function speakableText(input: string): string {
  return input
    .replace(/\[\[NEXT\]\]/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`#>~|]/g, "")
    .replace(/\s*—\s*/g, ", ")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

const MAX_CHUNK = 190; // batas aman agar tidak dipotong iOS
const MIN_MERGE = 45; // gabungkan kalimat pendek supaya tidak terpatah-patah

/** Pecah teks yang terlalu panjang di batas kata. */
function splitLong(text: string, max: number): string[] {
  if (text.length <= max) return [text];
  const out: string[] = [];
  let current = "";
  for (const word of text.split(" ")) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > max) {
      if (current) out.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) out.push(current);
  return out;
}

/**
 * Pecah teks menjadi potongan kalimat. Potongan pendek digabung supaya alur
 * tetap mengalir, sedangkan teks panjang dipecah agar intonasi tiap kalimat
 * wajar dan tidak terpotong otomatis di iOS.
 */
export function splitSentences(text: string): string[] {
  const parts = text
    .split(/\n+/)
    .flatMap((line) => line.replace(/([.!?…])\s+/g, "$1\u0000").split("\u0000"))
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((part) => splitLong(part, MAX_CHUNK));

  const chunks: string[] = [];
  let buffer = "";
  for (const part of parts) {
    if (!buffer) {
      buffer = part;
      continue;
    }
    const combined = `${buffer} ${part}`;
    if (combined.length <= MIN_MERGE) {
      buffer = combined;
    } else {
      chunks.push(buffer);
      buffer = part;
    }
  }
  if (buffer) chunks.push(buffer);
  return chunks.length ? chunks : [text];
}

/** Skor kualitas: makin tinggi makin diprioritaskan. */
export function voiceScore(voice: SpeechSynthesisVoice): number {
  let score = 0;
  if (isNaturalVoice(voice)) score += 4;
  if (voice.lang?.toLowerCase().startsWith("id")) score += 3;
  if (voice.localService) score += 1;
  if (voice.default) score += 1;
  return score;
}

/** Pilih suara: URI tersimpan → skor tertinggi (Indonesia & natural dulu). */
export function pickVoice(
  voices: SpeechSynthesisVoice[],
  voiceURI: string
): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const exact = voices.find((v) => v.voiceURI === voiceURI);
  if (exact) return exact;
  return [...voices].sort((a, b) => voiceScore(b) - voiceScore(a))[0] ?? null;
}

/** Daftar suara diurutkan: Indonesia + natural lebih dulu. */
export function sortVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return [...voices].sort(
    (a, b) => voiceScore(b) - voiceScore(a) || a.name.localeCompare(b.name)
  );
}

/* Cache daftar suara supaya snapshot React stabil (tidak memicu render loop). */
const EMPTY_VOICES: SpeechSynthesisVoice[] = [];
let voiceCache: SpeechSynthesisVoice[] = EMPTY_VOICES;
let voiceCacheKey = "";

export function getVoicesSnapshot(): SpeechSynthesisVoice[] {
  if (!isSpeechSupported()) return EMPTY_VOICES;
  const list = window.speechSynthesis.getVoices();
  const key = list.map((voice) => voice.voiceURI).join("|");
  if (key !== voiceCacheKey) {
    voiceCacheKey = key;
    voiceCache = list.length ? list : EMPTY_VOICES;
  }
  return voiceCache;
}

export function subscribeVoices(onChange: () => void): () => void {
  if (!isSpeechSupported()) return () => {};
  const synth = window.speechSynthesis;
  synth.addEventListener("voiceschanged", onChange);
  return () => synth.removeEventListener("voiceschanged", onChange);
}

/* ------------------------------------------------------------------ */
/* Pemutaran berurutan (antrean)                                       */
/* ------------------------------------------------------------------ */

let generation = 0;
let chain: Promise<void> = Promise.resolve();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildUtterance(text: string, settings: VoiceSettings): SpeechSynthesisUtterance {
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = pickVoice(window.speechSynthesis.getVoices(), settings.voiceURI);
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = "id-ID";
  }
  utterance.rate = Math.min(1.6, Math.max(0.5, settings.rate || 1));
  utterance.pitch = Math.min(1.6, Math.max(0.5, settings.pitch || 1));
  utterance.volume = Math.min(1, Math.max(0, settings.volume ?? 1));
  return utterance;
}

function speakOne(utterance: SpeechSynthesisUtterance): Promise<void> {
  return new Promise((resolve) => {
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Bacakan teks.
 * - `append: true`  → antrekan setelah ucapan yang sedang berjalan
 *   (dipakai saat karakter mengirim beberapa bubble berturut-turut).
 * - `append: false` → hentikan yang sedang berjalan lalu mulai dari awal
 *   (tombol "Coba suara" & "Bacakan ulang").
 */
export function speak(
  text: string,
  settings: VoiceSettings,
  options: { append?: boolean } = {}
): boolean {
  if (!isSpeechSupported()) return false;
  const clean = speakableText(text);
  if (!clean) return false;

  setSpeakingState(true);

  const chunks = splitSentences(clean);
  const synthetic = window.speechSynthesis;

  if (!options.append) {
    generation += 1;
    synthetic.cancel();
    chain = Promise.resolve();
  }

  const currentGeneration = generation;
  chain = chain.then(async () => {
    for (let i = 0; i < chunks.length; i++) {
      if (currentGeneration !== generation) return;
      await speakOne(buildUtterance(chunks[i], settings));
      if (currentGeneration !== generation) return;
      if (i < chunks.length - 1) await sleep(Math.max(0, settings.pause ?? 150));
    }
    setSpeakingState(false);
  });

  return true;
}

export function stopSpeaking() {
  setSpeakingState(false);
  if (!isSpeechSupported()) return;
  generation += 1;
  chain = Promise.resolve();
  window.speechSynthesis.cancel();
}

/* ------------------------------------------------------------------ */
/* Status "sedang membacakan" — dipakai latar video untuk berganti klip */
/* ------------------------------------------------------------------ */

let speaking = false;
const speakingListeners = new Set<() => void>();

function setSpeakingState(next: boolean) {
  if (speaking === next) return;
  speaking = next;
  for (const listener of speakingListeners) listener();
}

export function subscribeSpeaking(listener: () => void): () => void {
  speakingListeners.add(listener);
  return () => {
    speakingListeners.delete(listener);
  };
}

export function getSpeakingSnapshot(): boolean {
  return speaking;
}

/** true ketika karakter sedang membacakan pesan lewat suara perangkat. */
export function useIsSpeaking(): boolean {
  return useSyncExternalStore(subscribeSpeaking, getSpeakingSnapshot, () => false);
}
