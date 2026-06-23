import type { Metadata } from "next";

import { CTA } from "@/components/landing/CTA";
import { Features } from "@/components/landing/Features";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Marquee } from "@/components/landing/Marquee";
import { Navbar } from "@/components/landing/Navbar";
import { ScrollProgressBar } from "@/components/landing/ScrollProgressBar";
import { Stats } from "@/components/landing/Stats";
import { Testimonials } from "@/components/landing/Testimonials";

const title = "Knightowl — Free Chess Analysis Powered by Stockfish 18";
const description = "Analyze your chess games for free. Move grades, AI coaching, accuracy scores. No signup required. Powered by Stockfish 18.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    images: [
      {
        alt: "Knightowl hero landing page",
        height: 630,
        url: "/og-image.png",
        width: 1200,
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-image.png"],
  },
};

export default function Page() {
  return (
    <>
      <ScrollProgressBar />
      <main className="knightowl-landing min-h-screen overflow-x-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <Navbar />
        <Hero />
        <Marquee />
        <Features />
        <HowItWorks />
        <Stats />
        <Testimonials />
        <CTA />
        <Footer />
      </main>
    </>
  );
}
