import type { Metadata } from "next";
import { DM_Mono, DM_Sans, Syne } from "next/font/google";

import { SiteShell } from "@/components/shell/site-shell";
import { ThemeProvider } from "@/components/theme-provider";
import { SmoothScroll } from "@/components/ui/SmoothScroll";
import { siteConfig } from "@/lib/site";

import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

const dmMono = DM_Mono({
  variable: "--font-code",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const syne = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "700", "800"],
});

const defaultTitle = "Knightowl — Free Chess Analysis Powered by Stockfish 18";
const defaultDescription = "Analyze your chess games for free. Move grades, AI coaching, accuracy scores. No signup required. Powered by Stockfish 18.";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: defaultTitle,
    template: "%s",
  },
  description: defaultDescription,
  applicationName: "Knightowl",
  keywords: [
    "chess analysis",
    "chess puzzles",
    "chess training",
    "chess perfect moves",
    "Problem to Perfect chess",
    "AI chess coach",
    "PGN analysis",
    "Lichess import",
    "Chess.com analysis",
  ],
  openGraph: {
    title: defaultTitle,
    description: defaultDescription,
    url: siteConfig.url,
    images: [
      {
        alt: "Knightowl hero landing page",
        height: 630,
        url: "/og-image.png",
        width: 1200,
      },
    ],
    siteName: "Knightowl",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${dmMono.variable} ${syne.variable} h-full scroll-smooth antialiased`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#77b82b" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Chessfork" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="min-h-full bg-[var(--background)] text-[var(--text-primary)]" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
          <SmoothScroll />
          <SiteShell>{children}</SiteShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
