"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { VoiceSettings } from "@/types/chat";
import {
  VOICE_PRESETS,
  VOICE_TEST_TEXT,
  getVoicesSnapshot,
  isNaturalVoice,
  isSpeechSupported,
  sortVoices,
  speak,
  stopSpeaking,
  subscribeVoices,
} from "@/lib/voice";
import { CheckIcon, SpeakerIcon } from "./icons";

function Slider({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (next: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-ink-soft">{label}</span>
        <span className="text-xs text-muted">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="w-full accent-ink"
      />
    </div>
  );
}

export function VoiceView({
  settings,
  onChange,
}: {
  settings: VoiceSettings;
  onChange: (next: VoiceSettings) => void;
}) {
  const [spoken, setSpoken] = useState(false);
  const voices = useSyncExternalStore(subscribeVoices, getVoicesSnapshot, () => []);
  const supported = useMemo(() => isSpeechSupported(), []);

  // Hentikan suara yang sedang berjalan saat halaman ditinggalkan.
  useEffect(() => () => stopSpeaking(), []);

  const sorted = useMemo(() => sortVoices(voices), [voices]);
  const indonesianCount = sorted.filter((v) => v.lang?.toLowerCase().startsWith("id")).length;
  const bestVoice = sorted[0] ?? null;

  function update(patch: Partial<VoiceSettings>) {
    onChange({ ...settings, ...patch });
  }

  function handleTest() {
    const ok = speak(VOICE_TEST_TEXT, settings);
    setSpoken(ok);
    setTimeout(() => setSpoken(false), 2200);
  }

  const presetActive = (preset: { rate: number; pitch: number }) =>
    Math.abs(settings.rate - preset.rate) < 0.01 && Math.abs(settings.pitch - preset.pitch) < 0.01;

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-surface">
      <div className="flex items-center justify-between bg-header px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
        <h2 className="font-display text-lg font-bold text-ink">Suara</h2>
        {supported && (
          <button
            type="button"
            onClick={handleTest}
            className="rounded-full bg-brand px-3.5 py-1.5 text-xs font-semibold text-brand-ink transition hover:bg-brand-strong"
          >
            {spoken ? "Membaca..." : "Coba suara"}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 pb-[calc(var(--tabbar-space)+0.5rem)]">
        <div className="mx-auto w-full max-w-2xl space-y-5">
          {!supported && (
            <p className="rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-xs leading-relaxed text-ink-soft">
              Browser ini belum mendukung suara (Web Speech API). Coba Safari di iPhone atau Chrome
              di Android/desktop.
            </p>
          )}

          {/* Aktifkan */}
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line px-3 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-soft ring-1 ring-line">
              <SpeakerIcon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink">Bacakan balasan</span>
              <span className="block text-xs text-ink-soft">Balasan karakter dibacakan otomatis</span>
            </span>
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => update({ enabled: e.target.checked })}
              className="h-4 w-4 shrink-0 rounded border-line accent-ink"
            />
          </label>

          {/* Saran suara paling natural */}
          {supported && bestVoice && (
            <div className="rounded-xl border border-line bg-surface-2 px-3 py-2.5">
              <p className="text-xs text-ink-soft">
                Paling natural di perangkat ini:{" "}
                <span className="font-semibold text-ink">{bestVoice.name}</span>
                {isNaturalVoice(bestVoice) ? " (enhanced)" : ""}
              </p>
              {(settings.voiceURI !== bestVoice.voiceURI || settings.voiceURI === "") && (
                <button
                  type="button"
                  onClick={() => update({ voiceURI: bestVoice.voiceURI, rate: 0.95, pitch: 1, pause: 150 })}
                  className="mt-2 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-brand-ink transition hover:bg-brand-strong"
                >
                  Pakai suara ini
                </button>
              )}
            </div>
          )}

          {/* Tips */}
          <details className="rounded-xl border border-line px-3 py-2">
            <summary className="cursor-pointer text-xs font-semibold text-ink-soft">
              Cara bikin suara lebih natural
            </summary>
            <div className="mt-2 space-y-1.5 text-xs leading-relaxed text-ink-soft">
              <p>
                <b>iPhone:</b> Pengaturan → Aksesibilitas → Konten Terbaca → Suara → Indonesia, lalu
                unduh suara bertanda <i>Enhanced</i>/<i>Premium</i>. Setelah terunduh, suara itu
                muncul di daftar ini dan jauh lebih halus.
              </p>
              <p>
                <b>Android:</b> Pengaturan → Aksesibilitas → Output teks-ke-suara → pasang suara
                bahasa Indonesia dari Google TTS.
              </p>
              <p>
                Lalu: pilih suara berlabel <b>natural</b>, pakai preset <b>Natural</b>, kecepatan
                ±0.95×, dan jeda kalimat 120–180 ms.
              </p>
            </div>
          </details>

          {/* Pilihan suara */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Pilih suara</h3>
              <span className="text-xs text-muted">
                {sorted.length} suara{indonesianCount ? ` · ${indonesianCount} Indonesia` : ""}
              </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-line">
              <button
                type="button"
                onClick={() => update({ voiceURI: "" })}
                className={`flex w-full items-center gap-2 px-3 py-2.5 text-left transition ${
                  settings.voiceURI === "" ? "bg-ink/[0.06]" : "hover:bg-surface-2"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink">Otomatis</span>
                  <span className="block truncate text-xs text-muted">
                    Utamakan bahasa Indonesia
                  </span>
                </span>
                {settings.voiceURI === "" && <CheckIcon className="h-4 w-4 shrink-0 text-ink" />}
              </button>

              {sorted.length > 0 && (
                <div className="max-h-56 overflow-y-auto border-t border-line">
                  {sorted.map((voice) => {
                    const active = settings.voiceURI === voice.voiceURI;
                    return (
                      <button
                        type="button"
                        key={voice.voiceURI}
                        onClick={() => update({ voiceURI: voice.voiceURI })}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left transition ${
                          active ? "bg-ink/[0.06]" : "hover:bg-surface-2"
                        }`}
                      >
                        <span className="flex min-w-0 flex-1 items-center gap-1.5">
                          <span className="min-w-0">
                            <span className="block truncate text-sm text-ink">{voice.name}</span>
                            <span className="block truncate text-xs uppercase text-muted">
                              {voice.lang}
                            </span>
                          </span>
                          {isNaturalVoice(voice) && (
                            <span className="shrink-0 rounded-full bg-ink/10 px-1.5 py-0.5 text-[12px] font-semibold text-ink">
                              natural
                            </span>
                          )}
                        </span>
                        {active && <CheckIcon className="h-4 w-4 shrink-0 text-ink" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Karakter suara */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Karakter suara
            </h3>

            <div className="mb-3 flex flex-wrap gap-1.5">
              {VOICE_PRESETS.map((preset) => {
                const active = presetActive(preset);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => update({ rate: preset.rate, pitch: preset.pitch })}
                    title={preset.hint}
                    aria-pressed={active}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      active
                        ? "border-ink bg-surface-2 text-ink"
                        : "border-line text-ink-soft hover:border-ink/40 hover:text-ink"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            <div className="space-y-3 rounded-xl border border-line px-3 py-3">
              <Slider
                label="Kecepatan"
                value={settings.rate}
                min={0.6}
                max={1.5}
                step={0.01}
                display={`${settings.rate.toFixed(2)}×`}
                onChange={(rate) => update({ rate })}
              />
              <Slider
                label="Nada"
                value={settings.pitch}
                min={0.6}
                max={1.4}
                step={0.01}
                display={settings.pitch.toFixed(2)}
                onChange={(pitch) => update({ pitch })}
              />
              <Slider
                label="Volume"
                value={settings.volume}
                min={0.2}
                max={1}
                step={0.05}
                display={`${Math.round(settings.volume * 100)}%`}
                onChange={(volume) => update({ volume })}
              />
              <Slider
                label="Jeda antar kalimat"
                value={settings.pause}
                min={0}
                max={500}
                step={20}
                display={`${settings.pause} ms`}
                onChange={(pause) => update({ pause })}
              />
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handleTest}
                disabled={!supported}
                className="flex-1 rounded-lg border border-line py-2 text-xs font-semibold text-ink-soft transition hover:bg-surface-2 hover:text-ink disabled:opacity-50"
              >
                Coba suara
              </button>
              <button
                type="button"
                onClick={stopSpeaking}
                disabled={!supported}
                className="rounded-lg border border-line px-4 py-2 text-xs font-semibold text-ink-soft transition hover:bg-surface-2 hover:text-ink disabled:opacity-50"
              >
                Hentikan
              </button>
            </div>
          </section>

          <p className="pb-2 text-xs leading-relaxed text-muted">
            Suara dihasilkan browser di perangkat ini — gratis, tanpa API key, dan tidak dikirim ke
            mana pun. Daftar suara mengikuti perangkatmu.
          </p>
        </div>
      </div>
    </div>
  );
}
