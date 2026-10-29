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

/** Latar area chat: bawaan tema, warna pilihan, atau gambar sendiri. */
export type ChatBackground =
  | { kind: "default" }
  | { kind: "preset"; id: string }
  | { kind: "image"; imageUrl: string; dim: number };

export type AppSettings = {
  /** Pindah otomatis ke provider lain saat semua key provider ini gagal. */
  autoFallback: boolean;
  /** Latar area percakapan. */
  chatBackground: ChatBackground;
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

export const DEFAULT_SETTINGS: AppSettings = {
  autoFallback: true,
  chatBackground: { kind: "default" },
};
