import type { Metadata } from "next";

import { siteConfig } from "@/lib/site";

export function absoluteSeoTitle(title: string) {
  return title.includes(siteConfig.name) ? title : `${title} | ${siteConfig.name}`;
}

export function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function createSeoMetadata({
  description,
  image,
  path,
  title,
  type = "website",
}: {
  description: string;
  image?: string;
  path: string;
  title: string;
  type?: "article" | "profile" | "website";
}): Metadata {
  const absoluteTitle = absoluteSeoTitle(title);
  const images = image ? [{ alt: absoluteTitle, height: 630, url: image, width: 1200 }] : undefined;

  return {
    title: {
      absolute: absoluteTitle,
    },
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: absoluteTitle,
      description,
      images,
      siteName: siteConfig.name,
      type,
      url: path,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      description,
      images: image ? [image] : undefined,
      title: absoluteTitle,
    },
  };
}
