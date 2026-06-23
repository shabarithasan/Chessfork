import { notFound } from "next/navigation";

import { BlogPostPage } from "@/components/pages";
import { getBlogPostBySlug, getBlogPostSummaries } from "@/lib/mdx";

export async function generateStaticParams() {
  const posts = await getBlogPostSummaries();
  return posts.map((post) => ({ slug: post.slug }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug).catch(() => null);

  if (!post) {
    notFound();
  }

  return <BlogPostPage post={post} />;
}
