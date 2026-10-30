"use client";

import { readZip, writeZip, type ZipInput } from "./zip";

/**
 * Bentuk berkas cadangan bank suara HD.
 *
 * Isinya satu ZIP: `manifest.json` berisi daftar kalimat, dan `audio/*.wav`
 * berisi suara aslinya. Modul ini sengaja tidak menyentuh IndexedDB sama
 * sekali — hanya menyusun dan membaca berkas — supaya bisa diuji tanpa
 * browser.
 */

const MANIFEST = "manifest.json";
const APP = "waichat-voice";
const VERSION = 1;

/** Satu klip beserta teksnya — bentuk netral, tanpa menyentuh penyimpanan. */
export type VoiceItem = {
  key: string;
  text?: string;
  voice?: string;
  model?: string;
  at: number;
  data: Uint8Array;
};

type ManifestEntry = {
  key: string;
  text: string;
  voice: string;
  model: string;
  bytes: number;
  at: number;
  file: string;
};

type VoiceManifest = {
  app: string;
  version: number;
  exportedAt: string;
  entries: ManifestEntry[];
};

/** Susun ZIP cadangan dari daftar klip. */
export function buildVoiceZip(items: VoiceItem[], date = new Date()): Blob {
  const files: ZipInput[] = [];
  const entries: ManifestEntry[] = [];

  for (const item of items) {
    if (!item.data.length) continue;
    const file = `audio/${item.key}.wav`;
    files.push({ name: file, data: item.data });
    entries.push({
      key: item.key,
      text: item.text ?? "",
      voice: item.voice ?? "",
      model: item.model ?? "",
      bytes: item.data.length,
      at: item.at,
      file,
    });
  }

  const manifest: VoiceManifest = {
    app: APP,
    version: VERSION,
    exportedAt: date.toISOString(),
    entries,
  };
  files.unshift({
    name: MANIFEST,
    data: new TextEncoder().encode(JSON.stringify(manifest)),
  });

  return writeZip(files, date);
}

/** Baca ZIP cadangan menjadi daftar klip. Melempar pesan yang bisa dibaca. */
export function parseVoiceZip(buffer: ArrayBuffer): VoiceItem[] {
  let entries: ReturnType<typeof readZip>;
  try {
    entries = readZip(buffer);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Berkas tidak bisa dibaca.");
  }

  const manifestFile = entries.find((entry) => entry.name === MANIFEST);
  if (!manifestFile) throw new Error("Berkas ini bukan cadangan suara WaiChat.");

  let manifest: VoiceManifest;
  try {
    manifest = JSON.parse(new TextDecoder().decode(manifestFile.data)) as VoiceManifest;
  } catch {
    throw new Error("Daftar isi cadangan rusak.");
  }
  if (manifest.app !== APP || !Array.isArray(manifest.entries)) {
    throw new Error("Berkas ini bukan cadangan suara WaiChat.");
  }

  const byName = new Map(entries.map((entry) => [entry.name, entry]));
  const items: VoiceItem[] = [];

  for (const item of manifest.entries) {
    if (!item?.key) continue;
    const audio = byName.get(item.file) ?? byName.get(`audio/${item.key}.wav`);
    if (!audio || !audio.data.length) continue;
    items.push({
      key: item.key,
      text: item.text || undefined,
      voice: item.voice || undefined,
      model: item.model || undefined,
      at: Number(item.at) || Date.now(),
      data: audio.data,
    });
  }

  return items;
}

/** Nama berkas cadangan yang enak dibaca, mis. waichat-suara-2026-10-31.zip */
export function backupFileName(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `waichat-suara-${y}-${m}-${d}.zip`;
}
