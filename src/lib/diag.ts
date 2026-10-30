"use client";

import { useSyncExternalStore } from "react";

/**
 * Sakelar "Diagnostik tampilan".
 *
 * Dipakai untuk mengukur keadaan layar iPhone yang sebenarnya (tinggi viewport,
 * safe-area, posisi header/composer, keyboard) tanpa menebak. Hanya menampilkan
 * panel angka — tidak mengubah tata letak apa pun.
 */
const KEY = "waichat-viewport-diag";

const listeners = new Set<() => void>();
let enabled = false;
let loaded = false;

function read(): boolean {
  if (!loaded) {
    loaded = true;
    try {
      enabled = window.localStorage.getItem(KEY) === "1";
    } catch {
      enabled = false;
    }
  }
  return enabled;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useDiagEnabled(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}

export function setDiagEnabled(next: boolean) {
  enabled = next;
  loaded = true;
  try {
    window.localStorage.setItem(KEY, next ? "1" : "0");
  } catch {
    // Mode privat: cukup untuk sesi ini.
  }
  listeners.forEach((listener) => listener());
}
