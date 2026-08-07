import type { Metadata } from "next";

import { ShopPage } from "@/components/shop/shop-page";
import { createSeoMetadata } from "@/lib/seo/metadata";

export function generateMetadata(): Metadata {
  return createSeoMetadata({
    title: "Shop — Chessfork Merch",
    description:
      "Official Chessfork merch. Apparel, stickers, caps, headphones, and collectibles for players who analyze everything. Pay with UPI, cards, or net banking.",
    path: "/shop",
  });
}

export default function Page() {
  return <ShopPage />;
}