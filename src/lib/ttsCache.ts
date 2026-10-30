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
 *
 * Tiap baris juga menyimpan teks kalimatnya supaya daftar rekaman bisa
 * dibaca, diputar ulang, dan dicadangkan ke berkas ZIP.
 */

/** Batas cache supaya perangkat tidak penuh. Yang tertua dibuang lebih dulu. */
export const MAX_ENTRIES = 500;
export const MAX_BYTES = 80 * 1024 * 1024;
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

/** Buang yang tertua sampai jumlah & ukuran kembali di bawah batas. */
function trim(list: TtsCacheEntry[]): { kept: TtsCacheEntry[]; dropped: string[] } {
  const kept = [...list];
  const dropped: string[] = [];
  let total = kept.reduce((sum, e) => sum + e.bytes, 0);
  while (kept.length > MAX_ENTRIES || total > MAX_BYTES) {
    const oldest = kept.shift();
    if (!oldest) break;
    total -= oldest.bytes;
    dropped.push(oldest.key);
  }
  return { kept, dropped };
}

export type AudioMeta = { text?: string; voice?: string; model?: string };

/** Simpan hasil TTS. Mengembalikan false kalau tidak disimpan (terlalu besar). */
export async function putCachedAudio(
  key: string,
  blob: Blob,
  meta: AudioMeta = {}
): Promise<boolean> {
  if (blob.size > MAX_ENTRY_BYTES) return false;
  const list = [...(await loadIndex())].filter((e) => e.key !== key);
  list.push({
    key,
    bytes: blob.size,
    at: Date.now(),
    text: meta.text,
    voice: meta.voice,
    model: meta.model,
  });

  const { kept, dropped } = trim(list);

  try {
    await writeTtsBlob(key, blob);
  } catch {
    return false;
  }
  await saveIndex(kept);
  await Promise.all(dropped.map((k) => removeTtsBlob(k).catch(() => {})));
  return true;
}

/** Semua klip yang tersimpan, yang terbaru di atas. */
export async function listCachedEntries(): Promise<TtsCacheEntry[]> {
  const list = await loadIndex();
  return [...list].sort((a, b) => b.at - a.at);
}

export type TtsCacheInfo = { count: number; bytes: number };

export async function ttsCacheInfo(): Promise<TtsCacheInfo> {
  const list = await loadIndex();
  return { count: list.length, bytes: list.reduce((sum, e) => sum + e.bytes, 0) };
}

/** Isi teks untuk klip lama yang belum punya keterangan. */
export async function setEntryText(key: string, text: string): Promise<void> {
  const list = await loadIndex();
  let changed = false;
  const next = list.map((entry) => {
    if (entry.key !== key || entry.text) return entry;
    changed = true;
    return { ...entry, text };
  });
  if (changed) await saveIndex(next);
}

/**
 * Gabungkan catatan dari cadangan ke cache yang ada.
 *
 * Yang sudah ada dibiarkan (kecuali klip lama tanpa teks — itu diisi dari
 * cadangan), lalu batas jumlah/ukuran tetap ditegakkan supaya perangkat tidak
 * penuh setelah memulihkan berkas besar.
 */
export async function mergeCachedEntries(incoming: TtsCacheEntry[]): Promise<{
  merged: number;
  dropped: number;
}> {
  const current = await loadIndex();
  const byKey = new Map(current.map((e) => [e.key, e]));
  let merged = 0;

  for (const entry of incoming) {
    const existing = byKey.get(entry.key);
    if (existing) {
      if (!existing.text && entry.text) byKey.set(entry.key, { ...existing, text: entry.text });
      continue;
    }
    if (!(await readTtsBlob(entry.key).catch(() => undefined))) continue;
    byKey.set(entry.key, entry);
    merged += 1;
  }

  // Urutkan dari yang paling tua supaya batas cache membuang yang benar.
  const { kept, dropped } = trim([...byKey.values()].sort((a, b) => a.at - b.at));
  await saveIndex(kept);
  await Promise.all(dropped.map((k) => removeTtsBlob(k).catch(() => {})));
  return { merged, dropped: dropped.length };
}

export async function clearTtsCache(): Promise<void> {
  const list = await loadIndex();
  await Promise.all(list.map((e) => removeTtsBlob(e.key).catch(() => {})));
  await saveIndex([]);
}
