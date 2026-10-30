"use client";

import { readTtsBlob, writeTtsBlob, type TtsCacheEntry } from "./storage";
import { listCachedEntries, mergeCachedEntries } from "./ttsCache";
import { buildVoiceZip, parseVoiceZip, type VoiceItem } from "./ttsArchive";

/**
 * Cadangan bank suara HD — bagian yang menyentuh penyimpanan.
 *
 * Cache suara tinggal di IndexedDB: begitu aplikasi dihapus atau pindah
 * perangkat, semua rekaman hilang dan harus dibuat ulang lewat API. Fungsi di
 * sini mengubahnya menjadi satu berkas ZIP (lihat ttsArchive) dan memulihkan
 * kembali tanpa memanggil API.
 */

export type ExportResult = { blob: Blob | null; count: number; bytes: number };

/** Bungkus seluruh cache jadi satu berkas ZIP. */
export async function exportVoiceZip(): Promise<ExportResult> {
  const entries = await listCachedEntries();
  const items: VoiceItem[] = [];
  let bytes = 0;

  for (const entry of entries) {
    const blob = await readTtsBlob(entry.key).catch(() => undefined);
    if (!blob) continue;
    const data = new Uint8Array(await blob.arrayBuffer());
    if (!data.length) continue;
    items.push({ ...entry, data });
    bytes += data.length;
  }

  if (!items.length) return { blob: null, count: 0, bytes: 0 };
  return { blob: buildVoiceZip(items), count: items.length, bytes };
}

export type ImportResult = { total: number; added: number; dropped: number };

/** Pulihkan klip dari berkas ZIP hasil cadangan. */
export async function importVoiceZip(file: File): Promise<ImportResult> {
  const items = parseVoiceZip(await file.arrayBuffer());
  const restored: TtsCacheEntry[] = [];

  for (const item of items) {
    const blob = new Blob([item.data.slice()], { type: "audio/wav" });
    try {
      await writeTtsBlob(item.key, blob);
    } catch {
      continue;
    }
    restored.push({
      key: item.key,
      bytes: blob.size,
      at: item.at,
      text: item.text,
      voice: item.voice,
      model: item.model,
    });
  }

  const { merged, dropped } = await mergeCachedEntries(restored);
  return { total: restored.length, added: merged, dropped };
}
