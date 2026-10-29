"use client";

import { useEffect, useSyncExternalStore } from "react";

type Row = { label: string; value: string };

/**
 * Halaman bantu (tidak ditautkan dari menu) untuk memeriksa ukuran viewport
 * di perangkat nyata — dipakai saat ada laporan tata letak yang hanya muncul
 * di HP tertentu. Buka /cek-layar lalu salin angkanya.
 */

let snapshot = "";
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function getSnapshot() {
  return snapshot;
}

function getServerSnapshot() {
  return "";
}

function measure(): Row[] {
  const view = window.visualViewport;
  const shell = document.querySelector(".app-shell");

  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;top:0;left:0;width:1px;height:1px;visibility:hidden;pointer-events:none";
  document.body.appendChild(probe);

  probe.style.height = "env(safe-area-inset-top, 0px)";
  const safeTop = probe.offsetHeight;
  probe.style.height = "env(safe-area-inset-bottom, 0px)";
  const safeBottom = probe.offsetHeight;
  probe.style.height = "100dvh";
  const dvh = probe.offsetHeight;
  probe.remove();

  return [
    { label: "innerWidth × innerHeight", value: `${window.innerWidth} × ${window.innerHeight}` },
    {
      label: "documentElement.clientHeight",
      value: `${document.documentElement.clientHeight} px`,
    },
    {
      label: "visualViewport.height",
      value: view
        ? `${Math.round(view.height)} px · scale ${view.scale.toFixed(2)} · offsetTop ${Math.round(
            view.offsetTop
          )}`
        : "tidak tersedia",
    },
    { label: "100dvh", value: `${dvh} px` },
    {
      label: "screen",
      value: `${window.screen.width} × ${window.screen.height} @ ${window.devicePixelRatio}×`,
    },
    { label: "safe-area top / bottom", value: `${safeTop} px / ${safeBottom} px` },
    {
      label: "display-mode standalone",
      value: window.matchMedia("(display-mode: standalone)").matches ? "ya" : "tidak",
    },
    {
      label: "tinggi .app-shell",
      value: shell ? `${Math.round(shell.getBoundingClientRect().height)} px` : "tidak ada",
    },
    { label: "tinggi body", value: `${Math.round(document.body.getBoundingClientRect().height)} px` },
    { label: "scrollY", value: `${Math.round(window.scrollY)} px` },
    { label: "user agent", value: navigator.userAgent },
  ];
}

function publish() {
  snapshot = JSON.stringify(measure());
  listeners.forEach((fn) => fn());
}

export default function CekLayarPage() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    publish();
    window.addEventListener("resize", publish);
    window.addEventListener("orientationchange", publish);
    window.visualViewport?.addEventListener("resize", publish);
    return () => {
      window.removeEventListener("resize", publish);
      window.removeEventListener("orientationchange", publish);
      window.visualViewport?.removeEventListener("resize", publish);
    };
  }, []);

  const rows: Row[] = raw ? (JSON.parse(raw) as Row[]) : [];
  const plain = rows.map((row) => `${row.label}: ${row.value}`).join("\n");

  return (
    <div className="app-shell overflow-y-auto bg-app">
      <div className="mx-auto w-full max-w-xl px-4 pb-[calc(var(--tabbar-space)+1rem)] pt-[max(1.25rem,env(safe-area-inset-top))]">
        <h1 className="font-display text-xl font-extrabold tracking-tight text-ink">Cek layar</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Halaman bantu untuk memeriksa ukuran viewport di perangkat ini. Angka di bawah dipakai
          untuk mendiagnosis tata letak yang hanya aneh di HP tertentu.
        </p>

        <div className="mt-4 overflow-hidden rounded-2xl bg-surface ring-1 ring-line">
          {rows.length === 0 && <p className="px-4 py-6 text-sm text-muted">Mengukur...</p>}
          {rows.map((row, index) => (
            <div
              key={row.label}
              className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-4 py-2.5 text-sm ${
                index > 0 ? "border-t border-line" : ""
              }`}
            >
              <span className="text-ink-soft">{row.label}</span>
              <span className="break-all font-mono text-[13px] text-ink">{row.value}</span>
            </div>
          ))}
        </div>

        <p className="mt-3 text-xs text-muted">
          Tidak perlu login. Halaman ini hanya membaca ukuran layar, tidak mengirim apa pun.
        </p>
      </div>
    </div>
  );
}
