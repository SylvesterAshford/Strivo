import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif, JetBrains_Mono, Noto_Sans_Myanmar, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/app/Providers";

// Type scale fonts (design.md 5). Exposed as CSS variables consumed by the
// font stacks in src/rn (each stack falls back to Noto Sans Myanmar so Burmese
// renders without tofu).
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-serif", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk", display: "swap" });
const myanmar = Noto_Sans_Myanmar({ subsets: ["myanmar"], weight: ["400", "500"], variable: "--font-myanmar", display: "swap" });

export const metadata: Metadata = {
  title: "Strivo — AI business assistant",
  description: "Burmese-first AI business assistant for Myanmar MSMEs. Log sales and expenses, get financial reports and AI insights.",
  icons: { icon: "/favicon.png" },
};

export const viewport: Viewport = {
  themeColor: "#F8F5FB",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${serif.variable} ${mono.variable} ${grotesk.variable} ${myanmar.variable}`}
    >
      {/* Browser extensions (ColorZilla's cz-shortcut-listen, Grammarly, etc.)
          inject attributes onto <body> before React hydrates. suppressHydrationWarning
          scopes React to ignore attribute diffs on this one element. */}
      <body suppressHydrationWarning>
        <Providers>
          <div id="app-frame">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
