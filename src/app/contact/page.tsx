import type { Metadata } from "next";

import { createSeoMetadata } from "@/lib/seo/metadata";

export function generateMetadata(): Metadata {
  return createSeoMetadata({
    title: "Contact Chessfork",
    description: "Get in touch with the Chessfork team. Support, feedback, and partnership inquiries.",
    path: "/contact",
  });
}

export default function ContactPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl rounded-[18px] border bg-[var(--bg-card)] p-8 text-center shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Contact</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          Questions, feedback, or partnership ideas? For questions, feedback, or support, email us at <a href="mailto:contact@chessfork.com" className="text-[var(--accent)] hover:underline">contact@chessfork.com</a>.
        </p>
      </div>
    </div>
  );
}
