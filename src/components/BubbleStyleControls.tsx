"use client";

import { useState } from "react";
import type { BubbleStyle } from "@/types/chat";
import { bubbleInk, bubblePaint, colorLuminance } from "@/lib/bubbleStyle";

/**
 * Pilihan warna siap pakai. Memakai chip (bukan pemilih warna bebas) supaya
 * bisa ditekan cepat di iPhone dan tidak membuka dialog sistem di tengah chat.
 * `null` = ikut tema terang/gelap yang sedang aktif.
 */
const COLORS: { value: string | null; label: string }[] = [
  { value: null, label: "Bawaan" },
  { value: "#ffffff", label: "Putih" },
  { value: "#101114", label: "Hitam" },
  { value: "#f6e7c1", label: "Krem" },
  { value: "#0f172a", label: "Malam" },
  { value: "#1f3d2f", label: "Hijau" },
];

/** Latar yang kontras untuk sebuah warna teks (dan sebaliknya). */
const DARK_BG = "#0f172a";
const LIGHT_BG = "#ffffff";

function ColorChips({
  value,
  onChange,
  label,
}: {
  value: string | null;
  onChange: (next: string | null) => void;
  label: string;
}) {
  return (
    <div>
      <span className="mb-1 block text-[12px] font-medium text-ink-soft">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {COLORS.map((c) => {
          const active = (value ?? null) === c.value;
          return (
            <button
              key={c.label}
              type="button"
              onClick={() => onChange(c.value)}
              aria-pressed={active}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium transition ${
                active
                  ? "bg-ink text-surface"
                  : "border border-line bg-surface text-ink-soft hover:bg-surface-2"
              }`}
            >
              {c.value ? (
                <span
                  className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/15 dark:ring-white/20"
                  style={{ backgroundColor: c.value }}
                />
              ) : (
                <span className="h-3 w-3 shrink-0 rounded-full border border-dashed border-current" />
              )}
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Pengaturan gelembung pesan milik satu karakter.
 *
 * Ditempatkan di profil karakter (bukan di Setelan) karena latar tiap karakter
 * berbeda: video terang butuh teks gelap, video gelap butuh teks terang.
 * `value === null` berarti karakter ini masih mengikuti setelan bawaan.
 */
export function BubbleStyleControls({
  value,
  fallback,
  onChange,
}: {
  value: BubbleStyle | null;
  fallback: BubbleStyle;
  onChange: (next: BubbleStyle | null) => void;
}) {
  const style = value ?? fallback;
  /** Kepekatan sementara saat jari masih di slider; disimpan ketika dilepas. */
  const [opacityDraft, setOpacityDraft] = useState<number | null>(null);
  const opacity = opacityDraft ?? style.opacity;

  function update(patch: Partial<BubbleStyle>) {
    onChange({ ...style, ...patch });
  }

  /**
   * Saat hanya salah satu warna dipilih, pasangkan yang lain otomatis supaya
   * teks tidak pernah hilang di atas latarnya. Pengguna tetap bisa mengganti
   * pasangannya sesudah ini.
   */
  function chooseTextColor(next: string | null) {
    const patch: Partial<BubbleStyle> = { textColor: next };
    if (next && !style.bgColor) patch.bgColor = colorLuminance(next) > 0.5 ? DARK_BG : LIGHT_BG;
    update(patch);
  }

  function chooseBgColor(next: string | null) {
    const patch: Partial<BubbleStyle> = { bgColor: next };
    if (next && !style.textColor) patch.textColor = colorLuminance(next) > 0.5 ? "#101114" : "#ffffff";
    update(patch);
  }

  return (
    <div className="space-y-2.5">
      <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-line px-3 py-2">
        <span className="min-w-0">
          <span className="block text-xs font-medium text-ink">Tembus pandang</span>
          <span className="block text-[12px] leading-snug text-muted">
            Latar gelembung dibuat bening supaya video atau gambar di belakangnya tetap terlihat.
          </span>
        </span>
        <input
          type="checkbox"
          checked={Boolean(style.glass)}
          onChange={(e) => update({ glass: e.target.checked })}
          className="mt-0.5 h-5 w-5 shrink-0 accent-ink"
        />
      </label>

      <div className="rounded-xl border border-line px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-ink-soft">Kepekatan gelembung</span>
          <span className="text-xs font-semibold text-ink">{opacity}%</span>
        </div>
        <input
          type="range"
          min={20}
          max={95}
          step={5}
          value={opacity}
          onChange={(e) => setOpacityDraft(Number(e.target.value))}
          onPointerUp={(e) => {
            setOpacityDraft(null);
            update({ opacity: Number(e.currentTarget.value) });
          }}
          onKeyUp={(e) => {
            setOpacityDraft(null);
            update({ opacity: Number(e.currentTarget.value) });
          }}
          onBlur={(e) => {
            setOpacityDraft(null);
            update({ opacity: Number(e.currentTarget.value) });
          }}
          aria-label="Kepekatan gelembung pesan"
          className="mt-1 w-full accent-ink"
        />
        <p className="mt-1 text-[12px] leading-snug text-muted">
          Makin kecil, latar di belakang pesan makin kelihatan.
        </p>
      </div>

      <ColorChips
        label="Warna teks pesan"
        value={style.textColor ?? null}
        onChange={chooseTextColor}
      />

      <ColorChips
        label="Warna latar gelembung"
        value={style.bgColor ?? null}
        onChange={chooseBgColor}
      />

      <p className="text-[12px] leading-snug text-muted">
        Video terang → pilih teks Hitam. Video gelap → pilih teks Putih. Pasangan warnanya diatur
        otomatis supaya pesan tetap terbaca; Anda bisa mengubahnya lagi kapan saja.
      </p>

      {/* Pratinjau supaya keterbacaan bisa dinilai tanpa keluar dari profil. */}
      <div className="rounded-xl border border-line px-3 py-2">
        <span className="mb-1.5 block text-[12px] font-medium text-ink-soft">Pratinjau</span>
        <div className="flex flex-col gap-1.5">
          <span
            className="max-w-[85%] self-start rounded-2xl rounded-bl-sm bg-bubble-in px-3 py-1.5 text-sm text-bubble-in-ink shadow-sm"
            style={{ ...bubblePaint(style, "in"), ...bubbleInk(style) }}
          >
            Pesan dari karakter
          </span>
          <span
            className="max-w-[85%] self-end rounded-2xl rounded-br-sm bg-bubble-out px-3 py-1.5 text-sm text-bubble-out-ink shadow-sm"
            style={{ ...bubblePaint(style, "out"), ...bubbleInk(style) }}
          >
            Pesan dari kamu
          </span>
        </div>
      </div>

      {value !== null && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="w-full rounded-lg border border-line py-2 text-xs font-semibold text-ink-soft transition hover:bg-surface-2 hover:text-ink"
        >
          Kembalikan ke bawaan
        </button>
      )}
    </div>
  );
}
