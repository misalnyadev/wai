"use client";

import { useRef, useState } from "react";
import type { Character, Provider } from "@/types/chat";
import { fileToDataUrl } from "@/lib/imageClient";
import { genId } from "@/lib/storage";
import { Avatar } from "./Avatar";
import { CameraIcon, XIcon } from "./icons";

const PERSONALITY_PLACEHOLDER = `Contoh:
Nama: Alya, 25 tahun, teman dekat yang hangat dan perhatian.
Latar belakang: Sahabat sejak kuliah, sekarang kerja di agensi kreatif.
Kepribadian: Ceria, perhatian, agak posesif kalau cemburu, suka bercanda tapi bisa serius kalau lawan bicara sedang sedih.
Gaya bicara: Santai, banyak pakai emoji, suka ngirim pesan beruntun pendek-pendek.
Hubungan dengan lawan bicara: Dekat dan saling percaya, kadang menggoda.
Konteks adegan: Latihan dialog untuk scene drama romantis — percakapan sehari-hari lewat chat.`;

export function CharacterModal({
  initial,
  providers,
  onClose,
  onSave,
}: {
  initial?: Character | null;
  providers: Provider[];
  onClose: () => void;
  onSave: (character: Character, isNew: boolean) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [shortBio, setShortBio] = useState(initial?.shortBio ?? "");
  const [personality, setPersonality] = useState(initial?.personality ?? "");
  const [greeting, setGreeting] = useState(initial?.greeting ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initial?.avatarUrl ?? null);
  const [providerId, setProviderId] = useState<string>(initial?.providerId ?? "");
  const [model, setModel] = useState(initial?.model ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleAvatarPick(file: File) {
    setUploading(true);
    setError(null);
    try {
      setAvatarUrl(await fileToDataUrl(file, 320, 0.85));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproses foto.");
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Nama karakter wajib diisi.");
    if (!personality.trim()) return setError("Deskripsi kepribadian wajib diisi.");

    const now = new Date().toISOString();
    const character: Character = {
      id: initial?.id ?? genId(),
      name: name.trim(),
      avatarUrl,
      shortBio: shortBio.trim(),
      personality: personality.trim(),
      greeting: greeting.trim(),
      providerId: providerId || null,
      model: model.trim() || null,
      preview: initial?.preview ?? (greeting.trim() || "Mulai percakapan baru"),
      createdAt: initial?.createdAt ?? now,
      updatedAt: initial?.updatedAt ?? now,
    };
    onSave(character, !initial);
    onClose();
  }

  return (
    <div className="fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="font-display text-lg font-bold text-slate-900">
            {initial ? "Edit Karakter" : "Buat Karakter Baru"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100"
            aria-label="Tutup"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="group relative"
              title="Unggah foto profil"
            >
              <Avatar name={name || "?"} src={avatarUrl} size={88} />
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition group-hover:bg-black/35">
                <CameraIcon className="h-6 w-6 text-white opacity-0 transition group-hover:opacity-100" />
              </div>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAvatarPick(file);
              }}
            />
            <span className="text-xs text-slate-400">
              {uploading ? "Memproses foto..." : "Ketuk untuk pilih foto (opsional)"}
            </span>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Nama Karakter</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mis. Alya Rahmadhani"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Status singkat (tampil di bawah nama)
            </label>
            <input
              value={shortBio}
              onChange={(e) => setShortBio(e.target.value)}
              placeholder="Mis. sedang syuting di Bandung 🎬"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Kepribadian & latar belakang karakter
            </label>
            <textarea
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              placeholder={PERSONALITY_PLACEHOLDER}
              rows={7}
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-400"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Makin detail & spesifik, makin konsisten dan nyata karakter ini saat diajak chat.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Pesan pembuka pertama (opsional)
            </label>
            <textarea
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              placeholder="Mis. Heyy udah lama ga chat, kangen tau 😄"
              rows={2}
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Provider AI</label>
              <select
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-400"
              >
                <option value="">Gunakan default</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Model (opsional)</label>
              <input
                value={model ?? ""}
                onChange={(e) => setModel(e.target.value)}
                placeholder="override model"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-400"
              />
            </div>
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.99]"
          >
            {initial ? "Simpan Perubahan" : "Buat Karakter"}
          </button>
        </form>
      </div>
    </div>
  );
}
