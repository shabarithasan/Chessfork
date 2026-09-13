import { readFile, writeFile } from "fs/promises";
async function run() {
  const file = "src/components/shell/site-shell-client.tsx";
  let code = await readFile(file, "utf8");
  
  // Wait, because I already ran fix_shell.ts, the first mobile menu badge change is reverted!
  // I must re-apply the mobile menu change as well.
  
  // 1. Mobile viewer type
  code = code.replace(`  viewer: { displayName: string } | null;`, `  viewer: { displayName: string; level?: number } | null;`);
  
  // 2. Mobile menu badge
  const mobileTarget = `                        <Link
                          href={accountPath}
                          className="ed-nav"
                        >
                          <User className="ed-nav-icon shrink-0" />
                          <span className="min-w-0 flex-1 truncate">{viewer.displayName}</span>
                        </Link>`;
  const mobileReplacement = `                        <Link
                          href={accountPath}
                          className="ed-nav group"
                        >
                          <User className="ed-nav-icon shrink-0" />
                          <span className="min-w-0 flex-1 truncate">{viewer.displayName}</span>
                          {viewer.level && (
                            <span className="shrink-0 rounded-full bg-amber-400/20 border border-amber-400/40 px-2 py-0.5 text-[10px] font-bold tracking-widest text-amber-500 uppercase transition-colors group-hover:bg-amber-400/30">
                              Lv. {viewer.level}
                            </span>
                          )}
                        </Link>`;
  code = code.replace(mobileTarget, mobileReplacement);
  
  // 3. PremiumSidebar Props
  code = code.replace(
    "  onToggleCollapsed: () => void;\n}) {",
    "  onToggleCollapsed: () => void;\n  viewer: { displayName: string; level?: number } | null;\n}) {"
  );
  code = code.replace(
    "  onToggleCollapsed,\n}: {",
    "  onToggleCollapsed,\n  viewer,\n}: {"
  );
  
  // 4. PremiumSidebar Caller
  code = code.replace(
    "collapsed={collapsed}\n            onToggleCollapsed={toggleCollapsed}\n          />",
    "collapsed={collapsed}\n            onToggleCollapsed={toggleCollapsed}\n            viewer={viewer}\n          />"
  );
  
  // 5. Desktop Button
  const desktopTarget = `<Link
              href={authPath}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-[11px] bg-gradient-to-b from-[#FFB800] to-[#F59E0B] text-sm font-bold text-black shadow-md transition-all duration-150 hover:brightness-110"
            >
              <User className="shrink-0 size-[16px]" />
              <span>Sign in</span>
            </Link>`;
  const desktopReplacement = `{viewer ? (
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
  code = code.replace(desktopTarget, desktopReplacement);
  
  await writeFile(file, code);
}
run();
