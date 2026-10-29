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
    default: "Persona — Chat Karakter Privat",
    template: "%s · Persona",
  },
  description:
    "Aplikasi chat privat untuk latihan pendalaman karakter dan peran film. Tanpa database — semua data tersimpan di perangkatmu.",
  applicationName: "Persona",
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
    siteName: "Persona",
    title: "Persona — Chat Karakter Privat",
    description:
      "Chat privat dengan karakter yang terasa nyata — untuk latihan pendalaman peran, chemistry, dan dialog film.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Persona — Chat Karakter Privat",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Persona — Chat Karakter Privat",
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
    title: "Persona",
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
  // Zoom tetap diizinkan (aksesibilitas); input sudah 16px agar iOS tidak auto-zoom.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f0f2f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0b141a" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={displayFont.variable} suppressHydrationWarning>
      <head>
        {/* Terapkan tema tersimpan sebelum paint supaya tidak ada kilatan putih. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="bg-app text-ink antialiased">{children}</body>
    </html>
  );
}
