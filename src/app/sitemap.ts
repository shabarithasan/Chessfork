import type { MetadataRoute } from "next";

import { topChessOpenings } from "@/data/openings";
import { getBlogPostSummaries } from "@/lib/mdx";
import { listAnalysisResponses } from "@/lib/platform-service";
import { siteConfig } from "@/lib/site";
import { publicPlayerEntriesFromAnalyses } from "@/lib/seo/chess-stats";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    "",
    "/analyze",
    "/board",
    "/editor",
    "/next-move",
    "/puzzles",
    "/daily",
    "/leaderboards/puzzles",
    "/leaderboards/brilliant",
    "/games",
    "/more",
    "/u/maya-lopez",
    "/coach",
    "/coach/report/coach-maya-lopez",
    "/wrapped/2025",
    "/pricing",
    "/blog",
    "/privacy-policy",
    "/tos",
  ].map((route) => ({
    url: `${siteConfig.url}${route}`,
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1 : 0.8,
  }));

  const localeRoutes = siteConfig.locales.flatMap((locale) =>
    ["", "/analyze", "/puzzles", "/more", "/coach", "/profile", "/features", "/pricing", "/blog"].map((route) => ({
      url: `${siteConfig.url}/${locale}${route}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  );

  const posts = await getBlogPostSummaries().catch(() => []);
  const blogRoutes = posts.map((post) => ({
    url: `${siteConfig.url}/blog/${post.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const openingRoutes = topChessOpenings.map((opening) => ({
    url: `${siteConfig.url}/opening/${opening.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  const analyses = await listAnalysisResponses().catch(() => []);
  const playerRoutes = publicPlayerEntriesFromAnalyses(analyses).map((player) => ({
    url: `${siteConfig.url}/player/${player.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...localeRoutes, ...blogRoutes, ...openingRoutes, ...playerRoutes];
}
