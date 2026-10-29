"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_SETTINGS,
  EMPTY_PROFILE,
  type AppSettings,
  type Character,
  type ChatBackground,
  type ChatMessage,
  type Provider,
  type UserProfile,
} from "@/types/chat";
import {
  deleteCharacterData,
  genId,
  getMessages,
  getSettings,
  getUserProfile,
  loadAll,
  saveCharacters,
  saveMessages,
  saveProviders,
  saveSettings,
  saveUserProfile,
} from "@/lib/storage";
import { fileToDataUrl, splitDataUrl } from "@/lib/imageClient";
import { speak } from "@/lib/voice";
import { Avatar } from "./Avatar";
import { Sidebar } from "./Sidebar";
import { ChatWindow } from "./ChatWindow";
import { Composer } from "./Composer";
import { SettingsPanel } from "./SettingsPanel";
import { CharacterModal } from "./CharacterModal";
import { CharacterProfileModal } from "./CharacterProfileModal";
import { CharactersView } from "./CharactersView";
import { UserProfileView } from "./UserProfileView";
import { VoiceView } from "./VoiceView";
import { MobileTabBar, NavRail, type AppView } from "./Navigation";
import { PlusIcon, SettingsIcon, XIcon } from "./icons";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function typingDelayFor(text: string) {
  return Math.min(450 + text.length * 16, 2600);
}

type ChatApiResponse = {
  bubbles?: string[];
  error?: string;
  retryable?: boolean;
  usedKeyIndex?: number;
  fallbackUsed?: boolean;
};

export function ChatApp() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messagesMap, setMessagesMap] = useState<Record<string, ChatMessage[]>>({});
  const [typingFor, setTypingFor] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<AppView>("chats");

  const [showCreate, setShowCreate] = useState(false);
  const [profileCharacter, setProfileCharacter] = useState<Character | null>(null);
  const [editCharacter, setEditCharacter] = useState<Character | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const charactersRef = useRef<Character[]>([]);
  const providersRef = useRef<Provider[]>([]);
  const messagesRef = useRef<Record<string, ChatMessage[]>>({});
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  }, []);

  useEffect(() => {
    Promise.all([loadAll(), getUserProfile(), getSettings()])
      .then(([{ characters, providers }, savedProfile, savedSettings]) => {
        charactersRef.current = characters;
        providersRef.current = providers;
        setCharacters(characters);
        setProviders(providers);
        setProfile(savedProfile);
        setSettings(savedSettings);
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
    providersRef.current = next;
    setProviders(next);
    saveProviders(next).catch(() => showToast("Gagal menyimpan ke browser."));
  }

  function persistSettings(next: AppSettings) {
    setSettings(next);
    saveSettings(next).catch(() => showToast("Gagal menyimpan setelan."));
  }

  function persistProfile(next: UserProfile) {
    setProfile(next);
    saveUserProfile(next).catch(() => showToast("Gagal menyimpan profil."));
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
    setView("chats");
    setMobileShowChat(true);
    if (!messagesRef.current[id]) {
      const msgs = await getMessages(id).catch(() => []);
      updateMessages(id, () => msgs);
    }
  }

  function resolveProvider(character: Character): Provider | null {
    if (character.providerId) {
      const p = providersRef.current.find((p) => p.id === character.providerId);
      if (p) return p;
    }
    return providersRef.current.find((p) => p.isDefault) ?? providersRef.current[0] ?? null;
  }

  /** Naikkan key yang berhasil ke posisi utama supaya request berikutnya lebih cepat. */
  function promoteWorkingKey(providerId: string, usedKeyIndex: number) {
    const target = providersRef.current.find((p) => p.id === providerId);
    if (!target || usedKeyIndex <= 0) return;

    const keys = [target.apiKey, ...(target.backupKeys ?? [])].map((k) => k.trim()).filter(Boolean);
    const used = keys[usedKeyIndex];
    if (!used) return;

    const rest = keys.filter((k) => k !== used);
    persistProviders(
      providersRef.current.map((p) =>
        p.id === providerId ? { ...p, apiKey: used, backupKeys: rest } : p
      )
    );
  }

  async function handleSend(text: string, imageFile: File | null) {
    if (!activeId) return;
    const character = charactersRef.current.find((c) => c.id === activeId);
    if (!character) return;

    const primary = resolveProvider(character);
    if (!primary) {
      showToast("Atur API key dulu di Setelan.");
      setView("settings");
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

    const candidates = settings.autoFallback
      ? [primary, ...providersRef.current.filter((p) => p.id !== primary.id)].slice(0, 3)
      : [primary];

    try {
      let data: ChatApiResponse | null = null;
      let usedProvider: Provider | null = null;
      let succeeded = false;

      for (const candidate of candidates) {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            character: { name: character.name, personality: character.personality },
            provider: {
              type: candidate.type,
              apiKey: candidate.apiKey,
              backupKeys: candidate.backupKeys ?? [],
              baseUrl: candidate.baseUrl,
              model: character.model?.trim() || candidate.model,
            },
            user: {
              name: profile.name,
              nickname: profile.nickname,
              age: profile.age,
              occupation: profile.occupation,
              bio: profile.bio,
            },
            history,
            text,
            image: imageDataUrl ? splitDataUrl(imageDataUrl) : null,
          }),
        });

        data = (await res.json().catch(() => null)) as ChatApiResponse | null;

        if (res.ok) {
          succeeded = true;
          usedProvider = candidate;
          break;
        }
        // Hanya lanjut ke provider lain bila error-nya layak dicoba ulang.
        if (!data?.retryable) break;
      }

      updateMessages(activeId, (l) =>
        l.map((m) => (m.id === userMsg.id ? { ...m, pending: false } : m))
      );

      if (!succeeded || !data) {
        setTypingFor(null);
        showToast(data?.error || "Gagal mendapatkan balasan. Cek API key di Setelan.");
        saveMessages(activeId, messagesRef.current[activeId] ?? []).catch(() => {});
        return;
      }

      if (usedProvider) {
        promoteWorkingKey(usedProvider.id, data.usedKeyIndex ?? 0);
        if (usedProvider.id !== primary.id) {
          showToast(
            `Auto-fallback: memakai ${usedProvider.label} karena ${primary.label} kena limit.`
          );
        }
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
        if (settings.voice.enabled) speak(bubbles[i], settings.voice, { append: i > 0 });
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
      setView("chats");
      setMobileShowChat(true);
      showToast(`Karakter "${character.name}" siap diajak chat 🎬`);
    } else {
      persistCharacters(
        charactersRef.current.map((c) => (c.id === character.id ? character : c))
      );
      showToast("Karakter diperbarui.");
    }
  }

  /** Simpan latar khusus karakter (null = ikut setelan global). */
  function handleCharacterBackground(id: string, next: ChatBackground | null) {
    persistCharacters(
      charactersRef.current.map((c) => (c.id === id ? { ...c, chatBackground: next } : c))
    );
    setProfileCharacter((current) =>
      current && current.id === id ? { ...current, chatBackground: next } : current
    );
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

  function handleViewChange(next: AppView) {
    setView(next);
    if (next !== "chats") setMobileShowChat(false);
  }

  const sorted = [...characters].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const activeCharacter = characters.find((c) => c.id === activeId) ?? null;
  const activeMessages = activeId ? messagesMap[activeId] ?? [] : [];
  const hasProviders = providers.length > 0;

  // Dibaca saat render — pakai state (bukan ref) agar nilainya selalu segar.
  const profileProviderLabel = (() => {
    if (!profileCharacter) return "";
    const owned = profileCharacter.providerId
      ? providers.find((p) => p.id === profileCharacter.providerId)
      : undefined;
    const chosen = owned ?? providers.find((p) => p.isDefault) ?? providers[0] ?? null;
    if (!chosen) return "Belum ada provider";
    return `${chosen.label} · ${profileCharacter.model?.trim() || chosen.model}`;
  })();

  if (!loaded) {
    return (
      <div className="app-shell flex flex-col items-center justify-center gap-3 bg-app">
        <div className="font-display animate-pulse text-2xl font-extrabold tracking-tight text-ink">
          WaiChat
        </div>
        <p className="text-sm text-muted">Memuat percakapanmu...</p>
      </div>
    );
  }

  return (
    <div className="app-shell flex w-full overflow-hidden bg-app">
      <NavRail view={view} onChange={handleViewChange} profile={profile} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1">
          {view === "chats" && (
            <>
              <div className={`${mobileShowChat ? "hidden" : "flex"} w-full md:flex md:w-auto`}>
                <Sidebar
                  characters={sorted}
                  activeId={activeId}
                  profile={profile}
                  onSelect={handleSelect}
                  onNewCharacter={() => setShowCreate(true)}
                  onOpenSettings={() => setView("settings")}
                  onOpenProfile={() => setView("profile")}
                  hasProviders={hasProviders}
                />
              </div>

              <div
                className={`${mobileShowChat ? "flex" : "hidden"} min-w-0 flex-1 flex-col md:flex`}
              >
                {activeCharacter ? (
                  <>
                    <ChatWindow
                      character={activeCharacter}
                      messages={activeMessages}
                      isTyping={typingFor === activeId}
                      background={activeCharacter.chatBackground ?? settings.chatBackground}
                      onBack={() => setMobileShowChat(false)}
                      onOpenProfile={() => setProfileCharacter(activeCharacter)}
                      onImageClick={(url) => setLightbox(url)}
                      onSpeak={(text) => speak(text, settings.voice)}
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

                      <div className="mb-4 flex justify-center">
                        <img
                          src="/images/logo-wai-128.png"
                          alt="Maskot WaiChat"
                          className="h-20 w-20 rounded-2xl shadow-lg shadow-black/10"
                        />
                      </div>
                      <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink">
                        WaiChat<span className="text-muted">.</span>
                      </h2>
                      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                        <button
                          onClick={() => setView("settings")}
                          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-ink transition hover:bg-brand-strong active:scale-[0.98]"
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
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {view === "characters" && (
            <CharactersView
              characters={sorted}
              onChat={handleSelect}
              onNew={() => setShowCreate(true)}
              onEdit={(c) => setEditCharacter(c)}
              onDelete={handleDeleteCharacter}
            />
          )}

          {view === "voice" && (
            <VoiceView
              settings={settings.voice}
              onChange={(voice) => persistSettings({ ...settings, voice })}
            />
          )}

          {view === "profile" && <UserProfileView profile={profile} onSave={persistProfile} />}

          {view === "settings" && (
            <SettingsPanel
              variant="inline"
              providers={providers}
              onChange={persistProviders}
              settings={settings}
              onSettingsChange={persistSettings}
              profile={profile}
              onOpenProfile={() => setView("profile")}
              onClose={() => setView("chats")}
            />
          )}
        </div>

        {!(view === "chats" && mobileShowChat) && (
          <MobileTabBar view={view} onChange={handleViewChange} />
        )}
      </div>

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
          onBackgroundChange={(next) => handleCharacterBackground(profileCharacter.id, next)}
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
        <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex justify-center px-4 md:bottom-5">
          <div
            className="bubble-in max-w-md rounded-2xl bg-slate-900/95 px-4 py-2.5 text-center text-sm text-white shadow-xl ring-1 ring-white/10"
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
