import type { Metadata } from "next";

import { FeaturesPage } from "@/components/features/features-page";
import { createSeoMetadata } from "@/lib/seo/metadata";

export function generateMetadata(): Metadata {
  return createSeoMetadata({
    title: "Chessfork Features",
    description: "Compare Chessfork guest analysis with a free account. Analysis is free; accounts add synced history and coaching.",
    path: "/features",
  });
}

export default function Page() {
  return <FeaturesPage />;
}
