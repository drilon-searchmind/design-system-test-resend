import {
  Fraunces,
  Geist,
  Geist_Mono,
  Inter,
  Instrument_Serif,
  JetBrains_Mono,
} from "next/font/google";

import { AppProviders } from "@/components/providers/app-providers";
import { themeInitScriptInnerHtml } from "@/components/theme/theme-init-script";
import { site } from "@/config/site";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

/** Tally / Hallmark marketing — Geist + Instrument Serif italic accent */
const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument-serif",
  style: ["normal", "italic"],
  weight: ["400"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains",
});

/**
 * DESIGN.md uses Domaine Display for display serif — not on Google Fonts.
 * Fraunces gives a similar editorial / luxury feel until you add Domaine via `next/font/local`.
 */
const displaySerif = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display-serif",
});

export const metadata = {
  title: "1337-crm by Searchmind",
  description: site.description,
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${displaySerif.variable} ${jetbrainsMono.variable} ${geist.variable} ${geistMono.variable} ${instrumentSerif.variable}`}
      data-theme="light"
      data-density="compact"
      suppressHydrationWarning
    >
      <body
        data-surface="marketing-tally"
        className={`${inter.className} flex min-h-screen flex-col bg-canvas font-sans text-fg antialiased`}
        suppressHydrationWarning
      >
        <script
          dangerouslySetInnerHTML={{ __html: themeInitScriptInnerHtml() }}
          suppressHydrationWarning
        />
        <AppProviders>
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </AppProviders>
      </body>
    </html>
  );
}
