"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Character, ChatMessage, Provider } from "@/types/chat";
import {
  deleteCharacterData,
  genId,
  getMessages,
  loadAll,
  saveCharacters,
  saveMessages,
  saveProviders,
} from "@/lib/storage";
import { fileToDataUrl, splitDataUrl } from "@/lib/imageClient";
import { Avatar } from "./Avatar";
import { Sidebar } from "./Sidebar";
import { ChatWindow } from "./ChatWindow";
import { Composer } from "./Composer";
import { SettingsModal } from "./SettingsModal";
import { CharacterModal } from "./CharacterModal";
import { CharacterProfileModal } from "./CharacterProfileModal";
import { PlusIcon, SettingsIcon, XIcon } from "./icons";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function typingDelayFor(text: string) {
  return Math.min(450 + text.length * 16, 2600);
}

export function ChatApp() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messagesMap, setMessagesMap] = useState<Record<string, ChatMessage[]>>({});
  const [typingFor, setTypingFor] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [profileCharacter, setProfileCharacter] = useState<Character | null>(null);
  const [editCharacter, setEditCharacter] = useState<Character | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const charactersRef = useRef<Character[]>([]);
  const messagesRef = useRef<Record<string, ChatMessage[]>>({});
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  }, []);

  useEffect(() => {
    loadAll()
      .then(({ characters, providers }) => {
        charactersRef.current = characters;
        setCharacters(characters);
        setProviders(providers);
      })
      .catch(() =>
        showToast("Penyimpanan browser tidak tersedia. Gunakan mode normal (bukan incognito).")
      )
      .finally(() => setLoaded(true));
  }, [showToast]);

  const updateMessages = useCallback(
    (id: string, updater: (list: ChatMessage[]) => ChatMessage[]) => {
      const next = updater(messagesRef.current[id] ?? []);
      messagesRef.current = { ...messagesRef.current, [id]: next };
      setMessagesMap(messagesRef.current);
      return next;
    },
    []
  );

  function persistCharacters(next: Character[]) {
    charactersRef.current = next;
    setCharacters(next);
    saveCharacters(next).catch(() => showToast("Gagal menyimpan ke browser."));
  }

  function persistProviders(next: Provider[]) {
    setProviders(next);
    saveProviders(next).catch(() => showToast("Gagal menyimpan ke browser."));
  }

  function touchCharacter(id: string, preview: string) {
    persistCharacters(
      charactersRef.current.map((c) =>
        c.id === id ? { ...c, preview, updatedAt: new Date().toISOString() } : c
      )
    );
  }

  async function handleSelect(id: string) {
    setActiveId(id);
    setMobileShowChat(true);
    if (!messagesRef.current[id]) {
      const msgs = await getMessages(id).catch(() => []);
      updateMessages(id, () => msgs);
    }
  }

  function resolveProvider(character: Character): Provider | null {
    if (character.providerId) {
      const p = providers.find((p) => p.id === character.providerId);
      if (p) return p;
    }
    return providers.find((p) => p.isDefault) ?? providers[0] ?? null;
  }

  async function handleSend(text: string, imageFile: File | null) {
    if (!activeId) return;
    const character = charactersRef.current.find((c) => c.id === activeId);
    if (!character) return;

    const provider = resolveProvider(character);
    if (!provider) {
      showToast("Tambahkan API key dulu di Pengaturan ⚙️ (Gemini gratis)");
      setShowSettings(true);
      return;
    }

    let imageDataUrl: string | null = null;
    if (imageFile) {
      try {
        imageDataUrl = await fileToDataUrl(imageFile, 1280, 0.85);
      } catch {
        showToast("Gagal memproses gambar. Coba foto lain.");
        return;
      }
    }

    const userMsg: ChatMessage = {
      id: genId(),
      role: "user",
      content: text,
      imageUrl: imageDataUrl,
      createdAt: new Date().toISOString(),
      pending: true,
    };

    const withUser = updateMessages(activeId, (l) => [...l, userMsg]);
    saveMessages(activeId, withUser).catch(() => {});
    touchCharacter(activeId, text || "📷 Foto");
    setTypingFor(activeId);

    const history = withUser.slice(0, -1).slice(-20).map((m) => ({
      role: m.role,
      content: m.content || (m.imageUrl ? "[mengirim foto]" : ""),
    }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character: { name: character.name, personality: character.personality },
          provider: {
            type: provider.type,
            apiKey: provider.apiKey,
            baseUrl: provider.baseUrl,
            model: character.model?.trim() || provider.model,
          },
          history,
          text,
          image: imageDataUrl ? splitDataUrl(imageDataUrl) : null,
        }),
      });
      const data = await res.json();

      updateMessages(activeId, (l) =>
        l.map((m) => (m.id === userMsg.id ? { ...m, pending: false } : m))
      );

      if (!res.ok) {
        setTypingFor(null);
        showToast(data.error || "Gagal mendapatkan balasan. Cek API key di Pengaturan.");
        saveMessages(activeId, messagesRef.current[activeId] ?? []).catch(() => {});
        return;
      }

      const bubbles: string[] = data.bubbles ?? [];
      for (let i = 0; i < bubbles.length; i++) {
        setTypingFor(activeId);
        await sleep(typingDelayFor(bubbles[i]));
        const reply: ChatMessage = {
          id: genId(),
          role: "assistant",
          content: bubbles[i],
          imageUrl: null,
          createdAt: new Date().toISOString(),
        };
        updateMessages(activeId, (l) => [...l, reply]);
        touchCharacter(activeId, bubbles[i]);
        if (i < bubbles.length - 1) await sleep(350);
      }
      setTypingFor(null);
      saveMessages(activeId, messagesRef.current[activeId] ?? []).catch(() => {});
    } catch {
      setTypingFor(null);
      updateMessages(activeId, (l) =>
        l.map((m) => (m.id === userMsg.id ? { ...m, pending: false } : m))
      );
      showToast("Koneksi gagal. Periksa internet lalu coba lagi.");
    }
  }

  function handleSaveCharacter(character: Character, isNew: boolean) {
    if (isNew) {
      persistCharacters([character, ...charactersRef.current]);
      if (character.greeting) {
        const greetingMsg: ChatMessage = {
          id: genId(),
          role: "assistant",
          content: character.greeting,
          imageUrl: null,
          createdAt: character.createdAt,
        };
        const msgs = updateMessages(character.id, () => [greetingMsg]);
        saveMessages(character.id, msgs).catch(() => {});
      }
      setActiveId(character.id);
      setMobileShowChat(true);
      showToast(`Karakter "${character.name}" siap diajak chat 🎬`);
    } else {
      persistCharacters(
        charactersRef.current.map((c) => (c.id === character.id ? character : c))
      );
      showToast("Karakter diperbarui.");
    }
  }

  function handleClearChat(id: string) {
    if (!confirm("Hapus seluruh riwayat chat dengan karakter ini?")) return;
    const character = charactersRef.current.find((c) => c.id === id);
    const msgs: ChatMessage[] = character?.greeting
      ? [
          {
            id: genId(),
            role: "assistant",
            content: character.greeting,
            imageUrl: null,
            createdAt: new Date().toISOString(),
          },
        ]
      : [];
    updateMessages(id, () => msgs);
    saveMessages(id, msgs).catch(() => {});
    touchCharacter(id, character?.greeting || "Mulai percakapan baru");
    setProfileCharacter(null);
    showToast("Riwayat chat dihapus.");
  }

  function handleDeleteCharacter(id: string) {
    if (!confirm("Hapus karakter ini beserta seluruh riwayat chat?")) return;
    persistCharacters(charactersRef.current.filter((c) => c.id !== id));
    deleteCharacterData(id).catch(() => {});
    delete messagesRef.current[id];
    setMessagesMap({ ...messagesRef.current });
    if (activeId === id) {
      setActiveId(null);
      setMobileShowChat(false);
    }
    setProfileCharacter(null);
    showToast("Karakter dihapus.");
  }

  const sorted = [...characters].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const activeCharacter = characters.find((c) => c.id === activeId) ?? null;
  const activeMessages = activeId ? messagesMap[activeId] ?? [] : [];
  const hasProviders = providers.length > 0;

  const profileProviderLabel = (() => {
    if (!profileCharacter) return "";
    const p = resolveProvider(profileCharacter);
    if (!p) return "Belum ada provider — atur di Pengaturan";
    return `${p.label} · ${profileCharacter.model?.trim() || p.model}`;
  })();

  if (!loaded) {
    return (
      <div className="app-shell flex flex-col items-center justify-center gap-3 bg-app">
        <div className="font-display animate-pulse text-2xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
          Persona
        </div>
        <p className="text-sm text-muted">Memuat percakapanmu...</p>
      </div>
    );
  }

  return (
    <div className="app-shell flex w-full overflow-hidden bg-app">
      <div className={`${mobileShowChat ? "hidden" : "flex"} w-full md:flex md:w-auto`}>
        <Sidebar
          characters={sorted}
          activeId={activeId}
          onSelect={handleSelect}
          onNewCharacter={() => setShowCreate(true)}
          onOpenSettings={() => setShowSettings(true)}
          hasProviders={hasProviders}
        />
      </div>

      <div className={`${mobileShowChat ? "flex" : "hidden"} w-full flex-1 flex-col md:flex`}>
        {activeCharacter ? (
          <>
            <ChatWindow
              character={activeCharacter}
              messages={activeMessages}
              isTyping={typingFor === activeId}
              onBack={() => setMobileShowChat(false)}
              onOpenProfile={() => setProfileCharacter(activeCharacter)}
              onImageClick={(url) => setLightbox(url)}
            />
            <Composer onSend={handleSend} disabled={typingFor === activeId} />
          </>
        ) : (
          <div className="dot-grid relative flex h-full flex-1 flex-col items-center justify-center overflow-y-auto bg-app px-5 py-10 text-center">
            <div className="fade-in w-full max-w-md">
              <div className="mb-5 flex justify-center -space-x-3">
                {characters.slice(0, 3).map((c, i) => (
                  <div
                    key={c.id}
                    style={{ zIndex: 3 - i }}
                    className="rounded-full ring-4 ring-app"
                  >
                    <Avatar name={c.name} src={c.avatarUrl} size={56} />
                  </div>
                ))}
              </div>

              <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink">
                Persona<span className="text-emerald-500">.</span>
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
                Chat privat dengan karakter yang terasa nyata — untuk latihan pendalaman peran,
                chemistry, dan dialog film.
              </p>

              <div className="mt-6 space-y-2.5 rounded-2xl border border-line bg-surface/80 p-4 text-left shadow-sm backdrop-blur">
                {[
                  { n: "1", t: "Tambahkan API key (Gemini gratis) di Pengaturan" },
                  { n: "2", t: "Pilih karakter contoh, atau buat karaktermu sendiri" },
                  { n: "3", t: "Mulai chat — bisa kirim foto juga, dia bisa melihatnya" },
                ].map((step) => (
                  <div key={step.n} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                      {step.n}
                    </span>
                    <span className="text-sm text-ink-soft">{step.t}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={() => setShowSettings(true)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.98] dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
                >
                  <SettingsIcon className="h-4 w-4" /> Atur API Key
                </button>
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-2 active:scale-[0.98]"
                >
                  <PlusIcon className="h-4 w-4" /> Buat Karakter
                </button>
              </div>

              <p className="mt-4 text-[11px] text-muted">
                🔒 Semua data tersimpan hanya di browser perangkat ini.
              </p>
            </div>
          </div>
        )}
      </div>

      {showSettings && (
        <SettingsModal
          providers={providers}
          onChange={persistProviders}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showCreate && (
        <CharacterModal
          providers={providers}
          onClose={() => setShowCreate(false)}
          onSave={handleSaveCharacter}
        />
      )}

      {editCharacter && (
        <CharacterModal
          initial={editCharacter}
          providers={providers}
          onClose={() => setEditCharacter(null)}
          onSave={handleSaveCharacter}
        />
      )}

      {profileCharacter && (
        <CharacterProfileModal
          character={profileCharacter}
          providerLabel={profileProviderLabel}
          onClose={() => setProfileCharacter(null)}
          onEdit={() => {
            setEditCharacter(profileCharacter);
            setProfileCharacter(null);
          }}
          onClearChat={() => handleClearChat(profileCharacter.id)}
          onDelete={() => handleDeleteCharacter(profileCharacter.id)}
        />
      )}

      {lightbox && (
        <div
          className="fade-in fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute right-5 top-5 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            onClick={() => setLightbox(null)}
            aria-label="Tutup gambar"
          >
            <XIcon className="h-7 w-7" />
          </button>
          <img
            src={lightbox}
            alt="pratinjau foto"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
          />
        </div>
      )}

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[70] flex justify-center px-4">
          <div
            className="bubble-in max-w-md rounded-2xl bg-slate-900/95 px-4 py-2.5 text-center text-sm text-white shadow-lg"
            role="status"
            aria-live="polite"
          >
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
