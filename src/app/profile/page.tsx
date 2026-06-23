import type { Metadata } from "next";

import { ProfilePage } from "@/components/profile/profile-page";
import { createSeoMetadata } from "@/lib/seo/metadata";

export function generateMetadata(): Metadata {
  return createSeoMetadata({
    title: "Chessfork Profile",
    description: "Track Chessfork badges, chess analysis streaks, accuracy trends, openings, and daily activity.",
    path: "/profile",
  });
}

export default function Page() {
  return <ProfilePage />;
}
