export const providerTypeValues = ["gemini", "groq", "openrouter", "custom"] as const;

export type ProviderType = (typeof providerTypeValues)[number];

export type Provider = {
  id: string;
  type: ProviderType;
  label: string;
  /** Key utama — selalu dipakai lebih dulu. */
  apiKey: string;
  /** Key cadangan: otomatis dicoba saat key sebelumnya kena limit/error. */
  backupKeys: string[];
  baseUrl: string | null;
  model: string;
  isDefault: boolean;
};

/** Profil pemilik aplikasi. Karakter membaca ini supaya tahu sedang chat dengan siapa. */
export type UserProfile = {
  name: string;
  nickname: string;
  age: string;
  occupation: string;
  bio: string;
  avatarUrl: string | null;
  updatedAt: string;
};

/** Pengaturan suara lokal (Web Speech API di browser perangkat). */
export type VoiceSettings = {
  /** Bacakan balasan karakter secara otomatis. */
  enabled: boolean;
  /** URI suara pilihan; kosong = pilih otomatis (utamakan bahasa Indonesia). */
  voiceURI: string;
  /** Kecepatan bicara 0.6–1.5. */
  rate: number;
  /** Nada suara 0.6–1.4. */
  pitch: number;
  /** Volume 0–1. */
  volume: number;
  /** Jeda antar kalimat (ms) — bikin terdengar seperti mengambil napas. */
  pause: number;
};

/** Latar area chat: bawaan tema, warna, gambar sendiri, animasi, atau video. */
export type ChatBackground =
  | { kind: "default" }
  | { kind: "preset"; id: string }
  | { kind: "image"; imageUrl: string; dim: number }
  | { kind: "animated"; id: string }
  | {
      kind: "video";
      /** Kunci blob video di IndexedDB (blob-nya tidak disimpan di objek ini). */
      videoId: string;
      /** Bingkai pertama sebagai gambar pembuka & pratinjau pemilih. */
      posterUrl: string;
      dim: number;
      /** `full` = memenuhi area chat, `tile` = panel 16:9 di atas pesan. */
      layout?: "full" | "tile";
      /** Klip pengganti saat karakter "bicara" (mengetik / suaranya dibacakan). */
      talkingVideoId?: string;
      talkingPosterUrl?: string;
    };

export type AppSettings = {
  /** Pindah otomatis ke provider lain saat semua key provider ini gagal. */
  autoFallback: boolean;
  /** Latar area percakapan. */
  chatBackground: ChatBackground;
  /** Gelembung pesan tembus pandang supaya latar (video/gambar) terlihat di baliknya. */
  glassBubbles: boolean;
  /** Suara untuk membacakan balasan. */
  voice: VoiceSettings;
};

export type Character = {
  id: string;
  name: string;
  avatarUrl: string | null;
  shortBio: string;
  personality: string;
  greeting: string;
  providerId: string | null;
  model: string | null;
  /** Latar khusus karakter ini. null/undefined = ikut setelan global. */
  chatBackground?: ChatBackground | null;
  preview: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl: string | null;
  createdAt: string;
  pending?: boolean;
};

export const EMPTY_PROFILE: UserProfile = {
  name: "",
  nickname: "",
  age: "",
  occupation: "",
  bio: "",
  avatarUrl: null,
  updatedAt: "",
};

export const DEFAULT_VOICE: VoiceSettings = {
  enabled: false,
  voiceURI: "",
  rate: 0.97,
  pitch: 1.0,
  volume: 1,
  pause: 150,
};

export const DEFAULT_SETTINGS: AppSettings = {
  autoFallback: true,
  chatBackground: { kind: "default" },
  glassBubbles: false,
  voice: DEFAULT_VOICE,
};
