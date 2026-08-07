import { AuthPage } from "@/components/auth/auth-page";

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string | string[]; mode?: string | string[]; error?: string | string[] }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  return <AuthPage nextPath={resolvedSearchParams.next} mode={resolvedSearchParams.mode} error={resolvedSearchParams.error} />;
}
