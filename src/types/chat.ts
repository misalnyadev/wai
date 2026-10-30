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
  /**
   * Suara HD dari API (Gemini TTS). Hasilnya disimpan di perangkat, jadi teks
   * yang sama diputar ulang tanpa memanggil API lagi.
   */
  hdEnabled: boolean;
  /** API key Gemini untuk suara HD. Kosong = tetap pakai suara perangkat. */
  hdKey: string;
  /** Nama suara Gemini, mis. "Kore". */
  hdVoice: string;
  /** Arahan gaya bicara, mis. "bicara santai dan hangat". */
  hdStyle: string;
  /** Model TTS Gemini. */
  hdModel: string;
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
  /** Kepekatan gelembung saat mode tembus pandang (20–95%, makin kecil makin bening). */
  bubbleOpacity: number;
  /**
   * Versi gaya gelembung. Dipakai sekali untuk memindahkan pengguna lama ke
   * gelembung tembus pandang tanpa mengubah setelan lain.
   */
  glassVersion?: number;
  /** Suara untuk membacakan balasan. */
  voice: VoiceSettings;
};

/**
 * Media pribadi karakter — semuanya opsional, boleh diisi salah satu saja.
 * Blob-nya disimpan di IndexedDB, bukan di objek ini.
 */
export type CharacterMedia = {
  /** Klip yang tampil di atas pesan selama mengobrol (adegan bicara). */
  chatVideoId?: string;
  chatVideoPosterUrl?: string;
  /** `tile` = panel 16:9 di atas pesan, `full` = memenuhi area chat. */
  chatVideoLayout?: "tile" | "full";
  /** Klip adegan video call. */
  callVideoId?: string;
  callVideoPosterUrl?: string;
  /** Perbesaran klip panggilan (100–200%) untuk memotong bingkai hitam di tepi. */
  callVideoZoom?: number;
  /** Rekaman suara (MP3) untuk panggilan telepon. */
  callAudioId?: string;
  callAudioName?: string;
};

/**
 * Tampilan gelembung pesan untuk satu karakter.
 *
 * Disimpan per karakter (bukan global) karena tiap karakter bisa punya latar
 * video/gambar yang berbeda kecerahannya — warna teks dan warna gelembung
 * perlu bisa disetel agar pesan tetap terbaca di atas latar itu.
 */
export type BubbleStyle = {
  /** Tembus pandang: latar gelembung ikut tembus sehingga latar di belakangnya terlihat. */
  glass: boolean;
  /** Kepekatan gelembung 20–95 (%). Berlaku saat `glass` aktif. */
  opacity: number;
  /** Warna teks gelembung karakter (#rrggbb). null = ikut tema. */
  textColorIn: string | null;
  /** Warna latar gelembung karakter (#rrggbb). null = ikut tema. */
  bgColorIn: string | null;
  /** Warna teks gelembung kamu (#rrggbb). null = ikut tema. */
  textColorOut: string | null;
  /** Warna latar gelembung kamu (#rrggbb). null = ikut tema. */
  bgColorOut: string | null;
  /** @deprecated Versi awal (#73): satu warna untuk kedua sisi. Dibaca lalu dipindahkan. */
  textColor?: string | null;
  /** @deprecated Lihat `textColor`. */
  bgColor?: string | null;
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
  /** Tampilan gelembung pesan khusus karakter ini. null/undefined = ikut setelan global. */
  bubble?: BubbleStyle | null;
  /** Klip video call, suara telepon, dan video saat mengobrol. */
  media?: CharacterMedia | null;
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
  hdEnabled: false,
  hdKey: "",
  hdVoice: "Kore",
  hdStyle: "",
  hdModel: "gemini-3.8-flash-tts",
};

export const DEFAULT_SETTINGS: AppSettings = {
  autoFallback: true,
  chatBackground: { kind: "default" },
  glassBubbles: true,
  bubbleOpacity: 45,
  voice: DEFAULT_VOICE,
};
