import fs from "node:fs/promises";
import path from "node:path";

import matter from "gray-matter";

import type { BlogPostSummary } from "@/types/platform";

const blogDirectory = path.join(process.cwd(), "src", "content", "blog");

export async function getBlogPostSummaries(): Promise<BlogPostSummary[]> {
  const files = await fs.readdir(blogDirectory);
  const posts = await Promise.all(
    files
      .filter((file) => file.endsWith(".mdx"))
      .map(async (file) => {
        const raw = await fs.readFile(path.join(blogDirectory, file), "utf8");
        const { data } = matter(raw);

        return {
          slug: file.replace(/\.mdx$/, ""),
          title: String(data.title),
          excerpt: String(data.excerpt),
          category: String(data.category),
          publishedAt: String(data.publishedAt),
          readingTime: String(data.readingTime),
        } satisfies BlogPostSummary;
      }),
  );

  return posts.sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
}

export async function getBlogPostBySlug(slug: string) {
  const raw = await fs.readFile(path.join(blogDirectory, `${slug}.mdx`), "utf8");
  const { data, content } = matter(raw);

  return {
    slug,
    title: String(data.title),
    excerpt: String(data.excerpt),
    category: String(data.category),
    publishedAt: String(data.publishedAt),
    readingTime: String(data.readingTime),
    content,
  };
}
