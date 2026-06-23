import { SiteHeaderClient } from "@/components/shell/site-header-client";
import { getCurrentUser } from "@/server/auth/session";

export async function SiteHeader() {
  const viewer = await getCurrentUser();

  return <SiteHeaderClient viewer={viewer ? { displayName: viewer.displayName } : null} />;
}
