import { notFound } from "next/navigation";

import { LocalizedRoutePage } from "@/components/pages";
import { isLocale } from "@/lib/locales";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug?: string[] }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, slug } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};

  if (!isLocale(locale)) {
    notFound();
  }

  return <LocalizedRoutePage locale={locale} slug={slug} searchParams={resolvedSearchParams} />;
}
