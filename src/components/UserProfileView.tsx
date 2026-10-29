"use client";

import { useRef, useState } from "react";
import type { UserProfile } from "@/types/chat";
import { fileToDataUrl } from "@/lib/imageClient";
import { Avatar } from "./Avatar";
import { CameraIcon, CheckIcon } from "./icons";

export function UserProfileView({
  profile,
  onSave,
}: {
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
}) {
  const [form, setForm] = useState<UserProfile>(profile);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function update<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleAvatar(file: File) {
    setBusy(true);
    try {
      const dataUrl = await fileToDataUrl(file, 320, 0.85);
      update("avatarUrl", dataUrl);
    } catch {
      // file bukan gambar / browser menolak — biarkan avatar lama
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ ...form, updatedAt: new Date().toISOString() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const displayName = form.nickname.trim() || form.name.trim() || "Kamu";

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-surface">
      <header className="border-b border-line bg-header px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <h2 className="font-display text-lg font-bold text-ink">Profil saya</h2>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-5 pb-[calc(var(--tabbar-space)+0.5rem)]">
        <form onSubmit={handleSubmit} className="mx-auto w-full max-w-xl space-y-4">
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="group relative rounded-full"
              title="Ganti foto profil"
            >
              <Avatar name={displayName} src={form.avatarUrl} size={96} ring />
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition group-hover:bg-black/35">
                <CameraIcon className="h-6 w-6 text-white opacity-0 transition group-hover:opacity-100" />
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAvatar(file);
              }}
            />
            <span className="text-xs text-muted">
              {busy ? "Memproses..." : "Ubah foto"}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nama kamu">
              <input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Mis. Raka Pratama"
                className={inputClass}
              />
            </Field>
            <Field label="Mau dipanggil siapa?">
              <input
                value={form.nickname}
                onChange={(e) => update("nickname", e.target.value)}
                placeholder="Mis. Ra, Kak Raka"
                className={inputClass}
              />
            </Field>
            <Field label="Usia (opsional)">
              <input
                value={form.age}
                onChange={(e) => update("age", e.target.value)}
                placeholder="Mis. 27"
                inputMode="numeric"
                className={inputClass}
              />
            </Field>
            <Field label="Kesibukan / pekerjaan (opsional)">
              <input
                value={form.occupation}
                onChange={(e) => update("occupation", e.target.value)}
                placeholder="Mis. editor video freelance"
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Tentang kamu">
            <textarea
              value={form.bio}
              onChange={(e) => update("bio", e.target.value)}
              rows={5}
              placeholder="Ceritakan singkat tentangmu"
              className={`${inputClass} resize-none`}
            />
          </Field>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-strong active:scale-[0.99]"
            >
              Simpan profil
            </button>
            {saved && (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckIcon className="h-3.5 w-3.5" /> Tersimpan
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-base text-ink sm:py-2 sm:text-sm outline-none transition placeholder:text-muted focus:border-emerald-400";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-soft">{label}</span>
      {children}
    </label>
  );
}
