"use client";

import { useCallback, useEffect, useState } from "react";
import type { VoiceSettings } from "@/types/chat";
import { clearTtsCache, ttsCacheInfo } from "@/lib/ttsCache";
import { COMMON_PHRASES, getLastTtsError, prewarmTts, speakHd, stopHd } from "@/lib/tts";
import { VOICE_TEST_TEXT } from "@/lib/voice";
import { Switch } from "./Switch";

/** Suara bawaan Gemini TTS yang paling cocok untuk percakapan bahasa Indonesia. */
const HD_VOICES: { id: string; label: string; hint: string }[] = [
  { id: "Kore", label: "Kore", hint: "tegas, hangat" },
  { id: "Aoede", label: "Aoede", hint: "ringan, santai" },
  { id: "Leda", label: "Leda", hint: "muda, ceria" },
  { id: "Zephyr", label: "Zephyr", hint: "cerah, bersemangat" },
  { id: "Sulafat", label: "Sulafat", hint: "lembut, ramah" },
  { id: "Puck", label: "Puck", hint: "riang" },
  { id: "Charon", label: "Charon", hint: "tenang, dalam" },
  { id: "Fenrir", label: "Fenrir", hint: "bersemangat" },
];

const HD_MODELS: { id: string; label: string; hint: string }[] = [
  { id: "gemini-3.8-flash-tts", label: "3.8 Flash", hint: "paling natural" },
  { id: "gemini-3.8-flash-lite-tts", label: "3.8 Lite", hint: "paling cepat & hemat" },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Setelan suara HD dari API.
 *
 * Hasil suara disimpan di perangkat, jadi teks yang berulang diputar tanpa
 * memanggil API lagi — hemat kuota dan jauh lebih cepat.
 */
export function VoiceHdSection({
  settings,
  onChange,
}: {
  settings: VoiceSettings;
  onChange: (next: VoiceSettings) => void;
}) {
  const [cache, setCache] = useState<{ count: number; bytes: number } | null>(null);
  const [busy, setBusy] = useState<"test" | "clear" | "prewarm" | null>(null);
  const [note, setNote] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const refreshCache = useCallback(() => {
    ttsCacheInfo()
      .then(setCache)
      .catch(() => setCache(null));
  }, []);

  useEffect(() => {
    // Ditunda satu tick supaya tidak setState saat effect berjalan.
    const timer = window.setTimeout(refreshCache, 0);
    return () => window.clearTimeout(timer);
  }, [refreshCache]);

  function update(patch: Partial<VoiceSettings>) {
    onChange({ ...settings, ...patch });
  }

  async function handleTest() {
    if (!settings.hdKey.trim()) {
      setNote({ tone: "err", text: "Isi API key Gemini dulu." });
      return;
    }
    setBusy("test");
    setNote(null);
    const ok = await speakHd(VOICE_TEST_TEXT, settings);
    setBusy(null);
    if (ok) {
      setNote({ tone: "ok", text: "Suara HD berhasil diputar (tersimpan di cache)." });
      refreshCache();
    } else {
      setNote({ tone: "err", text: getLastTtsError() ?? "Gagal memutar suara HD." });
    }
  }

  async function handlePrewarm() {
    if (!settings.hdKey.trim()) {
      setNote({ tone: "err", text: "Isi API key Gemini dulu." });
      return;
    }
    setBusy("prewarm");
    setNote({ tone: "ok", text: `Menyiapkan 0/${COMMON_PHRASES.length}...` });
    const ready = await prewarmTts(COMMON_PHRASES, settings, (done, total) =>
      setNote({ tone: "ok", text: `Menyiapkan ${done}/${total}...` })
    );
    setBusy(null);
    refreshCache();
    setNote(
      ready === COMMON_PHRASES.length
        ? { tone: "ok", text: `Siap ${ready} frasa — sekarang diputar instan.` }
        : { tone: "err", text: `Hanya ${ready} dari ${COMMON_PHRASES.length} frasa yang berhasil.` }
    );
  }

  async function handleClear() {
    setBusy("clear");
    await clearTtsCache();
    setBusy(null);
    refreshCache();
    setNote({ tone: "ok", text: "Cache suara dihapus." });
  }

  return (
    <section className="rounded-xl border border-line px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="block text-sm font-semibold text-ink">Suara HD (API)</span>
          <span className="block text-xs text-ink-soft">
            Lebih natural dari suara perangkat. Hasil disimpan, jadi kalimat berulang diputar lokal.
          </span>
        </div>
        <Switch
          checked={settings.hdEnabled}
          onChange={(next) => update({ hdEnabled: next })}
          label="Suara HD"
        />
      </div>

      {settings.hdEnabled && (
        <div className="mt-3 space-y-3">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-ink-soft">
              API key Gemini
            </label>
            <input
              type="password"
              value={settings.hdKey}
              onChange={(e) => update({ hdKey: e.target.value })}
              placeholder="AIza..."
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-base text-ink outline-none placeholder:text-muted sm:text-sm"
            />
            <p className="mt-1 text-[12px] leading-snug text-muted">
              Dibuat gratis di aistudio.google.com → Get API key. Key hanya dipakai untuk suara dan
              tidak disimpan di server.
            </p>
          </div>

          <div>
            <span className="mb-1 block text-[12px] font-medium text-ink-soft">Suara</span>
            <div className="flex flex-wrap gap-1.5">
              {HD_VOICES.map((v) => {
                const active = settings.hdVoice === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => update({ hdVoice: v.id })}
                    title={v.hint}
                    aria-pressed={active}
                    className={`rounded-full border px-2.5 py-1 text-[12px] font-medium transition ${
                      active
                        ? "border-ink bg-surface-2 text-ink"
                        : "border-line text-ink-soft hover:border-ink/40 hover:text-ink"
                    }`}
                  >
                    {v.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[12px] font-medium text-ink-soft">
              Gaya bicara (opsional)
            </label>
            <input
              value={settings.hdStyle}
              onChange={(e) => update({ hdStyle: e.target.value })}
              placeholder="mis. bicara santai, hangat, sedikit menggoda"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-base text-ink outline-none placeholder:text-muted sm:text-sm"
            />
          </div>

          <div>
            <span className="mb-1 block text-[12px] font-medium text-ink-soft">Model</span>
            <div className="flex flex-wrap gap-1.5">
              {HD_MODELS.map((m) => {
                const active = settings.hdModel === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => update({ hdModel: m.id })}
                    aria-pressed={active}
                    className={`rounded-full border px-2.5 py-1 text-[12px] font-medium transition ${
                      active
                        ? "border-ink bg-surface-2 text-ink"
                        : "border-line text-ink-soft hover:border-ink/40 hover:text-ink"
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-3 py-2">
            <span className="text-[12px] text-ink-soft">
              Cache di perangkat
              {cache ? ` · ${cache.count} kalimat · ${formatBytes(cache.bytes)}` : ""}
            </span>
            <button
              type="button"
              onClick={handleClear}
              disabled={busy === "clear" || !cache?.count}
              className="shrink-0 text-[12px] font-semibold text-ink-soft transition hover:text-ink disabled:opacity-40"
            >
              {busy === "clear" ? "Menghapus..." : "Hapus"}
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrewarm}
            disabled={busy !== null}
            className="w-full rounded-lg border border-line py-2 text-xs font-semibold text-ink-soft transition hover:bg-surface-2 hover:text-ink disabled:opacity-50"
          >
            {busy === "prewarm"
              ? "Menyiapkan..."
              : `Siapkan ${COMMON_PHRASES.length} frasa umum`}
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={busy === "test"}
              className="flex-1 rounded-lg bg-brand py-2 text-xs font-semibold text-brand-ink transition hover:bg-brand-strong disabled:opacity-50"
            >
              {busy === "test" ? "Menyiapkan..." : "Coba suara HD"}
            </button>
            <button
              type="button"
              onClick={stopHd}
              className="rounded-lg border border-line px-4 py-2 text-xs font-semibold text-ink-soft transition hover:bg-surface-2 hover:text-ink"
            >
              Hentikan
            </button>
          </div>

          {note && (
            <p
              className={`text-xs ${
                note.tone === "ok" ? "text-ink" : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {note.text}
            </p>
          )}

          <p className="text-[12px] leading-snug text-muted">
            Pemakaian dihitung per karakter. Tanpa biaya selama kuota gratis Gemini masih ada; kalau
            key kosong atau gagal, aplikasi otomatis kembali ke suara perangkat.
          </p>
        </div>
      )}
    </section>
  );
}
