import type { VoiceSettings } from "@/types/chat";

/**
 * Suara memakai Web Speech API bawaan browser — gratis, tanpa API key, dan
 * untuk suara lokal tetap jalan tanpa internet. Kualitas & daftar suara
 * tergantung perangkat (iOS Safari punya suara "Damayanti" untuk bahasa
 * Indonesia; Android Chrome memakai mesin TTS sistem).
 */

export const VOICE_PRESETS: {
  id: string;
  label: string;
  rate: number;
  pitch: number;
}[] = [
  { id: "natural", label: "Natural", rate: 0.97, pitch: 1.02 },
  { id: "kalem", label: "Kalem", rate: 0.88, pitch: 0.94 },
  { id: "ceria", label: "Ceria", rate: 1.08, pitch: 1.14 },
  { id: "jelas", label: "Jelas", rate: 1, pitch: 1 },
];

export const VOICE_TEST_TEXT =
  "Hai, aku sudah siap menemani percakapanmu hari ini. Mau lanjut dari mana?";

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
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

/** Bersihkan teks balasan agar enak dibacakan (tanpa markdown/emoji). */
export function speakableText(input: string): string {
  return input
    .replace(/\[\[NEXT\]\]/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`#>~|]/g, "")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Pilih suara sesuai preferensi: URI tersimpan → bahasa Indonesia → default. */
export function pickVoice(
  voices: SpeechSynthesisVoice[],
  voiceURI: string
): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const exact = voices.find((v) => v.voiceURI === voiceURI);
  if (exact) return exact;

  const indonesian = voices.filter((v) => v.lang?.toLowerCase().startsWith("id"));
  const preferred = indonesian.find((v) => v.localService) ?? indonesian[0];
  if (preferred) return preferred;

  return voices.find((v) => v.default) ?? voices[0];
}

/** Bacakan teks. Mengembalikan false bila browser tidak mendukung. */
export function speak(text: string, settings: VoiceSettings): boolean {
  if (!isSpeechSupported()) return false;
  const clean = speakableText(text);
  if (!clean) return false;

  const synth = window.speechSynthesis;
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(clean);
  const voice = pickVoice(synth.getVoices(), settings.voiceURI);
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = "id-ID";
  }
  utterance.rate = Math.min(1.6, Math.max(0.5, settings.rate || 1));
  utterance.pitch = Math.min(1.6, Math.max(0.5, settings.pitch || 1));
  utterance.volume = Math.min(1, Math.max(0, settings.volume ?? 1));
  synth.speak(utterance);
  return true;
}

export function stopSpeaking() {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}
