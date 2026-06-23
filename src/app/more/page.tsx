import { MorePage } from "@/components/pages";

function firstSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};

  return <MorePage reportId={firstSearchValue(resolvedSearchParams.report)} />;
}
