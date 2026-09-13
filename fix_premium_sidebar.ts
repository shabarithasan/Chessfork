import { readFile, writeFile } from "fs/promises";
async function run() {
  const file = "src/components/shell/site-shell-client.tsx";
  let code = await readFile(file, "utf8");
  
  // Update PremiumSidebar props
  code = code.replace(
    `export function PremiumSidebar({
  pathname,
  onShowWhatsNew,
  collapsed,
  onToggleCollapsed,
}: {
  pathname: string | null;
  onShowWhatsNew: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {`,
    `export function PremiumSidebar({
  pathname,
  onShowWhatsNew,
  collapsed,
  onToggleCollapsed,
  viewer,
}: {
  pathname: string | null;
  onShowWhatsNew: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  viewer: { displayName: string; level?: number } | null;
}) {`
  );

  // Update caller
  code = code.replace(
    `<PremiumSidebar
          pathname={pathname}
          onShowWhatsNew={openWhatsNew}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
        />`,
    `<PremiumSidebar
          pathname={pathname}
          onShowWhatsNew={openWhatsNew}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
          viewer={viewer}
        />`
  );
  
  // Replace Sign in button with dynamic profile / sign in button
  const signInButton = `<Link
              href={authPath}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-[11px] bg-gradient-to-b from-[#FFB800] to-[#F59E0B] text-sm font-bold text-black shadow-md transition-all duration-150 hover:brightness-110"
            >
              <User className="shrink-0 size-[16px]" />
              <span>Sign in</span>
            </Link>`;
            
  const dynamicButton = `{viewer ? (
              <Link
                href={withLocalePrefix("/account", activeLocale)}
                className="group flex h-11 w-full items-center justify-between gap-2 rounded-[11px] bg-black/25 border border-white/[0.07] px-3 text-sm font-bold text-white shadow-sm transition-all duration-150 hover:bg-white/[0.05]"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <User className="shrink-0 size-[16px] text-slate-400" />
                  <span className="truncate">{viewer.displayName}</span>
                </div>
                {viewer.level && (
                  <span className="shrink-0 rounded-full bg-amber-400/20 border border-amber-400/40 px-2 py-0.5 text-[9px] font-bold tracking-widest text-amber-500 uppercase transition-colors group-hover:bg-amber-400/30">
                    Lv. {viewer.level}
                  </span>
                )}
              </Link>
            ) : (
              <Link
                href={authPath}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-[11px] bg-gradient-to-b from-[#FFB800] to-[#F59E0B] text-sm font-bold text-black shadow-md transition-all duration-150 hover:brightness-110"
              >
                <User className="shrink-0 size-[16px]" />
                <span>Sign in</span>
              </Link>
            )}`;
            
  code = code.replace(signInButton, dynamicButton);
  
  await writeFile(file, code);
}
run();
