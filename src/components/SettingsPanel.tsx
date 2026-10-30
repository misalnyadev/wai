"use client";

import { useMemo, useRef, useState } from "react";
import type { AppSettings, ChatBackground, Provider, ProviderType, UserProfile } from "@/types/chat";
import { buildBackup, genId, isBackupData, restoreBackup, wipeAll } from "@/lib/storage";
import { PROVIDER_META, PROVIDER_ORDER, RECOMMENDED_MODELS } from "@/lib/ai/providerDefaults";
import { useEscape } from "@/lib/useEscape";
import { ThemeSegmented } from "./ThemeToggle";
import { ChatBackgroundPicker } from "./ChatBackgroundPicker";
import {
  BoltIcon,
  CheckIcon,
  ChevronDownIcon,
  PencilIcon,
  PlusIcon,
  RefreshIcon,
  TrashIcon,
  UserIcon,
  XIcon,
} from "./icons";

type ModelOption = { id: string; label?: string };

type TestState = { status: "testing" | "ok" | "fail"; message?: string };

const FIELD =
 "w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-base text-ink outline-none transition placeholder:text-muted sm:py-2 sm:text-sm";

/** Versi angka dari nama model, untuk mengurutkan yang terbaru di atas. */
function versionScore(id: string): number[] {
  return (id.match(/\d+/g) ?? []).slice(0, 3).map(Number);
}

function sortModels(list: ModelOption[], recommended: string[]): ModelOption[] {
  return [...list].sort((a, b) => {
    const ra = recommended.indexOf(a.id);
    const rb = recommended.indexOf(b.id);
    if (ra !== rb) return (ra < 0 ? 999 : ra) - (rb < 0 ? 999 : rb);
    const va = versionScore(a.id);
    const vb = versionScore(b.id);
    for (let i = 0; i < Math.max(va.length, vb.length); i++) {
      const diff = (vb[i] ?? 0) - (va[i] ?? 0);
      if (diff) return diff;
    }
    return a.id.localeCompare(b.id);
  });
}

export function SettingsPanel({
  providers,
  onChange,
  settings,
  onSettingsChange,
  profile,
  onOpenProfile,
  onClose,
  variant = "modal",
}: {
  providers: Provider[];
  onChange: (next: Provider[]) => void;
  settings: AppSettings;
  onSettingsChange: (next: AppSettings) => void;
  profile: UserProfile;
  onOpenProfile: () => void;
  onClose: () => void;
  variant?: "modal" | "inline";
}) {
  const inline = variant === "inline";

  const [editingId, setEditingId] = useState<string | null>(null);
  const [type, setType] = useState<ProviderType>("gemini");
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [backupKeys, setBackupKeys] = useState<string[]>([]);
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [isDefault, setIsDefault] = useState(providers.length === 0);
  const [showKeys, setShowKeys] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tests, setTests] = useState<Record<string, TestState>>({});
  const [dataBusy, setDataBusy] = useState<"export" | "import" | "wipe" | null>(null);
  const [dataNote, setDataNote] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  /** Nilai sementara slider kepekatan gelembung — disimpan saat jari dilepas. */
  const [opacityDraft, setOpacityDraft] = useState<number | null>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  function setBackground(next: ChatBackground) {
    onSettingsChange({ ...settings, chatBackground: next });
  }

  const glassOpacity = opacityDraft ?? settings.bubbleOpacity ?? 45;

  function commitOpacity(percent: number) {
    setOpacityDraft(null);
    onSettingsChange({ ...settings, bubbleOpacity: percent });
  }

  // Pemilih model
  const [models, setModels] = useState<ModelOption[] | null>(null);
  const [modelsBusy, setModelsBusy] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [showModels, setShowModels] = useState(false);
  const [modelQuery, setModelQuery] = useState("");

  useEscape(onClose, !inline);

  const meta = PROVIDER_META[type];
  const recommended = useMemo(() => RECOMMENDED_MODELS[type] ?? [], [type]);

  const sortedModels = useMemo(
    () => (models ? sortModels(models, recommended) : []),
    [models, recommended]
  );
  const visibleModels = useMemo(() => {
    const q = modelQuery.trim().toLowerCase();
    return q ? sortedModels.filter((m) => m.id.toLowerCase().includes(q)) : sortedModels;
  }, [sortedModels, modelQuery]);

  function resetForm() {
    setEditingId(null);
    setLabel("");
    setApiKey("");
    setBackupKeys([]);
    setBaseUrl("");
    setModel("");
    setError(null);
    setModels(null);
    setShowModels(false);
    setModelsError(null);
    setModelQuery("");
  }

  function startEdit(p: Provider) {
    setEditingId(p.id);
    setType(p.type);
    setLabel(p.label);
    setApiKey(p.apiKey);
    setBackupKeys(p.backupKeys ?? []);
    setBaseUrl(p.baseUrl ?? "");
    setModel(p.model);
    setIsDefault(p.isDefault);
    setError(null);
    setModels(null);
    setShowModels(false);
    setModelsError(null);
    setModelQuery("");
  }

  function chooseType(next: ProviderType) {
    if (next !== type) setModel("");
    setType(next);
    setModels(null);
    setShowModels(false);
    setModelsError(null);
    setModelQuery("");
  }

  async function loadModels() {
    if (type !== "custom" && !apiKey.trim()) {
      setModelsError("Isi API key dulu.");
      setShowModels(true);
      return;
    }
    setModelsBusy(true);
    setModelsError(null);
    try {
      const res = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, apiKey, backupKeys, baseUrl }),
      });
      const data = await res.json();
      if (!data.ok) {
        setModels(null);
        setModelsError(data.error || "Gagal memuat model.");
        setShowModels(true);
        return;
      }
      setModels(data.models as ModelOption[]);
      setShowModels(true);
      setModelQuery("");
    } catch {
      setModels(null);
      setModelsError("Koneksi gagal.");
      setShowModels(true);
    } finally {
      setModelsBusy(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const finalModel = model.trim() || PROVIDER_META[type].defaultModel;
    if (type === "custom" && !baseUrl.trim()) {
      return setError("Base URL wajib diisi.");
    }
    if (!finalModel) return setError("Model wajib diisi.");
    if (type !== "custom" && !apiKey.trim()) {
      return setError("API key wajib diisi.");
    }

    let next: Provider[];
    const record: Provider = {
      id: editingId ?? genId(),
      type,
      label: label.trim() || PROVIDER_META[type].name,
      apiKey: apiKey.trim(),
      backupKeys: backupKeys.map((k) => k.trim()).filter(Boolean),
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
    if (!confirm("Hapus provider ini?")) return;
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
      a.download = `waichat-backup-${stamp}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setDataNote({ tone: "ok", text: `Tersimpan · ${backup.characters.length} karakter` });
    } catch {
      setDataNote({ tone: "err", text: "Gagal membuat cadangan." });
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
        setDataNote({ tone: "err", text: "File cadangan tidak valid." });
        return;
      }
      if (!confirm(`Pulihkan ${parsed.characters.length} karakter? Data sekarang ditimpa.`)) return;
      await restoreBackup(parsed);
      setDataNote({ tone: "ok", text: "Dipulihkan. Memuat ulang..." });
      setTimeout(() => window.location.reload(), 700);
    } catch {
      setDataNote({ tone: "err", text: "File tidak bisa dibaca." });
    } finally {
      setDataBusy(null);
      if (backupInputRef.current) backupInputRef.current.value = "";
    }
  }

  async function handleWipe() {
    if (!confirm("Hapus semua data di perangkat ini?")) return;
    if (!confirm("Yakin? Tindakan ini tidak bisa dibatalkan.")) return;
    setDataBusy("wipe");
    setDataNote(null);
    try {
      await wipeAll();
      setDataNote({ tone: "ok", text: "Data dihapus. Memuat ulang..." });
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
        body: JSON.stringify({
          type: p.type,
          apiKey: p.apiKey,
          backupKeys: p.backupKeys ?? [],
          baseUrl: p.baseUrl,
          model: p.model,
        }),
      });
      const data = await res.json();
      const usedKeyNote =
        data.ok && data.usedKeyNumber > 1
          ? ` · key ke-${data.usedKeyNumber} dari ${data.totalKeys}`
          : "";
      setTests((t) => ({
        ...t,
        [p.id]: data.ok
          ? { status: "ok", message: `Terhubung${usedKeyNote}` }
          : { status: "fail", message: data.error || "Gagal terhubung." },
      }));
    } catch {
      setTests((t) => ({ ...t, [p.id]: { status: "fail", message: "Koneksi gagal." } }));
    }
  }

  const body = (
    <>
      <div
        className={`flex items-center justify-between bg-header px-5 pb-3 ${
          inline ? "pt-[max(1rem,env(safe-area-inset-top))]" : "pt-4"
        }`}
      >
        <h2 className="font-display text-lg font-bold text-ink">Setelan</h2>
        <button
          onClick={onClose}
          className="rounded-full p-1.5 text-ink-soft transition hover:bg-surface-2"
          aria-label="Tutup setelan"
        >
          <XIcon className="h-5 w-5" />
        </button>
      </div>

      <div
        className={`flex-1 overflow-y-auto px-5 py-4 ${
          inline ? "pb-[calc(var(--tabbar-space)+0.5rem)]" : ""
        }`}
      >
        <div className="mx-auto w-full max-w-2xl">
          {/* Profil */}
          <button
            onClick={onOpenProfile}
            className="mb-4 flex w-full items-center gap-3 rounded-xl border border-line bg-surface-2 p-2.5 text-left transition hover:bg-line/30"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-soft ring-1 ring-line">
              <UserIcon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
              {profile.name?.trim() || "Profil"}
            </span>
            <PencilIcon className="h-4 w-4 shrink-0 text-muted" />
          </button>

          {/* Tema */}
          <section className="mb-5">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Tema</h3>
            <ThemeSegmented />
          </section>

          {/* Latar chat */}
          <section className="mb-5">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Latar chat
            </h3>
            <ChatBackgroundPicker
              value={settings.chatBackground ?? { kind: "default" }}
              onChange={(next) => setBackground(next ?? { kind: "default" })}
            />
            <p className="mt-2 text-xs text-muted">
              Tiap karakter bisa punya latar sendiri lewat menu ⋯ di percakapan.
            </p>

            <label className="mt-2 flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-line px-3 py-2">
              <span className="min-w-0">
                <span className="block text-xs font-medium text-ink">Gelembung tembus pandang</span>
                <span className="block text-[12px] leading-snug text-muted">
                  Pesan memakai latar transparan tanpa blur, jadi video atau gambar di belakangnya
                  tetap kelihatan.
                </span>
              </span>
              <input
                type="checkbox"
                checked={Boolean(settings.glassBubbles)}
                onChange={(e) => onSettingsChange({ ...settings, glassBubbles: e.target.checked })}
                className="mt-0.5 h-5 w-5 shrink-0 accent-ink"
              />
            </label>

            {settings.glassBubbles && (
              <div className="mt-2 rounded-xl border border-line px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-ink-soft">Kepekatan gelembung</span>
                  <span className="text-xs font-semibold text-ink">{glassOpacity}%</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={95}
                  step={5}
                  value={glassOpacity}
                  onChange={(e) => setOpacityDraft(Number(e.target.value))}
                  onPointerUp={(e) => commitOpacity(Number(e.currentTarget.value))}
                  onKeyUp={(e) => commitOpacity(Number(e.currentTarget.value))}
                  onBlur={(e) => commitOpacity(Number(e.currentTarget.value))}
                  aria-label="Kepekatan gelembung pesan"
                  className="mt-1 w-full accent-ink"
                />
                <p className="mt-1 text-[12px] leading-snug text-muted">
                  Makin kecil, video di belakang pesan makin kelihatan. Bawaan 45%.
                </p>
              </div>
            )}
          </section>

          {/* Provider tersimpan */}
          <section className="mb-5">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Provider
            </h3>

            {providers.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line px-3 py-2 text-xs text-muted">
                Belum ada API key.
              </p>
            ) : (
              <div className="space-y-2">
                {providers.map((p) => {
                  const test = tests[p.id];
                  const keyCount = 1 + (p.backupKeys?.length ?? 0);
                  return (
                    <div key={p.id} className="rounded-xl border border-line px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="truncate text-sm font-medium text-ink">{p.label}</span>
                            {p.isDefault && (
                              <span className="rounded-full bg-ink/10 px-1.5 py-0.5 text-[12px] font-semibold text-ink">
                                default
                              </span>
                            )}
                            {keyCount > 1 && (
                              <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[12px] font-medium text-ink-soft ring-1 ring-line">
                                {keyCount} key
                              </span>
                            )}
                          </div>
                          <p className="truncate text-xs text-ink-soft">{p.model}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                          <button
                            onClick={() => handleTest(p)}
                            title="Tes koneksi"
                            aria-label="Tes koneksi"
                            className="rounded-full p-1.5 text-ink-soft transition hover:bg-surface-2 hover:text-ink"
                          >
                            <BoltIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => startEdit(p)}
                            title="Edit"
                            aria-label="Edit provider"
                            className="rounded-full p-1.5 text-ink-soft transition hover:bg-surface-2 hover:text-ink"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          {!p.isDefault && (
                            <button
                              onClick={() => handleSetDefault(p.id)}
                              title="Jadikan default"
                              aria-label="Jadikan provider default"
                              className="rounded-full p-1.5 text-ink-soft transition hover:bg-surface-2 hover:text-ink"
                            >
                              <CheckIcon className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(p.id)}
                            title="Hapus"
                            aria-label="Hapus provider"
                            className="rounded-full p-1.5 text-ink-soft transition hover:bg-surface-2 hover:text-ink"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {test && (
                        <p
                          className={`mt-1 text-xs ${
                            test.status === "ok"
                              ? "text-ink"
                              : test.status === "fail"
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-ink-soft"
                          }`}
                        >
                          {test.status === "testing"
                            ? "Menguji..."
                            : test.status === "ok"
                              ? `✓ ${test.message}`
                              : `✗ ${test.message}`}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <label
              className="mt-2 flex cursor-pointer items-center gap-2 rounded-xl border border-line px-3 py-2"
              title="Pindah otomatis ke provider lain saat semua key provider ini gagal."
            >
              <input
                type="checkbox"
                checked={settings.autoFallback}
                onChange={(e) => onSettingsChange({ ...settings, autoFallback: e.target.checked })}
                className="h-4 w-4 shrink-0 rounded border-line accent-ink"
              />
              <span className="text-sm text-ink-soft">Fallback otomatis</span>
            </label>
          </section>

          {/* Form provider */}
          <form onSubmit={handleSubmit} className="space-y-2.5 border-t border-line pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                {editingId ? "Edit provider" : "Tambah provider"}
              </h3>
              <div className="flex items-center gap-3">
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-xs font-medium text-ink-soft hover:text-ink"
                  >
                    Batal
                  </button>
                )}
              </div>
            </div>

            {/* Label "Provider" + link ambil API key */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-sm font-medium text-ink">Provider</span>
              {meta.keyUrl && (
                <a
                  href={meta.keyUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-xs font-semibold text-ink-soft underline-offset-2 transition hover:text-ink hover:underline"
                >
                  Ambil API key ↗
                </a>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PROVIDER_ORDER.map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => chooseType(t)}
                  className={`rounded-lg border px-2 py-2 text-xs font-medium transition ${
                    type === t
                      ? "border-ink bg-surface-2 text-ink"
                      : "border-line text-ink-soft hover:bg-surface-2"
                  }`}
                >
                  {PROVIDER_META[t].name}
                </button>
              ))}
            </div>

            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Nama label (opsional)"
              className={FIELD}
            />

            {type === "custom" && (
              <input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="Base URL, mis. http://localhost:11434/v1"
                className={FIELD}
              />
            )}

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-medium text-muted">
                  API key{backupKeys.length > 0 ? ` (${1 + backupKeys.length})` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => setShowKeys((v) => !v)}
                  className="text-[12px] font-medium text-ink-soft hover:text-ink"
                >
                  {showKeys ? "Sembunyikan" : "Tampilkan"}
                </button>
              </div>

              <input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={type === "custom" ? "API key (opsional)" : "API key"}
                type={showKeys ? "text" : "password"}
                autoComplete="off"
                className={FIELD}
              />

              {backupKeys.map((key, index) => (
                <div key={index} className="mt-2 flex items-center gap-2">
                  <input
                    value={key}
                    onChange={(e) =>
                      setBackupKeys((list) =>
                        list.map((item, i) => (i === index ? e.target.value : item))
                      )
                    }
                    placeholder={`Key cadangan ${index + 1}`}
                    type={showKeys ? "text" : "password"}
                    autoComplete="off"
                    className={`${FIELD} min-w-0 flex-1`}
                  />
                  <button
                    type="button"
                    onClick={() => setBackupKeys((list) => list.filter((_, i) => i !== index))}
                    className="rounded-full p-1.5 text-ink-soft transition hover:bg-surface-2 hover:text-ink"
                    aria-label={`Hapus key cadangan ${index + 1}`}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setBackupKeys((list) => [...list, ""])}
                className="mt-2 flex items-center gap-1 text-xs font-semibold text-ink-soft transition hover:text-ink"
              >
                <PlusIcon className="h-3.5 w-3.5" /> Key cadangan
              </button>
            </div>

            {/* Model + pemilih model */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-medium text-muted">Model</span>
                <button
                  type="button"
                  onClick={() => (showModels ? setShowModels(false) : loadModels())}
                  disabled={modelsBusy}
                  className="flex items-center gap-1 text-xs font-semibold text-ink-soft transition hover:text-ink disabled:opacity-50"
                >
                  {modelsBusy ? "Memuat..." : showModels ? "Tutup" : "Pilih model"}
                  <ChevronDownIcon className={`h-3.5 w-3.5 transition ${showModels ? "rotate-180" : ""}`} />
                </button>
              </div>

              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={meta.defaultModel || "Nama model"}
                className={FIELD}
              />

              {showModels && (
                <div className="mt-2 overflow-hidden rounded-xl border border-line bg-surface">
                  <div className="flex items-center gap-1 border-b border-line px-2 py-1">
                    <input
                      value={modelQuery}
                      onChange={(e) => setModelQuery(e.target.value)}
                      placeholder="Cari model"
                      className="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-base text-ink outline-none placeholder:text-muted sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={loadModels}
                      disabled={modelsBusy}
                      aria-label="Muat ulang daftar model"
                      className="rounded-full p-1.5 text-ink-soft transition hover:bg-surface-2 disabled:opacity-50"
                    >
                      <RefreshIcon className={`h-4 w-4 ${modelsBusy ? "animate-spin" : ""}`} />
                    </button>
                  </div>

                  {modelsError ? (
                    <p className="px-3 py-3 text-xs text-rose-600 dark:text-rose-400">{modelsError}</p>
                  ) : sortedModels.length === 0 ? (
                    <p className="px-3 py-3 text-xs text-muted">Memuat...</p>
                  ) : (
                    <div className="max-h-64 overflow-y-auto">
                      {visibleModels.length === 0 && (
                        <p className="px-3 py-3 text-xs text-muted">Tidak ditemukan.</p>
                      )}
                      {visibleModels.map((m) => {
                        const active = model === m.id;
                        const isRecommended = recommended.includes(m.id);
                        return (
                          <button
                            type="button"
                            key={m.id}
                            onClick={() => {
                              setModel(m.id);
                              setShowModels(false);
                            }}
                            className={`flex w-full items-center gap-2 px-3 py-2 text-left transition ${
                              active ? "bg-ink/[0.06]" : "hover:bg-surface-2"
                            }`}
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm text-ink">{m.id}</span>
                              {m.label && m.label !== m.id && (
                                <span className="block truncate text-[12px] text-muted">{m.label}</span>
                              )}
                            </span>
                            {isRecommended && (
                              <span className="shrink-0 rounded-full bg-ink/10 px-1.5 py-0.5 text-[12px] font-semibold text-ink">
                                disarankan
                              </span>
                            )}
                            {active && <CheckIcon className="h-4 w-4 shrink-0 text-ink" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

            <button
              type="submit"
              className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-brand-ink transition hover:bg-brand-strong active:scale-[0.99]"
            >
              {editingId ? "Simpan perubahan" : "Simpan"}
            </button>
          </form>

          {/* Data */}
          <section className="mt-5 border-t border-line pt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Data</h3>
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
            <div className="grid grid-cols-2 gap-2">
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
              className="mt-2 w-full rounded-lg border border-line py-2 text-xs font-semibold text-ink-soft transition hover:bg-surface-2 hover:text-ink disabled:opacity-50"
            >
              {dataBusy === "wipe" ? "Menghapus..." : "Hapus semua data"}
            </button>
            <p className="mt-2 text-[12px] text-muted">
              File cadangan memuat API key. Video latar tidak ikut tersimpan — pasang ulang setelah
              memulihkan di perangkat lain.
            </p>

            {dataNote && (
              <p
                className={`mt-1 text-xs ${
                  dataNote.tone === "ok"
                    ? "text-ink"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {dataNote.text}
              </p>
            )}
          </section>
        </div>
      </div>
    </>
  );

  if (inline) {
    return <div className="flex h-full min-h-0 w-full flex-col bg-surface">{body}</div>;
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
        aria-label="Setelan"
      >
        {body}
      </div>
    </div>
  );
}
