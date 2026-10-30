"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_VOICE, type VoiceSettings } from "@/types/chat";
import type { TtsCacheEntry } from "@/lib/storage";
import { clearTtsCache, listCachedEntries } from "@/lib/ttsCache";
import { getLastTtsError, playCached, recoverCachedTexts, stopHd } from "@/lib/tts";
import { exportVoiceZip, importVoiceZip } from "@/lib/ttsBackup";
import { backupFileName } from "@/lib/ttsArchive";
import { PlayIcon } from "./icons";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(at: number): string {
  try {
    return new Date(at).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

/**
 * Daftar rekaman suara HD yang tersimpan di perangkat.
 *
 * Tujuannya tiga: tahu kalimat apa saja yang sudah direkam, memutarnya ulang
 * tanpa memanggil API (tetap bisa walau kuota key habis), dan mencadangkan
 * semuanya ke satu berkas ZIP supaya tidak hilang saat ganti perangkat.
 */
export function VoiceBank({
  settings,
  tick,
  onChanged,
}: {
  settings: VoiceSettings;
  /** Berubah = muat ulang daftar (dipicu tes suara / siapkan frasa). */
  tick: number;
  onChanged?: () => void;
}) {
  const [entries, setEntries] = useState<TtsCacheEntry[] | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<"export" | "import" | "clear" | null>(null);
  const [note, setNote] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const runRef = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // Hanya tiga nilai ini yang memengaruhi kunci cache; memakai nilai primitif
  // membuat `load` tidak dibuat ulang setiap kali induk render.
  const voice = settings.hdVoice;
  const model = settings.hdModel;
  const style = settings.hdStyle;

  const load = useCallback(
    async (withRecover: boolean) => {
      // Klip dari versi lama belum menyimpan teks; tebak dari riwayat chat.
      if (withRecover) {
        await recoverCachedTexts({ ...DEFAULT_VOICE, hdVoice: voice, hdModel: model, hdStyle: style }).catch(
          () => 0
        );
      }
      const list = await listCachedEntries().catch(() => []);
      setEntries(list);
    },
    [voice, model, style]
  );

  useEffect(() => {
    // Ditunda satu tick supaya tidak setState saat effect berjalan.
    const timer = window.setTimeout(() => {
      void load(open);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load, open, tick]);

  const totalBytes = (entries ?? []).reduce((sum, entry) => sum + entry.bytes, 0);
  /** Mendekati batas cache (500 klip / 80 MB) — saatnya dicadangkan. */
  const nearlyFull = (entries?.length ?? 0) >= 450 || totalBytes >= 70 * 1024 * 1024;

  function stopSequence() {
    runRef.current += 1;
    stopHd();
    setPlaying(null);
  }

  async function handlePlay(key: string) {
    if (playing) {
      stopSequence();
      if (playing === key) return;
    }
    runRef.current += 1;
    const run = runRef.current;
    setPlaying(key);
    const ok = await playCached(key);
    if (run !== runRef.current) return;
    setPlaying(null);
    if (!ok) setNote({ tone: "err", text: getLastTtsError() ?? "Rekaman tidak bisa diputar." });
  }

  async function handlePlayAll() {
    if (playing) {
      stopSequence();
      return;
    }
    const list = entries ?? [];
    if (!list.length) return;
    runRef.current += 1;
    const run = runRef.current;
    for (const entry of list) {
      if (run !== runRef.current) return;
      setPlaying(entry.key);
      const ok = await playCached(entry.key);
      if (run !== runRef.current) return;
      if (!ok) break;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (run === runRef.current) setPlaying(null);
  }

  async function handleExport() {
    setBusy("export");
    setNote(null);
    try {
      const result = await exportVoiceZip();
      if (!result.blob) {
        setNote({ tone: "err", text: "Belum ada rekaman untuk dicadangkan." });
        return;
      }
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = backupFileName();
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setNote({
        tone: "ok",
        text: `${result.count} klip (${formatBytes(result.bytes)}) siap disimpan.`,
      });
    } catch {
      setNote({ tone: "err", text: "Cadangan gagal dibuat." });
    } finally {
      setBusy(null);
    }
  }

  async function handleImport(file: File) {
    setBusy("import");
    setNote(null);
    try {
      const result = await importVoiceZip(file);
      await load(false);
      onChanged?.();
      setNote({
        tone: "ok",
        text:
          result.added > 0
            ? `${result.added} klip dipulihkan dari cadangan.`
            : `${result.total} klip sudah ada semua di perangkat.`,
      });
      if (result.dropped > 0) {
        setNote({
          tone: "ok",
          text: `${result.added} klip dipulihkan. ${result.dropped} klip tertua dilepas karena cache penuh.`,
        });
      }
    } catch (error) {
      setNote({
        tone: "err",
        text: error instanceof Error ? error.message : "Cadangan tidak bisa dibaca.",
      });
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleClear() {
    if (!entries?.length) return;
    if (!window.confirm("Hapus semua rekaman suara di perangkat ini?")) return;
    setBusy("clear");
    stopSequence();
    await clearTtsCache();
    await load(false);
    onChanged?.();
    setBusy(null);
    setNote({ tone: "ok", text: "Semua rekaman dihapus." });
  }

  return (
    <div className="rounded-lg bg-surface-2 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 text-[12px] text-ink-soft">
          Kalimat tersimpan
          {entries
            ? ` · ${entries.length} klip · ${formatBytes(totalBytes)}`
            : " · memuat..."}
        </span>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="shrink-0 text-[12px] font-semibold text-ink-soft transition hover:text-ink"
        >
          {open ? "Tutup" : "Lihat"}
        </button>
      </div>

      {open && (
        <div className="mt-2">
          {entries && entries.length > 0 ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handlePlayAll}
                  className="rounded-full border border-line px-3 py-1 text-[12px] font-medium text-ink-soft transition hover:border-ink/40 hover:text-ink"
                >
                  {playing ? "Hentikan" : "Putar semua"}
                </button>
                <span className="text-[11px] text-muted">
                  {playing ? "sedang diputar" : "tanpa memakai kuota"}
                </span>
              </div>

              <ul className="mt-2 max-h-56 overflow-y-auto">
                {entries.map((entry) => (
                  <li
                    key={entry.key}
                    className="flex items-center gap-2 border-b border-line/60 py-1.5 last:border-b-0"
                  >
                    <button
                      type="button"
                      onClick={() => handlePlay(entry.key)}
                      aria-label={playing === entry.key ? "Hentikan" : "Putar rekaman"}
                      className={`shrink-0 p-1 transition active:opacity-50 ${
                        playing === entry.key ? "text-ink" : "text-ink-soft"
                      }`}
                    >
                      <PlayIcon className="h-4 w-4" />
                    </button>
                    <span className="min-w-0 flex-1 text-[12px] leading-snug text-ink">
                      {entry.text ?? <span className="text-muted">Klip lama (teks belum tercatat)</span>}
                    </span>
                    <span className="shrink-0 text-[11px] text-muted">{formatBytes(entry.bytes)}</span>
                    <span className="w-12 shrink-0 text-right text-[11px] text-muted">
                      {formatDate(entry.at)}
                    </span>
                  </li>
                ))}
              </ul>

              {nearlyFull && (
                <p className="mt-2 text-[11px] leading-snug text-ink-soft">
                  Cache hampir penuh. Cadangkan dulu, lalu hapus — klip tertua akan dilepas otomatis
                  kalau batas tercapai.
                </p>
              )}

              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={busy !== null}
                  className="flex-1 rounded-lg border border-line py-1.5 text-[12px] font-semibold text-ink-soft transition hover:bg-surface hover:text-ink disabled:opacity-50"
                >
                  {busy === "export" ? "Menyiapkan..." : "Cadangkan"}
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={busy !== null}
                  className="flex-1 rounded-lg border border-line py-1.5 text-[12px] font-semibold text-ink-soft transition hover:bg-surface hover:text-ink disabled:opacity-50"
                >
                  {busy === "import" ? "Memulihkan..." : "Pulihkan"}
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={busy !== null}
                  className="shrink-0 px-2 py-1.5 text-[12px] font-semibold text-rose-600 transition hover:opacity-70 disabled:opacity-40 dark:text-rose-400"
                >
                  Hapus
                </button>
              </div>
            </>
          ) : (
            <p className="text-[12px] leading-snug text-muted">
              Belum ada rekaman. Kalimat pertama tersimpan begitu suara HD diputar.
            </p>
          )}

          <input
            ref={fileRef}
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleImport(file);
            }}
          />

          {note && (
            <p
              className={`mt-2 text-[12px] leading-snug ${
                note.tone === "ok" ? "text-ink-soft" : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {note.text}
            </p>
          )}

          <p className="mt-2 text-[11px] leading-snug text-muted">
            Cadangan berisi berkas .wav + daftar kalimatnya, bisa disimpan di Files/iCloud dan
            dipulihkan tanpa memakai kuota API.
          </p>
        </div>
      )}
    </div>
  );
}
