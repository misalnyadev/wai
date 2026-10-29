import type { Character, ChatMessage, Provider } from "@/types/chat";

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

export async function getCharacters(): Promise<Character[]> {
  return (await kvGet<Character[]>("characters")) ?? [];
}

export async function saveCharacters(list: Character[]): Promise<void> {
  await kvSet("characters", list);
}

export async function getProviders(): Promise<Provider[]> {
  return (await kvGet<Provider[]>("providers")) ?? [];
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

export const BACKUP_VERSION = 1;

export type BackupData = {
  app: "persona";
  version: number;
  exportedAt: string;
  characters: Character[];
  providers: Provider[];
  messages: Record<string, ChatMessage[]>;
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
    app: "persona",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    characters,
    providers,
    messages,
  };
}

export function isBackupData(value: unknown): value is BackupData {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<BackupData>;
  return (
    v.app === "persona" &&
    Array.isArray(v.characters) &&
    Array.isArray(v.providers) &&
    typeof v.messages === "object" &&
    v.messages !== null
  );
}

/** Timpa seluruh data perangkat dengan isi file cadangan. */
export async function restoreBackup(data: BackupData): Promise<void> {
  await saveCharacters(data.characters);
  await saveProviders(data.providers);
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
