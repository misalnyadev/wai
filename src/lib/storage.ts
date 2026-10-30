import { CHAT_ANIMATED_PRESETS, CHAT_COLOR_PRESETS } from "@/lib/chatBackground";
import {
  DEFAULT_SETTINGS,
  DEFAULT_VOICE,
  EMPTY_PROFILE,
  providerTypeValues,
  type AppSettings,
  type BubbleStyle,
  type Character,
  type CharacterMedia,
  type ChatBackground,
  type ChatMessage,
  type Provider,
  type UserProfile,
} from "@/types/chat";

/**
 * Penyimpanan lokal di browser (IndexedDB).
 * Tidak ada database server — semua chat, karakter, foto, dan API key
 * tersimpan hanya di perangkat ini. Cocok untuk deploy statis + serverless
 * (Vercel) tanpa setup apa pun.
 */

const DB_NAME = "persona-db";
const STORE = "kv";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) {
          req.result.createObjectStore(STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

async function kvGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function kvSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function kvDel(key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Pastikan latar chat yang tersimpan masih valid (mis. preset sudah dihapus
 * atau video sudah tidak ada). Hasil `null` = ikut setelan global.
 */
function sanitizeBackground(background: ChatBackground | null | undefined): ChatBackground | null {
  if (!background) return null;

  if (background.kind === "preset") {
    return CHAT_COLOR_PRESETS.some((p) => p.id === background.id) ? background : { kind: "default" };
  }

  if (background.kind === "animated") {
    return CHAT_ANIMATED_PRESETS.some((p) => p.id === background.id)
      ? background
      : { kind: "default" };
  }

  if (background.kind === "image") {
    if (typeof background.imageUrl !== "string" || !background.imageUrl.startsWith("data:image/")) {
      return { kind: "default" };
    }
    return {
      kind: "image",
      imageUrl: background.imageUrl,
      dim: Math.min(0.7, Math.max(0, Number(background.dim) || 0)),
    };
  }

  if (background.kind === "video") {
    if (typeof background.videoId !== "string" || !background.videoId) return { kind: "default" };
    const poster = (value: unknown) =>
      typeof value === "string" && value.startsWith("data:image/") ? value : "";
    return {
      kind: "video",
      videoId: background.videoId,
      posterUrl: poster(background.posterUrl),
      dim: Math.min(0.7, Math.max(0, Number(background.dim) || 0)),
      layout: background.layout === "tile" ? "tile" : "full",
      talkingVideoId:
        typeof background.talkingVideoId === "string" && background.talkingVideoId
          ? background.talkingVideoId
          : undefined,
      talkingPosterUrl: background.talkingVideoId ? poster(background.talkingPosterUrl) : undefined,
    };
  }

  return { kind: "default" };
}

/** Rapikan media karakter: id harus string terisi, poster harus data:image. */
function sanitizeMedia(media: CharacterMedia | null | undefined): CharacterMedia | null {
  if (!media) return null;
  const id = (value: unknown) => (typeof value === "string" && value ? value : undefined);
  const poster = (value: unknown) =>
    typeof value === "string" && value.startsWith("data:image/") ? value : undefined;
  const next: CharacterMedia = {
    chatVideoId: id(media.chatVideoId),
    chatVideoPosterUrl: poster(media.chatVideoPosterUrl),
    chatVideoLayout: media.chatVideoId
      ? media.chatVideoLayout === "full"
        ? "full"
        : "tile"
      : undefined,
    callVideoId: id(media.callVideoId),
    callVideoPosterUrl: poster(media.callVideoPosterUrl),
    callVideoZoom: media.callVideoId
      ? Math.min(200, Math.max(100, Number(media.callVideoZoom) || 100))
      : undefined,
    callAudioId: id(media.callAudioId),
    callAudioName: id(media.callAudioName),
  };
  return Object.values(next).some(Boolean) ? next : null;
}

/** Warna #rrggbb yang sah, selain itu null (= ikut tema). */
function sanitizeColor(value: unknown): string | null {
  return typeof value === "string" && /^#[\da-f]{6}$/i.test(value.trim())
    ? value.trim().toLowerCase()
    : null;
}

/**
 * Rapikan tampilan gelembung karakter.
 *
 * Versi pertama (#73) hanya punya satu `textColor`/`bgColor` untuk kedua sisi.
 * Sekarang warna dipisah per sisi, jadi nilai lama disalin ke keduanya supaya
 * tampilan yang sudah diatur pengguna tidak berubah.
 */
function sanitizeBubble(bubble: BubbleStyle | null | undefined): BubbleStyle | null {
  if (!bubble) return null;
  const legacyText = sanitizeColor(bubble.textColor);
  const legacyBg = sanitizeColor(bubble.bgColor);
  const next: BubbleStyle = {
    glass: Boolean(bubble.glass),
    opacity: Math.min(95, Math.max(20, Math.round(Number(bubble.opacity) || 70))),
    textColorIn: sanitizeColor(bubble.textColorIn) ?? legacyText,
    bgColorIn: sanitizeColor(bubble.bgColorIn) ?? legacyBg,
    textColorOut: sanitizeColor(bubble.textColorOut) ?? legacyText,
    bgColorOut: sanitizeColor(bubble.bgColorOut) ?? legacyBg,
  };
  const untouched =
    !next.glass &&
    !next.textColorIn &&
    !next.bgColorIn &&
    !next.textColorOut &&
    !next.bgColorOut;
  return untouched ? null : next;
}

/** Karakter lama belum punya latar sendiri — anggap ikut setelan. */
function normalizeCharacter(c: Character): Character {
  return {
    ...c,
    chatBackground: sanitizeBackground(c.chatBackground),
    bubble: sanitizeBubble(c.bubble),
    media: sanitizeMedia(c.media),
  };
}

export async function getCharacters(): Promise<Character[]> {
  const list = (await kvGet<Character[]>("characters")) ?? [];
  return list.map(normalizeCharacter);
}

export async function saveCharacters(list: Character[]): Promise<void> {
  await kvSet("characters", list);
}

/**
 * Data lama belum punya backupKeys — rapikan saat dibaca.
 * Provider dengan tipe yang sudah tidak didukung (mis. Grok/xAI) dibuang.
 */
function normalizeProvider(p: Provider): Provider | null {
  if (!p || !providerTypeValues.includes(p.type)) return null;
  return {
    ...p,
    apiKey: p.apiKey ?? "",
    backupKeys: Array.isArray(p.backupKeys) ? p.backupKeys.filter(Boolean) : [],
  };
}

function cleanProviders(list: Provider[]): Provider[] {
  const normalized = list.map(normalizeProvider).filter((p): p is Provider => p !== null);
  if (!normalized.length) return [];
  const found = normalized.findIndex((p) => p.isDefault);
  const defaultIndex = found >= 0 ? found : 0;
  return normalized.map((p, i) => ({ ...p, isDefault: i === defaultIndex }));
}

export async function getProviders(): Promise<Provider[]> {
  const list = (await kvGet<Provider[]>("providers")) ?? [];
  return cleanProviders(list);
}

export async function getUserProfile(): Promise<UserProfile> {
  const saved = await kvGet<Partial<UserProfile>>("user-profile");
  return saved ? { ...EMPTY_PROFILE, ...saved } : EMPTY_PROFILE;
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await kvSet("user-profile", profile);
}

/** Naikkan angka ini bila gaya gelembung bawaan berubah lagi. */
const GLASS_VERSION = 1;
/** Kepekatan gelembung bawaan — cukup bening sehingga video di belakang tetap terlihat. */
const DEFAULT_BUBBLE_OPACITY = 45;

/** Model suara yang sudah/tengah dipensiunkan Google. */
const LEGACY_TTS_MODELS = new Set([
  "gemini-2.5-flash-preview-tts",
  "gemini-2.5-pro-preview-tts",
  "gemini-3.1-flash-tts-preview",
]);

function normalizeSettings(saved: Partial<AppSettings> | undefined): AppSettings {
  const merged: AppSettings = { ...DEFAULT_SETTINGS, ...(saved ?? {}) };
  const safe: ChatBackground = sanitizeBackground(merged.chatBackground) ?? { kind: "default" };

  const clamp = (value: unknown, min: number, max: number, fallback: number) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  };
  const rawVoice = (merged.voice ?? {}) as Partial<AppSettings["voice"]>;
  const voice = {
    enabled: Boolean(rawVoice.enabled),
    voiceURI: typeof rawVoice.voiceURI === "string" ? rawVoice.voiceURI : "",
    rate: clamp(rawVoice.rate, 0.5, 1.6, DEFAULT_VOICE.rate),
    pitch: clamp(rawVoice.pitch, 0.5, 1.6, DEFAULT_VOICE.pitch),
    volume: clamp(rawVoice.volume, 0, 1, DEFAULT_VOICE.volume),
    pause: clamp(rawVoice.pause, 0, 600, DEFAULT_VOICE.pause),
    hdEnabled: Boolean(rawVoice.hdEnabled),
    hdKey: typeof rawVoice.hdKey === "string" ? rawVoice.hdKey : "",
    hdVoice: typeof rawVoice.hdVoice === "string" && rawVoice.hdVoice ? rawVoice.hdVoice : DEFAULT_VOICE.hdVoice,
    hdStyle: typeof rawVoice.hdStyle === "string" ? rawVoice.hdStyle : "",
    // Model TTS generasi 2.5 dipensiunkan pertengahan November 2026; setelan
    // lama dipindahkan ke model 3.8 supaya suaranya tidak mendadak mati.
    hdModel: LEGACY_TTS_MODELS.has(String(rawVoice.hdModel))
      ? DEFAULT_VOICE.hdModel
      : typeof rawVoice.hdModel === "string" && rawVoice.hdModel
        ? rawVoice.hdModel
        : DEFAULT_VOICE.hdModel,
  };

  // Pengguna lama (setelan tersimpan sebelum gelembung tembus pandang jadi
  // bawaan) dipindahkan sekali ke tampilan baru; setelah itu pilihannya
  // dihormati apa pun isinya.
  const moveToGlass = Boolean(saved) && Number(saved?.glassVersion) !== GLASS_VERSION;

  return {
    ...merged,
    chatBackground: safe,
    glassBubbles: moveToGlass ? true : Boolean(merged.glassBubbles),
    bubbleOpacity: moveToGlass
      ? DEFAULT_BUBBLE_OPACITY
      : clamp(merged.bubbleOpacity, 20, 95, DEFAULT_BUBBLE_OPACITY),
    glassVersion: GLASS_VERSION,
    voice,
  };
}

export async function getSettings(): Promise<AppSettings> {
  const saved = await kvGet<Partial<AppSettings>>("settings");
  return normalizeSettings(saved);
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  // Simpan penanda versi supaya pemindahan gaya gelembung hanya terjadi sekali.
  await kvSet("settings", { ...settings, glassVersion: GLASS_VERSION });
}

export async function saveProviders(list: Provider[]): Promise<void> {
  await kvSet("providers", list);
}

export async function getMessages(characterId: string): Promise<ChatMessage[]> {
  return (await kvGet<ChatMessage[]>(`messages:${characterId}`)) ?? [];
}

export async function saveMessages(characterId: string, list: ChatMessage[]): Promise<void> {
  // Simpan maksimal 500 pesan terakhir agar penyimpanan tetap ringan.
  await kvSet(`messages:${characterId}`, list.slice(-500));
}

export async function deleteCharacterData(characterId: string): Promise<void> {
  await kvDel(`messages:${characterId}`);
}

/* ------------------------------------------------------------------ */
/* Video latar (blob besar — tetap di IndexedDB, bukan data URL)       */
/* ------------------------------------------------------------------ */

export async function saveVideoBlob(videoId: string, blob: Blob): Promise<void> {
  await kvSet(`video:${videoId}`, blob);
}

export async function getVideoBlob(videoId: string): Promise<Blob | undefined> {
  return kvGet<Blob>(`video:${videoId}`);
}

export async function deleteVideoBlob(videoId: string): Promise<void> {
  await kvDel(`video:${videoId}`);
}

export async function saveAudioBlob(audioId: string, blob: Blob): Promise<void> {
  await kvSet(`audio:${audioId}`, blob);
}

export async function getAudioBlob(audioId: string): Promise<Blob | undefined> {
  return kvGet<Blob>(`audio:${audioId}`);
}

export async function deleteAudioBlob(audioId: string): Promise<void> {
  await kvDel(`audio:${audioId}`);
}

/* ------------------------------------------------------------------ */
/* Cache suara HD (hasil TTS API, disimpan supaya tidak minta ulang)   */
/* ------------------------------------------------------------------ */

/** Satu baris catatan cache: kunci, ukuran berkas, dan waktu simpan. */
export type TtsCacheEntry = { key: string; bytes: number; at: number };

const TTS_INDEX = "tts-index";

export async function readTtsBlob(key: string): Promise<Blob | undefined> {
  return kvGet<Blob>(`tts:${key}`);
}

export async function writeTtsBlob(key: string, blob: Blob): Promise<void> {
  await kvSet(`tts:${key}`, blob);
}

export async function removeTtsBlob(key: string): Promise<void> {
  await kvDel(`tts:${key}`);
}

export async function readTtsIndex(): Promise<TtsCacheEntry[]> {
  const list = await kvGet<TtsCacheEntry[]>(TTS_INDEX);
  return Array.isArray(list) ? list : [];
}

export async function writeTtsIndex(list: TtsCacheEntry[]): Promise<void> {
  await kvSet(TTS_INDEX, list);
}

const SEED = [
  {
    name: "Alya Rahmadhani",
    avatarUrl: "/images/char-alya.jpg",
    shortBio: "online",
    personality: `Nama: Alya Rahmadhani, 25 tahun.
Latar belakang: Sahabat dekat sejak masa kuliah teater, sekarang bekerja di agensi kreatif. Dekat secara emosional dengan lawan bicara, sering curhat satu sama lain.
Kepribadian: Hangat, ceria, perhatian, sedikit posesif dan gampang cemburu kalau lawan bicara deket sama orang lain, tapi juga suportif dan pendengar yang baik saat lawan bicara sedang susah.
Gaya bicara: Santai dan ekspresif, suka pakai emoji, kadang ngirim beberapa chat pendek berurutan daripada satu paragraf panjang, sesekali bercanda atau menggoda.
Tujuan latihan: Dipakai untuk latihan chemistry dan dialog adegan drama romantis/persahabatan lewat chat sehari-hari.`,
    greeting: "Heyy!! Akhirnya chat juga 😄 kangen tau ga sih",
  },
  {
    name: "Bima Satria",
    avatarUrl: "/images/char-bima.jpg",
    shortBio: "sibuk",
    personality: `Nama: Bima Satria, 29 tahun.
Latar belakang: Mantan rekan kerja yang sekarang jadi rival dalam proyek yang sama, punya sejarah konflik yang belum selesai dengan lawan bicara.
Kepribadian: Dingin, to the point, sedikit arogan, tapi menyimpan rasa hormat diam-diam terhadap lawan bicara. Gampang tersulut kalau merasa diremehkan, namun tidak gampang menunjukkan emosi secara terbuka.
Gaya bicara: Singkat, tegas, jarang pakai emoji, kalimat pendek dan langsung ke inti, kadang sarkastik.
Tujuan latihan: Dipakai untuk latihan adegan konflik, tensi, dan dialog konfrontatif.`,
    greeting: "Ada apa lagi.",
  },
  {
    name: "Nenek Wulan",
    avatarUrl: "/images/char-wulan.jpg",
    shortBio: "di rumah",
    personality: `Nama: Wulan, 65 tahun, akrab dipanggil "Nenek Wulan".
Latar belakang: Nenek dari lawan bicara, tinggal sendirian di kampung halaman, sangat merindukan cucunya.
Kepribadian: Lembut, bijaksana, penuh kasih sayang, sedikit cerewet soal kesehatan dan makan, suka bercerita masa lalu, mudah terharu.
Gaya bicara: Hangat dan penuh perhatian, pakai bahasa yang agak formal-sederhana khas orang tua, sesekali salah ketik karena belum lancar pakai hp, suka kirim pesan panjang berisi nasihat singkat.
Tujuan latihan: Dipakai untuk latihan dialog emosional keluarga, adegan haru dan nostalgia.`,
    greeting: "Halo nak, lagi apa di sana? Nenek kangen sekali loh sama kamu",
  },
];

/* ------------------------------------------------------------------ */
/* Cadangan (backup) & pemulihan data                                  */
/* ------------------------------------------------------------------ */

export const BACKUP_VERSION = 2;

export type BackupData = {
  app: "waichat" | "persona";
  version: number;
  exportedAt: string;
  characters: Character[];
  providers: Provider[];
  messages: Record<string, ChatMessage[]>;
  profile?: UserProfile;
  settings?: AppSettings;
};

/** Kumpulkan seluruh data perangkat menjadi satu objek JSON. */
export async function buildBackup(): Promise<BackupData> {
  const characters = await getCharacters();
  const providers = await getProviders();
  const messages: Record<string, ChatMessage[]> = {};
  for (const c of characters) {
    messages[c.id] = await getMessages(c.id);
  }
  return {
    app: "waichat",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    characters,
    providers,
    messages,
    profile: await getUserProfile(),
    settings: await getSettings(),
  };
}

export function isBackupData(value: unknown): value is BackupData {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<BackupData>;
  return (
    (v.app === "waichat" || v.app === "persona") &&
    Array.isArray(v.characters) &&
    Array.isArray(v.providers) &&
    typeof v.messages === "object" &&
    v.messages !== null
  );
}

/** Timpa seluruh data perangkat dengan isi file cadangan. */
export async function restoreBackup(data: BackupData): Promise<void> {
  await saveCharacters(data.characters.map(normalizeCharacter));
  await saveProviders(cleanProviders(data.providers));
  if (data.profile) await saveUserProfile({ ...EMPTY_PROFILE, ...data.profile });
  if (data.settings) await saveSettings(normalizeSettings(data.settings));
  for (const character of data.characters) {
    const list = data.messages[character.id] ?? [];
    if (list.length) await saveMessages(character.id, list);
    else await kvDel(`messages:${character.id}`);
  }
  await kvSet("initialized", true);
}

/** Hapus semua data aplikasi di perangkat ini (chat, karakter, API key). */
export async function wipeAll(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Muat semua data; isi karakter contoh saat pertama kali dibuka. */
export async function loadAll(): Promise<{ characters: Character[]; providers: Provider[] }> {
  const initialized = await kvGet<boolean>("initialized");
  const providers = await getProviders();

  if (initialized) {
    return { characters: await getCharacters(), providers };
  }

  const now = Date.now();
  const characters: Character[] = [];

  for (let i = 0; i < SEED.length; i++) {
    const s = SEED[i];
    const id = genId();
    const createdAt = new Date(now - i * 60_000).toISOString();
    characters.push({
      id,
      name: s.name,
      avatarUrl: s.avatarUrl,
      shortBio: s.shortBio,
      personality: s.personality,
      greeting: s.greeting,
      providerId: null,
      model: null,
      preview: s.greeting,
      createdAt,
      updatedAt: createdAt,
    });
    await saveMessages(id, [
      {
        id: genId(),
        role: "assistant",
        content: s.greeting,
        imageUrl: null,
        createdAt,
      },
    ]);
  }

  await saveCharacters(characters);
  await kvSet("initialized", true);
  return { characters, providers };
}
