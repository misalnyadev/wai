"use client";

import type { UserProfile } from "@/types/chat";
import { Avatar } from "./Avatar";
import { ThemeQuickToggle } from "./ThemeToggle";
import { ChatsIcon, GridIcon, SettingsIcon, UserIcon } from "./icons";

export type AppView = "chats" | "characters" | "profile" | "settings";

const ITEMS: {
  view: AppView;
  label: string;
  Icon: (p: { className?: string }) => React.JSX.Element;
}[] = [
  { view: "chats", label: "Chat", Icon: ChatsIcon },
  { view: "characters", label: "Karakter", Icon: GridIcon },
  { view: "profile", label: "Profil", Icon: UserIcon },
  { view: "settings", label: "Setelan", Icon: SettingsIcon },
];

/** Rail navigasi ala WhatsApp Web (desktop). */
export function NavRail({
  view,
  onChange,
  profile,
}: {
  view: AppView;
  onChange: (view: AppView) => void;
  profile: UserProfile;
}) {
  return (
    <nav className="hidden w-[74px] shrink-0 flex-col items-center gap-1 border-r border-line bg-header py-3 md:flex">
      <button
        onClick={() => onChange("profile")}
        className="mb-2 rounded-full ring-2 ring-transparent transition hover:ring-brand-accent/60"
        title={profile.name ? `Profil: ${profile.name}` : "Isi profil kamu"}
        aria-label="Profil saya"
      >
        <Avatar name={profile.nickname || profile.name || "Kamu"} src={profile.avatarUrl} size={40} />
      </button>

      {ITEMS.map(({ view: item, label, Icon }) => {
        const active = view === item;
        return (
          <button
            key={item}
            onClick={() => onChange(item)}
            title={label}
            aria-label={label}
            aria-current={active}
            className="group flex w-full flex-col items-center gap-1 py-1.5"
          >
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                active
                  ? "bg-brand-accent/15 text-brand"
                  : "text-ink-soft group-hover:bg-line/60 group-hover:text-ink"
              }`}
            >
              <Icon className="h-5 w-5" />
            </span>
            <span
              className={`text-[10px] font-medium ${active ? "text-brand" : "text-ink-soft"}`}
            >
              {label}
            </span>
          </button>
        );
      })}

      <div className="mt-auto">
        <ThemeQuickToggle />
      </div>
    </nav>
  );
}

/** Bilah tab bawah ala WhatsApp (mobile). */
export function MobileTabBar({
  view,
  onChange,
}: {
  view: AppView;
  onChange: (view: AppView) => void;
}) {
  return (
    <nav className="flex shrink-0 items-stretch border-t border-line bg-header pb-[env(safe-area-inset-bottom)] md:hidden">
      {ITEMS.map(({ view: item, label, Icon }) => {
        const active = view === item;
        return (
          <button
            key={item}
            onClick={() => onChange(item)}
            aria-current={active}
            className="flex flex-1 flex-col items-center gap-0.5 py-2"
          >
            <span
              className={`flex h-8 w-14 items-center justify-center rounded-full transition ${
                active ? "bg-brand-accent/15 text-brand" : "text-ink-soft"
              }`}
            >
              <Icon className="h-5 w-5" />
            </span>
            <span
              className={`text-[10px] font-medium ${active ? "text-brand" : "text-ink-soft"}`}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
