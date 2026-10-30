"use client";

import {
  readTtsBlob,
  readTtsIndex,
  removeTtsBlob,
  writeTtsBlob,
  writeTtsIndex,
  type TtsCacheEntry,
} from "./storage";

/**
 * Cache suara HD di perangkat.
 *
 * Hasil TTS dari API disimpan sebagai blob di IndexedDB dengan kunci turunan
 * dari (model + suara + gaya + teks). Kalau kalimat yang sama muncul lagi —
 * sapaan, celetukan, kalimat yang sering diulang karakter — audio diputar
 * langsung tanpa memanggil API lagi: lebih cepat dan tidak memakan kuota.
 */

/** Batas cache supaya perangkat tidak penuh. Yang tertua dibuang lebih dulu. */
const MAX_ENTRIES = 500;
const MAX_BYTES = 80 * 1024 * 1024;
/** Satu kalimat panjang pun jarang lewat 1 MB; di atas ini jangan disimpan. */
const MAX_ENTRY_BYTES = 3 * 1024 * 1024;

/** Hash FNV-1a 32-bit + panjang teks — cukup unik dan sangat cepat. */
export function ttsKey(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${hash.toString(36)}${input.length.toString(36)}`;
}

let indexPromise: Promise<TtsCacheEntry[]> | null = null;

function loadIndex(): Promise<TtsCacheEntry[]> {
  if (!indexPromise) indexPromise = readTtsIndex().catch(() => []);
  return indexPromise;
}

async function saveIndex(list: TtsCacheEntry[]): Promise<void> {
  indexPromise = Promise.resolve(list);
  await writeTtsIndex(list).catch(() => {});
}

export async function getCachedAudio(key: string): Promise<Blob | undefined> {
  return readTtsBlob(key).catch(() => undefined);
}

/** Simpan hasil TTS. Mengembalikan false kalau tidak disimpan (terlalu besar). */
export async function putCachedAudio(key: string, blob: Blob): Promise<boolean> {
  if (blob.size > MAX_ENTRY_BYTES) return false;
  const list = [...(await loadIndex())].filter((e) => e.key !== key);
  list.push({ key, bytes: blob.size, at: Date.now() });

  // Buang yang tertua sampai jumlah & ukuran kembali di bawah batas.
  let total = list.reduce((sum, e) => sum + e.bytes, 0);
  const dropped: string[] = [];
  while (list.length > MAX_ENTRIES || total > MAX_BYTES) {
    const oldest = list.shift();
    if (!oldest) break;
    total -= oldest.bytes;
    dropped.push(oldest.key);
  }

  try {
    await writeTtsBlob(key, blob);
  } catch {
    return false;
  }
  await saveIndex(list);
  await Promise.all(dropped.map((k) => removeTtsBlob(k).catch(() => {})));
  return true;
}

export type TtsCacheInfo = { count: number; bytes: number };

export async function ttsCacheInfo(): Promise<TtsCacheInfo> {
  const list = await loadIndex();
  return { count: list.length, bytes: list.reduce((sum, e) => sum + e.bytes, 0) };
}

export async function clearTtsCache(): Promise<void> {
  const list = await loadIndex();
  await Promise.all(list.map((e) => removeTtsBlob(e.key).catch(() => {})));
  await saveIndex([]);
}
