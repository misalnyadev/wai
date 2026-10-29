"use client";

import { useRef, useState } from "react";
import type { Provider, ProviderType } from "@/types/chat";
import { buildBackup, genId, isBackupData, restoreBackup, wipeAll } from "@/lib/storage";
import { useEscape } from "@/lib/useEscape";
import { ThemeSegmented } from "./ThemeToggle";
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
  const [dataBusy, setDataBusy] = useState<"export" | "import" | "wipe" | null>(null);
  const [dataNote, setDataNote] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  useEscape(onClose);

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


  async function handleExport() {
    setDataBusy("export");
    setDataNote(null);
    try {
      const backup = await buildBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `persona-backup-${stamp}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setDataNote({
        tone: "ok",
        text: `Cadangan tersimpan (${backup.characters.length} karakter). Simpan file ini baik-baik.`,
      });
    } catch {
      setDataNote({ tone: "err", text: "Gagal membuat cadangan. Coba lagi." });
    } finally {
      setDataBusy(null);
    }
  }

  async function handleImportFile(file: File) {
    setDataBusy("import");
    setDataNote(null);
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isBackupData(parsed)) {
        setDataNote({ tone: "err", text: "File bukan cadangan Persona yang valid." });
        return;
      }
      const ok = confirm(
        `Pulihkan ${parsed.characters.length} karakter dari file ini? Data yang ada di perangkat sekarang akan ditimpa.`
      );
      if (!ok) return;
      await restoreBackup(parsed);
      setDataNote({ tone: "ok", text: "Data dipulihkan. Memuat ulang aplikasi..." });
      setTimeout(() => window.location.reload(), 700);
    } catch {
      setDataNote({ tone: "err", text: "File tidak bisa dibaca. Pastikan file .json dari Persona." });
    } finally {
      setDataBusy(null);
      if (backupInputRef.current) backupInputRef.current.value = "";
    }
  }

  async function handleWipe() {
    if (!confirm("Hapus SEMUA data di perangkat ini (karakter, chat, foto, API key)?")) return;
    if (!confirm("Yakin? Tindakan ini tidak bisa dibatalkan. Pastikan kamu sudah mengunduh cadangan."))
      return;
    setDataBusy("wipe");
    setDataNote(null);
    try {
      await wipeAll();
      setDataNote({ tone: "ok", text: "Semua data dihapus. Memuat ulang aplikasi..." });
      setTimeout(() => window.location.reload(), 700);
    } catch {
      setDataNote({ tone: "err", text: "Gagal menghapus data." });
    } finally {
      setDataBusy(null);
    }
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
    <div
      className="fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="pop-in flex max-h-[90vh] w-full max-w-lg flex-col rounded-3xl bg-surface shadow-2xl ring-1 ring-black/5 dark:ring-white/10"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Pengaturan"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-lg font-bold text-ink">Pengaturan API Key</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-ink-soft transition hover:bg-surface-2"
            aria-label="Tutup pengaturan"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Tampilan
            </h3>
            <ThemeSegmented />
          </div>

          <div className="mb-3 flex items-start gap-2 rounded-xl bg-surface-2 p-3 text-xs leading-relaxed text-ink-soft">
            <LockIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              Semua chat, foto, dan API key tersimpan <b>hanya di browser perangkat ini</b> — tidak
              ada database server. Saat kamu chat, key hanya diteruskan ke provider AI pilihanmu.
            </span>
          </div>

          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-500/25 dark:bg-emerald-500/10">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              <PhoneIcon className="h-4 w-4" /> Buka di HP
            </div>
            <p className="mt-1 text-xs leading-relaxed text-emerald-700/80 dark:text-emerald-200/70">
              Setelah di-deploy ke Vercel, buka link yang sama di browser HP — tidak perlu install
              apa pun.
            </p>
            <button
              onClick={handleCopyLink}
              className="mt-2 flex w-full items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-left text-sm font-medium text-ink-soft shadow-sm transition hover:shadow"
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
                <CopyIcon className="h-4 w-4 shrink-0 text-muted" />
              )}
            </button>
          </div>

          <div className="space-y-2">
            {providers.length === 0 && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">
                Belum ada API key. Tambahkan satu di bawah supaya karakter bisa membalas chat —
                paling mudah pakai <b>Gemini (gratis)</b>.
              </p>
            )}
            {providers.map((p) => {
              const test = tests[p.id];
              return (
                <div key={p.id} className="rounded-xl border border-line px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-ink">
                          {p.label}
                        </span>
                        {p.isDefault && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                            DEFAULT
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-ink-soft">
                        {PROVIDER_LABELS[p.type]} · {p.model}
                        {p.apiKey ? ` · ••••${p.apiKey.slice(-4)}` : " · tanpa key"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => handleTest(p)}
                        title="Tes koneksi"
                        className="rounded-full p-1.5 text-ink-soft transition hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-500/10"
                      >
                        <BoltIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => startEdit(p)}
                        title="Edit"
                        className="rounded-full p-1.5 text-ink-soft transition hover:bg-sky-50 hover:text-sky-600"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      {!p.isDefault && (
                        <button
                          onClick={() => handleSetDefault(p.id)}
                          title="Jadikan default"
                          className="rounded-full p-1.5 text-ink-soft transition hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10"
                        >
                          <CheckIcon className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(p.id)}
                        title="Hapus"
                        className="rounded-full p-1.5 text-ink-soft transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
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
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-ink-soft"
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

          <form onSubmit={handleSubmit} className="mt-5 space-y-3 border-t border-line pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">
                {editingId ? "Edit Provider" : "Tambah Provider Baru"}
              </h3>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs font-medium text-ink-soft hover:text-ink-soft"
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
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-500/15 dark:text-emerald-300"
                      : "border-line text-ink-soft hover:bg-surface-2"
                  }`}
                >
                  {PROVIDER_LABELS[t]}
                </button>
              ))}
            </div>

            <p className="text-xs text-ink-soft">{KEY_HELP[type]}</p>

            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={`Nama label (contoh: ${PROVIDER_LABELS[type]})`}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted focus:border-emerald-400"
            />

            {type === "custom" && (
              <input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="Base URL (contoh: http://localhost:11434/v1)"
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted focus:border-emerald-400"
              />
            )}

            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={type === "custom" ? "API Key (opsional)" : "API Key"}
              type="password"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted focus:border-emerald-400"
            />

            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={`Model (default: ${PROVIDER_DEFAULT_MODEL[type] || "isi manual"})`}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted focus:border-emerald-400"
            />

            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="h-4 w-4 rounded border-line"
              />
              Jadikan provider default
            </label>

            {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

            <button
              type="submit"
              className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.99]"
            >
              {editingId ? "Simpan Perubahan" : "Simpan Provider"}
            </button>
          </form>

          {/* Cadangan data perangkat */}
          <div className="mt-6 rounded-xl border border-line p-3">
            <h3 className="text-sm font-semibold text-ink">Data &amp; cadangan</h3>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">
              Karena tidak ada server penyimpanan, chat bisa hilang bila data browser dibersihkan
              atau kamu ganti perangkat. Unduh cadangan secara berkala.
            </p>
            <input
              ref={backupInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportFile(file);
              }}
            />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExport}
                disabled={dataBusy !== null}
                className="rounded-lg bg-ink py-2 text-xs font-semibold text-surface transition hover:opacity-90 disabled:opacity-50"
              >
                {dataBusy === "export" ? "Menyiapkan..." : "Unduh cadangan"}
              </button>
              <button
                type="button"
                onClick={() => backupInputRef.current?.click()}
                disabled={dataBusy !== null}
                className="rounded-lg border border-line py-2 text-xs font-semibold text-ink-soft transition hover:bg-surface-2 disabled:opacity-50"
              >
                {dataBusy === "import" ? "Memulihkan..." : "Pulihkan cadangan"}
              </button>
            </div>
            <button
              type="button"
              onClick={handleWipe}
              disabled={dataBusy !== null}
              className="mt-2 w-full rounded-lg border border-rose-200 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10"
            >
              {dataBusy === "wipe" ? "Menghapus..." : "Hapus semua data di perangkat ini"}
            </button>
            <p className="mt-2 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
              ⚠️ File cadangan memuat API key-mu. Simpan di tempat aman, jangan dibagikan.
            </p>
            {dataNote && (
              <p
                className={`mt-1.5 text-xs ${
                  dataNote.tone === "ok" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {dataNote.text}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
