"use client";

import { useEffect, useRef, useState } from "react";
import { setDiagEnabled, useDiagEnabled } from "@/lib/diag";
import { XIcon } from "./icons";

type Snapshot = { lines: string[]; verdict: string[] };

type ProbeState = {
  /** Keadaan layar saat ini. */
  now: Snapshot;
  /** Keadaan terakhir yang terekam ketika keyboard terbuka. */
  lastOpen: Snapshot | null;
};

/** Angka bulat + satuan px, supaya enak dibaca di screenshot. */
function px(value: number) {
  return `${Math.round(value)}px`;
}

function rectOf(selector: string) {
  const el = document.querySelector(selector);
  if (!el) return null;
  const box = el.getBoundingClientRect();
  return { top: box.top, bottom: box.bottom, height: box.height };
}

/**
 * Panel pengukur tampilan.
 *
 * Muncul hanya bila dinyalakan dari Setelan → Diagnostik tampilan. Isinya
 * keadaan viewport saat ini (termasuk saat keyboard terbuka) sehingga masalah
 * "composer jauh dari keyboard" bisa diukur, bukan ditebak.
 *
 * Semua pengukuran dilakukan di dalam timer/event, bukan saat render, supaya
 * tidak ada pembacaan layout di tengah proses render React.
 */
export function ViewportProbe() {
  const active = useDiagEnabled();
  const [snap, setSnap] = useState<ProbeState | null>(null);
  const [copied, setCopied] = useState(false);
  const vhRef = useRef<HTMLDivElement>(null);
  const dvhRef = useRef<HTMLDivElement>(null);
  const svhRef = useRef<HTMLDivElement>(null);
  const lvhRef = useRef<HTMLDivElement>(null);
  const safeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;

    function measure() {
      const vv = window.visualViewport;
      const safe = safeRef.current ? getComputedStyle(safeRef.current) : null;
      const safeTop = safe ? parseFloat(safe.paddingTop) || 0 : 0;
      const safeBottom = safe ? parseFloat(safe.paddingBottom) || 0 : 0;

      const header = rectOf('[data-probe="header"]');
      const composer = rectOf('[data-probe="composer"]');
      const activeEl = document.activeElement;
      const focusTag = activeEl ? activeEl.tagName.toLowerCase() : "—";

      const vvHeight = vv?.height ?? window.innerHeight;
      const vvTop = vv?.offsetTop ?? 0;
      const keyboard = Math.max(0, window.innerHeight - vvHeight - vvTop);
      // Sisa ruang antara tepi bawah composer dan tepi atas keyboard.
      // Positif = ada celah kosong, negatif = composer tertutup keyboard.
      const gap = composer ? vvTop + vvHeight - composer.bottom : null;

      const lines = [
        `mode: ${window.matchMedia("(display-mode: standalone)").matches ? "standalone (ter-install)" : "browser"}`,
        `layar: ${window.screen.width}×${window.screen.height} @${window.devicePixelRatio}x`,
        `innerWidth/innerHeight: ${window.innerWidth}×${window.innerHeight}`,
        `visualViewport: ${
          vv ? `${Math.round(vv.width)}×${Math.round(vv.height)}` : "tidak ada"
        }${vv ? ` · offsetTop ${Math.round(vv.offsetTop)} · scale ${vv.scale.toFixed(2)}` : ""}`,
        `documentElement: clientH ${px(document.documentElement.clientHeight)} · scrollTop ${
          document.documentElement.scrollTop
        } · bodyH ${px(document.body.clientHeight)}`,
        `unit: vh ${px(vhRef.current?.offsetHeight ?? 0)} · dvh ${px(
          dvhRef.current?.offsetHeight ?? 0
        )} · svh ${px(svhRef.current?.offsetHeight ?? 0)} · lvh ${px(
          lvhRef.current?.offsetHeight ?? 0
        )}`,
        `safe-area: atas ${px(safeTop)} · bawah ${px(safeBottom)}`,
        `field aktif: ${focusTag}`,
        `header: ${
          header
            ? `atas ${px(header.top)} · bawah ${px(header.bottom)} · tinggi ${px(header.height)}`
            : "tidak terlihat"
        }`,
        `composer: ${
          composer ? `atas ${px(composer.top)} · bawah ${px(composer.bottom)}` : "tidak terlihat"
        }`,
        `perkiraan keyboard: ${px(keyboard)}`,
        `celah composer→keyboard: ${gap === null ? "?" : px(gap)}`,
      ];

      const verdict: string[] = [];
      if (header && header.top < safeTop - 1) {
        verdict.push("Header masuk area status bar (atas header < safe-area atas).");
      }
      if (gap !== null && gap > 24 && keyboard > 100) {
        verdict.push("Ada celah antara composer dan keyboard.");
      }
      if (vv && Math.abs(vv.scale - 1) > 0.01) verdict.push("Halaman sedang di-zoom.");
      if (verdict.length === 0) verdict.push("Tidak ada masalah terdeteksi pada keadaan ini.");

      const snapshot: Snapshot = { lines, verdict };
      // Keyboard dianggap terbuka bila area terlihat menyusut > 120px.
      const keyboardOpen = keyboard > 120;
      setSnap((prev) => ({
        now: snapshot,
        // Disimpan supaya bisa dibaca/di-copy setelah keyboard ditutup.
        lastOpen: keyboardOpen ? snapshot : (prev?.lastOpen ?? null),
      }));
    }

    // Timer pertama (bukan langsung di badan effect) supaya semua elemen
    // pengukur sudah terpasang dan render tidak memicu peringatan lint.
    const first = window.setTimeout(measure, 60);
    const id = window.setInterval(measure, 250);

    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [active]);

  if (!active) return null;

  async function copyReport() {
    if (!snap) return;
    const sections = [
      "WaiChat — laporan tampilan",
      "",
      "=== SAAT INI ===",
      ...snap.now.lines,
      ...snap.now.verdict,
      "",
      "=== SAAT KEYBOARD TERBUKA (terakhir) ===",
      ...(snap.lastOpen
        ? [...snap.lastOpen.lines, ...snap.lastOpen.verdict]
        : ["belum terekam — buka keyboard sebentar lalu tutup lagi"]),
    ];
    try {
      await navigator.clipboard.writeText(sections.join("\n"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      {/* Pengukur tak terlihat: tinggi tiap unit viewport & safe-area. */}
      <div aria-hidden="true" className="pointer-events-none fixed left-0 top-0 opacity-0">
        <div ref={vhRef} style={{ height: "100vh", width: 1 }} />
        <div ref={dvhRef} style={{ height: "100dvh", width: 1 }} />
        <div ref={svhRef} style={{ height: "100svh", width: 1 }} />
        <div ref={lvhRef} style={{ height: "100lvh", width: 1 }} />
        <div
          ref={safeRef}
          style={{
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
            width: 0,
            height: 0,
          }}
        />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-[95] max-h-[65vh] overflow-y-auto border-t border-white/15 bg-black/90 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 font-mono text-[11px] leading-relaxed text-lime-300">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="font-sans text-[11px] font-semibold uppercase tracking-wide text-white/70">
            Diagnostik tampilan
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void copyReport()}
              disabled={!snap}
              className="rounded-full bg-white/15 px-2.5 py-1 font-sans text-[11px] font-semibold text-white disabled:opacity-50"
            >
              {copied ? "Tersalin ✓" : "Salin laporan"}
            </button>
            <button
              type="button"
              onClick={() => setDiagEnabled(false)}
              aria-label="Tutup diagnostik"
              className="rounded-full bg-white/15 p-1 text-white"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {snap ? (
          <>
            <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">Saat ini</div>
            {snap.now.lines.map((line) => (
              <div key={line}>{line}</div>
            ))}
            <div className="text-amber-300">{snap.now.verdict.join(" ")}</div>

            <div className="mt-2 border-t border-white/15 pt-1 text-[10px] uppercase tracking-wide text-white/45">
              Saat keyboard terbuka (terakhir)
            </div>
            {snap.lastOpen ? (
              <>
                {snap.lastOpen.lines.map((line) => (
                  <div key={line}>{line}</div>
                ))}
                <div className="text-amber-300">{snap.lastOpen.verdict.join(" ")}</div>
              </>
            ) : (
              <div className="text-white/60">
                Belum terekam — buka keyboard sebentar, lalu tutup lagi.
              </div>
            )}
          </>
        ) : (
          <div className="text-white/60">Mengukur…</div>
        )}
      </div>
    </>
  );
}
