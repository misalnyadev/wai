"use client";

import { useState } from "react";
import type { BubbleStyle } from "@/types/chat";
import {
  bubbleInk,
  bubblePaint,
  readableBg,
  readableInk,
  type BubbleRole,
} from "@/lib/bubbleStyle";
import { Switch } from "./Switch";

/**
 * Pilihan warna siap pakai. Chip warna (bukan pemilih warna bebas) supaya bisa
 * ditekan cepat di iPhone dan tidak membuka dialog sistem di tengah chat.
 * `null` = ikut tema terang/gelap yang sedang aktif.
 */
const COLORS: { value: string | null; label: string; hex: string | null }[] = [
  { value: null, label: "Ikut tema", hex: null },
  { value: "#ffffff", label: "Putih", hex: "#ffffff" },
  { value: "#101114", label: "Hitam", hex: "#101114" },
  { value: "#f6e7c1", label: "Krem", hex: "#f6e7c1" },
  { value: "#0f172a", label: "Malam", hex: "#0f172a" },
  { value: "#1f3d2f", label: "Hijau", hex: "#1f3d2f" },
];

/** Satu baris chip warna: label kecil di kiri, bulatan warna di kanan. */
function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (next: string | null) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-11 shrink-0 text-[12px] text-muted">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {COLORS.map((c) => {
          const active = (value ?? null) === c.value;
          return (
            <button
              key={c.label}
              type="button"
              onClick={() => onChange(c.value)}
              aria-label={`${label}: ${c.label}`}
              aria-pressed={active}
              title={c.label}
              className={`grid h-8 w-8 place-items-center rounded-full transition ${
                active ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : "ring-1 ring-line"
              }`}
              style={
                c.hex
                  ? { backgroundColor: c.hex }
                  : {
                      // Chip "ikut tema": garis miring tanda warna otomatis.
                      backgroundImage:
                        "repeating-linear-gradient(45deg, transparent, transparent 3px, var(--line) 3px, var(--line) 5px)",
                    }
              }
            />
          );
        })}
      </div>
    </div>
  );
}

/** Satu sisi gelembung: warna teks + warna latar. */
function SideColors({
  title,
  style,
  role,
  onPick,
}: {
  title: string;
  style: BubbleStyle;
  role: BubbleRole;
  onPick: (patch: Partial<BubbleStyle>) => void;
}) {
  const text = role === "in" ? style.textColorIn : style.textColorOut;
  const bg = role === "in" ? style.bgColorIn : style.bgColorOut;
  const textKey = role === "in" ? "textColorIn" : "textColorOut";
  const bgKey = role === "in" ? "bgColorIn" : "bgColorOut";

  /**
   * Memilih satu warna saja bisa membuat teks hilang di atas latarnya, jadi
   * pasangannya diisi otomatis dengan warna yang kontras. Tetap bisa diubah.
   */
  function pickText(next: string | null) {
    const patch: Partial<BubbleStyle> = { [textKey]: next };
    if (next && !bg) patch[bgKey] = readableBg(next);
    onPick(patch);
  }

  function pickBg(next: string | null) {
    const patch: Partial<BubbleStyle> = { [bgKey]: next };
    if (next && !text) patch[textKey] = readableInk(next);
    onPick(patch);
  }

  return (
    <div className="space-y-2">
      <span className="block text-[12px] font-semibold text-ink">{title}</span>
      <ColorRow label="Teks" value={text ?? null} onChange={pickText} />
      <ColorRow label="Latar" value={bg ?? null} onChange={pickBg} />
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

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-line px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-ink">Tembus pandang</span>
          <div className="flex items-center gap-2">
            {style.glass && <span className="text-xs font-semibold text-ink-soft">{opacity}%</span>}
            <Switch
              checked={Boolean(style.glass)}
              onChange={(next) => update({ glass: next })}
              label="Tembus pandang"
            />
          </div>
        </div>
        {style.glass && (
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
            className="mt-2 w-full accent-ink"
          />
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-line px-3 py-2.5">
        <SideColors title="Gelembung karakter" style={style} role="in" onPick={update} />
        <div className="border-t border-line" />
        <SideColors title="Gelembung kamu" style={style} role="out" onPick={update} />
      </div>

      <div className="flex flex-col gap-1.5 rounded-xl border border-line px-3 py-2.5">
        <span
          className="max-w-[85%] self-start rounded-2xl rounded-bl-sm bg-bubble-in px-3 py-1.5 text-sm text-bubble-in-ink shadow-sm"
          style={{ ...bubblePaint(style, "in"), ...bubbleInk(style, "in") }}
        >
          Pesan dari karakter
        </span>
        <span
          className="max-w-[85%] self-end rounded-2xl rounded-br-sm bg-bubble-out px-3 py-1.5 text-sm text-bubble-out-ink shadow-sm"
          style={{ ...bubblePaint(style, "out"), ...bubbleInk(style, "out") }}
        >
          Pesan dari kamu
        </span>
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
