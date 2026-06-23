import { SiteShellClient } from "@/components/shell/site-shell-client";
import { getCurrentUser } from "@/server/auth/session";

export async function SiteShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getCurrentUser();

  return <SiteShellClient viewer={viewer ? { displayName: viewer.displayName } : null}>{children}</SiteShellClient>;
}
