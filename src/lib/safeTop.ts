"use client";

import { useEffect } from "react";
import { maxObservedShift } from "@/lib/scrollGuard";

/**
 * Jarak aman atas (tinggi status bar iPhone) sebagai jaring pengaman.
 *
 * Masalah: di iOS 26 dengan `black-translucent`, `env(safe-area-inset-top)`
 * terbaca **0** walaupun halaman memakai `viewport-fit=cover`. Header chat
 * hanya mendapat jarak 10 px dan sebagian tertutup jam/baterai.
 *
 * Pendekatan di sini TIDAK menebak lewat media query, dan tidak bergantung
 * pada `env()` saja: tinggi status bar dihitung dari ukuran layar perangkat
 * (tabel di bawah), lalu diambil yang paling besar antara angka itu dan hasil
 * pengukuran `env()`. Hasilnya ditulis langsung sebagai `--safe-top` di <html>,
 * jadi tidak bisa dikalahkan aturan CSS mana pun.
 */

/**
 * Tinggi status bar per ukuran layar iPhone (portrait, satuan CSS px).
 * Sumber: ukuran layar CSS tiap model vs tinggi status bar-nya.
 */
const STATUS_BAR: Record<string, number> = {
  "320x568": 20, // SE (generasi 1)
  "375x667": 20, // SE (2/3), iPhone 8
  "414x736": 20, // 8 Plus
  "375x812": 44, // X, XS, 11 Pro, 12 mini, 13 mini
  "390x844": 47, // 12, 13, 14
  "393x852": 59, // 14 Pro, 15, 15 Pro, 16
  "402x874": 62, // 16 Pro, 17
  "414x896": 48, // XR, 11, 11 Pro Max
  "428x926": 47, // 12/13 Pro Max, 14 Plus
  "430x932": 59, // 14 Pro Max, 15 Plus, 15/16 Pro Max
  "440x956": 62, // 16 Pro Max, 17 Pro Max
};

/** Layar tinggi tanpa tombol Home: hampir pasti iPhone berponi. */
const NOTCHED_FALLBACK = 59;
/** Layar pendek (ada tombol Home). */
const OLD_FALLBACK = 44;

function screenSize(): { w: number; h: number } {
  const w = Math.round(window.screen.width);
  const h = Math.round(window.screen.height);
  return { w: Math.min(w, h), h: Math.max(w, h) };
}

/** Tinggi status bar menurut ukuran layar (fallback: 59 px untuk iPhone berponi). */
export function deviceStatusBarHeight(): number {
  const { w, h } = screenSize();
  const exact = STATUS_BAR[`${w}x${h}`];
  if (exact) return exact;
  return h >= 800 ? NOTCHED_FALLBACK : OLD_FALLBACK;
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return true;
  // iPadOS 13+ memakai user agent Macintosh; bedakan lewat jumlah titik sentuh.
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
}

/** Apakah berjalan sebagai aplikasi ter-install (bukan tab Safari). */
function isAppMode(): boolean {
  if (typeof navigator === "undefined") return false;
  if ((navigator as Navigator & { standalone?: boolean }).standalone === true) return true;
  const mq = (mode: string) => window.matchMedia(`(display-mode: ${mode})`).matches;
  if (mq("standalone") || mq("fullscreen") || mq("minimal-ui")) return true;
  // Cadangan: di aplikasi ter-install tinggi jendela = tinggi layar.
  return window.screen.height - window.innerHeight < 100;
}

/** Baca nilai env(safe-area-inset-top) yang benar-benar dipakai browser. */
function readInsetTop(): number {
  const probe = document.createElement("div");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText =
    "position:fixed;top:0;left:0;width:1px;height:env(safe-area-inset-top,0px);" +
    "padding:0;margin:0;border:0;visibility:hidden;pointer-events:none;";
  document.documentElement.appendChild(probe);
  const value = probe.getBoundingClientRect().height;
  probe.remove();
  return value;
}

/** Jarak aman atas yang dipakai: ukuran layar vs env(), ambil yang terbesar. */
export function resolveSafeTop(): number {
  const measured = readInsetTop();
  if (!isAppMode()) return Math.max(measured, 0);
  return Math.max(measured, deviceStatusBarHeight());
}

export function useSafeTop() {
  useEffect(() => {
    const root = document.documentElement;

    const apply = () => {
      if (!isIOS()) return;
      root.style.setProperty("--safe-top", `${Math.round(resolveSafeTop())}px`);
    };

    apply();
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);

    return () => {
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
    };
  }, []);
}

/**
 * Keterangan singkat untuk halaman Setelan — dipakai sementara untuk memastikan
 * angka yang dipakai di perangkat pengguna sudah benar.
 */
export function describeSafeTop(): string {
  if (typeof window === "undefined") return "";
  const { w, h } = screenSize();
  const measured = Math.round(readInsetTop());
  const applied = Math.round(resolveSafeTop());
  const shifted = maxObservedShift();
  return `Layar ${w}×${h} · env ${measured} px · ${isAppMode() ? "app" : "browser"} · jarak atas ${applied} px · geser ${shifted} px`;
}
