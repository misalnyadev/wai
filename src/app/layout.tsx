import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

/**
 * Font di-bundle lokal (self-host) lewat next/font, bukan <link> ke Google Fonts.
 * Hasilnya: tidak ada request ke domain pihak ketiga, tidak ada layout shift,
 * dan tetap tampil sama saat offline.
 */
const displayFont = localFont({
  // Satu file variabel (latin) cukup untuk Bahasa Indonesia, ~27 KB,
  // dan otomatis di-preload oleh next/font.
  src: [
    {
      path: "./fonts/plus-jakarta-sans-latin-wght-normal.woff2",
      weight: "200 800",
      style: "normal",
    },
  ],
  variable: "--font-jakarta",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://waichat.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "WaiChat — Chat Karakter Privat",
    template: "%s · WaiChat",
  },
  description:
    "WaiChat — aplikasi chat privat untuk latihan pendalaman karakter dan peran film. Tanpa database, semua data tersimpan di perangkatmu.",
  applicationName: "WaiChat",
  keywords: [
    "chat karakter",
    "roleplay",
    "latihan akting",
    "method acting",
    "dialog film",
    "chat AI privat",
  ],
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: siteUrl,
    siteName: "WaiChat",
    title: "WaiChat — Chat Karakter Privat",
    description:
      "Chat privat dengan karakter yang terasa nyata — untuk latihan pendalaman peran, chemistry, dan dialog film.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "WaiChat — Chat Karakter Privat",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WaiChat — Chat Karakter Privat",
    description:
      "Chat privat dengan karakter yang terasa nyata — untuk latihan pendalaman peran, chemistry, dan dialog film.",
    images: ["/og.png"],
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: "WaiChat",
    /*
     * "default" = area status bar diurus iOS sendiri, konten aplikasi dimulai
     * DI BAWAH jam dan baterai.
     *
     * Ini sengaja dikembalikan ke "default" (dulu sempat "black-translucent"
     * sejak PR #22 agar video call bisa penuh sampai atas). Dengan
     * black-translucent + viewport-fit=cover, iOS menggeser seluruh halaman ke
     * atas saat keyboard muncul supaya kolom ketik terlihat — dan karena
     * halaman dikunci, geseran itu tidak bisa dikembalikan: header masuk ke
     * area status bar. Itu sumber semua masalah #24–#39.
     *
     * Layar panggilan tetap terlihat penuh: CallOverlay memanggil
     * setStatusBarColor("#0a0a0c") yang mengubah <meta name="theme-color">,
     * jadi area status bar ikut gelap seperti latar panggilan.
     */
    statusBarStyle: "default",
  },
  manifest: "/manifest.webmanifest",
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Zoom tetap diizinkan (aksesibilitas); semua field dipaksa >=16px
  // (lihat guard di globals.css) supaya iOS tidak auto-zoom saat mengetik.
  viewportFit: "cover",
  // Saat keyboard muncul, layout mengecil sehingga composer tetap terlihat.
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f0f2f5" },
    { media: "(prefers-color-scheme: dark)", color: "#17171a" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={displayFont.variable} suppressHydrationWarning>
      <head>
        {/* Terapkan tema tersimpan sebelum paint supaya tidak ada kilatan putih. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="text-ink antialiased">
        <div className="status-scrim" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
