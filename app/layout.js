import { Fraunces, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";

import { AppProviders } from "@/components/providers/app-providers";
import { themeInitScriptInnerHtml } from "@/components/theme/theme-init-script";
import { site } from "@/config/site";

import "./globals.css";

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
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
      className={`${jakartaSans.variable} ${displaySerif.variable} ${jetbrainsMono.variable}`}
      data-theme="light"
      data-density="compact"
      suppressHydrationWarning
    >
      <body
        className={`${jakartaSans.className} flex min-h-screen flex-col bg-canvas font-sans text-fg antialiased`}
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
