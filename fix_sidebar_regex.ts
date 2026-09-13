import { readFile, writeFile } from "fs/promises";
async function run() {
  const file = "src/components/shell/site-shell-client.tsx";
  let code = await readFile(file, "utf8");
  
  code = code.replace(
    /export function PremiumSidebar\(\{\s*pathname,\s*onShowWhatsNew,\s*collapsed,\s*onToggleCollapsed,\s*\}\:\s*\{\s*pathname\:\s*string\s*\|\s*null\;\s*onShowWhatsNew\:\s*\(\)\s*\=\>\s*void\;\s*collapsed\:\s*boolean\;\s*onToggleCollapsed\:\s*\(\)\s*\=\>\s*void\;\s*\}\)/,
    "export function PremiumSidebar({ pathname, onShowWhatsNew, collapsed, onToggleCollapsed, viewer }: { pathname: string | null; onShowWhatsNew: () => void; collapsed: boolean; onToggleCollapsed: () => void; viewer: { displayName: string; level?: number } | null; })"
  );
  
  await writeFile(file, code);
}
run();
