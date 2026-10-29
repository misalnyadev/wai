"use client";

import { useState } from "react";
import type { Provider, ProviderType } from "@/types/chat";
import { genId } from "@/lib/storage";
import {
  BoltIcon,
  CheckIcon,
  CopyIcon,
  LockIcon,
  PencilIcon,
  PhoneIcon,
  TrashIcon,
  XIcon,
} from "./icons";

const PROVIDER_LABELS: Record<ProviderType, string> = {
  gemini: "Google Gemini",
  grok: "Grok (xAI)",
  openrouter: "OpenRouter",
  custom: "Custom (OpenAI-compatible)",
};

const PROVIDER_DEFAULT_MODEL: Record<ProviderType, string> = {
  gemini: "gemini-2.5-flash",
  grok: "grok-4",
  openrouter: "openai/gpt-4o-mini",
  custom: "",
};

const KEY_HELP: Record<ProviderType, string> = {
  gemini: "API key gratis: buka aistudio.google.com/apikey → Create API key → tempel di sini.",
  grok: "API key dari console.x.ai (berbayar).",
  openrouter: "API key dari openrouter.ai/keys (ada model gratis berakhiran :free).",
  custom: "Endpoint OpenAI-compatible milikmu, mis. Ollama: http://localhost:11434/v1",
};

type TestState = { status: "testing" | "ok" | "fail"; message?: string };

export function SettingsModal({
  providers,
  onChange,
  onClose,
}: {
  providers: Provider[];
  onChange: (next: Provider[]) => void;
  onClose: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [type, setType] = useState<ProviderType>("gemini");
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [isDefault, setIsDefault] = useState(providers.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [tests, setTests] = useState<Record<string, TestState>>({});
  const [copied, setCopied] = useState(false);

  function resetForm() {
    setEditingId(null);
    setLabel("");
    setApiKey("");
    setBaseUrl("");
    setModel("");
    setError(null);
  }

  function startEdit(p: Provider) {
    setEditingId(p.id);
    setType(p.type);
    setLabel(p.label);
    setApiKey(p.apiKey);
    setBaseUrl(p.baseUrl ?? "");
    setModel(p.model);
    setIsDefault(p.isDefault);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const finalModel = model.trim() || PROVIDER_DEFAULT_MODEL[type];
    if (type === "custom" && !baseUrl.trim()) {
      return setError("Base URL wajib diisi untuk provider custom.");
    }
    if (!finalModel) return setError("Model wajib diisi.");
    if (type !== "custom" && !apiKey.trim()) {
      return setError("API key wajib diisi.");
    }

    let next: Provider[];
    const record: Provider = {
      id: editingId ?? genId(),
      type,
      label: label.trim() || PROVIDER_LABELS[type],
      apiKey: apiKey.trim(),
      baseUrl: baseUrl.trim() || null,
      model: finalModel,
      isDefault,
    };

    if (editingId) {
      next = providers.map((p) => (p.id === editingId ? record : p));
    } else {
      next = [...providers, record];
    }
    if (isDefault) next = next.map((p) => ({ ...p, isDefault: p.id === record.id }));
    if (!next.some((p) => p.isDefault) && next.length > 0) next[0].isDefault = true;

    onChange(next);
    resetForm();
    setIsDefault(false);
  }

  function handleSetDefault(id: string) {
    onChange(providers.map((p) => ({ ...p, isDefault: p.id === id })));
  }

  function handleDelete(id: string) {
    if (!confirm("Hapus API key ini dari perangkat?")) return;
    let next = providers.filter((p) => p.id !== id);
    if (!next.some((p) => p.isDefault) && next.length > 0) {
      next = next.map((p, i) => ({ ...p, isDefault: i === 0 }));
    }
    onChange(next);
    if (editingId === id) resetForm();
  }

  async function handleTest(p: Provider) {
    setTests((t) => ({ ...t, [p.id]: { status: "testing" } }));
    try {
      const res = await fetch("/api/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: p.type, apiKey: p.apiKey, baseUrl: p.baseUrl, model: p.model }),
      });
      const data = await res.json();
      setTests((t) => ({
        ...t,
        [p.id]: data.ok
          ? { status: "ok", message: `Terhubung! Balasan: "${data.sample}"` }
          : { status: "fail", message: data.error || "Gagal terhubung." },
      }));
    } catch {
      setTests((t) => ({ ...t, [p.id]: { status: "fail", message: "Koneksi gagal." } }));
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.origin);
    } catch {
      // clipboard bisa diblokir; tautan tetap terlihat di bawah
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="font-display text-lg font-bold text-slate-900">Pengaturan API Key</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100"
            aria-label="Tutup pengaturan"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-3 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
            <LockIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              Semua chat, foto, dan API key tersimpan <b>hanya di browser perangkat ini</b> — tidak
              ada database server. Saat kamu chat, key hanya diteruskan ke provider AI pilihanmu.
            </span>
          </div>

          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
              <PhoneIcon className="h-4 w-4" /> Buka di HP
            </div>
            <p className="mt-1 text-xs leading-relaxed text-emerald-700/80">
              Setelah di-deploy ke Vercel, buka link yang sama di browser HP — tidak perlu install
              apa pun.
            </p>
            <button
              onClick={handleCopyLink}
              className="mt-2 flex w-full items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-left text-sm font-medium text-slate-700 shadow-sm transition hover:shadow"
              title="Salin link aplikasi"
            >
              <span className="truncate">
                {typeof window !== "undefined" ? window.location.origin : ""}
              </span>
              {copied ? (
                <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-600">
                  <CheckIcon className="h-3.5 w-3.5" /> Tersalin
                </span>
              ) : (
                <CopyIcon className="h-4 w-4 shrink-0 text-slate-400" />
              )}
            </button>
          </div>

          <div className="space-y-2">
            {providers.length === 0 && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                Belum ada API key. Tambahkan satu di bawah supaya karakter bisa membalas chat —
                paling mudah pakai <b>Gemini (gratis)</b>.
              </p>
            )}
            {providers.map((p) => {
              const test = tests[p.id];
              return (
                <div key={p.id} className="rounded-xl border border-slate-200 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-slate-900">
                          {p.label}
                        </span>
                        {p.isDefault && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            DEFAULT
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-slate-500">
                        {PROVIDER_LABELS[p.type]} · {p.model}
                        {p.apiKey ? ` · ••••${p.apiKey.slice(-4)}` : " · tanpa key"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => handleTest(p)}
                        title="Tes koneksi"
                        className="rounded-full p-1.5 text-slate-500 transition hover:bg-amber-50 hover:text-amber-600"
                      >
                        <BoltIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => startEdit(p)}
                        title="Edit"
                        className="rounded-full p-1.5 text-slate-500 transition hover:bg-sky-50 hover:text-sky-600"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      {!p.isDefault && (
                        <button
                          onClick={() => handleSetDefault(p.id)}
                          title="Jadikan default"
                          className="rounded-full p-1.5 text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-600"
                        >
                          <CheckIcon className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(p.id)}
                        title="Hapus"
                        className="rounded-full p-1.5 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {test && (
                    <p
                      className={`mt-1.5 text-xs ${
                        test.status === "ok"
                          ? "text-emerald-600"
                          : test.status === "fail"
                            ? "text-rose-600"
                            : "text-slate-500"
                      }`}
                    >
                      {test.status === "testing"
                        ? "Menguji koneksi..."
                        : test.status === "ok"
                          ? `✓ ${test.message}`
                          : `✗ ${test.message}`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3 border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">
                {editingId ? "Edit Provider" : "Tambah Provider Baru"}
              </h3>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs font-medium text-slate-500 hover:text-slate-700"
                >
                  Batal edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(PROVIDER_LABELS) as ProviderType[]).map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setType(t)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    type === t
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {PROVIDER_LABELS[t]}
                </button>
              ))}
            </div>

            <p className="text-xs text-slate-500">{KEY_HELP[type]}</p>

            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={`Nama label (contoh: ${PROVIDER_LABELS[type]})`}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-400"
            />

            {type === "custom" && (
              <input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="Base URL (contoh: http://localhost:11434/v1)"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-400"
              />
            )}

            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={type === "custom" ? "API Key (opsional)" : "API Key"}
              type="password"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-400"
            />

            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={`Model (default: ${PROVIDER_DEFAULT_MODEL[type] || "isi manual"})`}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-400"
            />

            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Jadikan provider default
            </label>

            {error && <p className="text-sm text-rose-600">{error}</p>}

            <button
              type="submit"
              className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.99]"
            >
              {editingId ? "Simpan Perubahan" : "Simpan Provider"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
