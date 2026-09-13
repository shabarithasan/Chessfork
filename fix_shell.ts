import { readFile, writeFile } from "fs/promises";
async function run() {
  const file = "src/components/shell/site-shell-client.tsx";
  let code = await readFile(file, "utf8");
  
  code = code.replace(`  viewer: { displayName: string } | null;`, `  viewer: { displayName: string; level?: number } | null;`);
  
  const target = `                        <Link
                          href={accountPath}
                          className="ed-nav"
                        >
                          <User className="ed-nav-icon shrink-0" />
                          <span className="min-w-0 flex-1 truncate">{viewer.displayName}</span>
                        </Link>`;
                        
  const replacement = `                        <Link
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
                        
  code = code.replace(target, replacement);
  
  await writeFile(file, code);
}
run();
