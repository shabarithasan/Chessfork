import { readFile, writeFile } from "fs/promises";
async function run() {
  const file = "src/components/account/account-page.tsx";
  let code = await readFile(file, "utf8");
  
  if (!code.includes("ProgressionBox")) {
    const importProgression = `import { getLevelProgress } from "@/lib/progression";\n`;
    code = code.replace(`import { getAccountProfile }`, importProgression + `import { getAccountProfile }`);
    
    const progressionLogic = `
  const xp = profile.user.xp || 0;
  const level = profile.user.level || 1;
  const title = profile.user.title || "Novice";
  const progress = getLevelProgress(xp, level);
`;
    
    code = code.replace(`  const latestRun = runs[0];`, `  const latestRun = runs[0];\n${progressionLogic}`);
    
    const metricBlock = `            {[
              { label: "Plan", value: profile.user.subscriptionTier.toUpperCase() },
              { label: "Linked accounts", value: profile.linkedAccounts.length.toString() },
              { label: "Saved reports", value: runs.length.toString().padStart(2, "0") },
              { label: "Level", value: \`Lv. \${level}\` },
            ].map((metric) => (`;
            
    code = code.replace(`            {[
              { label: "Plan", value: profile.user.subscriptionTier.toUpperCase() },
              { label: "Linked accounts", value: profile.linkedAccounts.length.toString() },
              { label: "Saved reports", value: runs.length.toString().padStart(2, "0") },
              { label: "Locale", value: localeNames[profile.user.locale] },
            ].map((metric) => (`, metricBlock);
            
    const progressionUI = `
          <div className="mt-8 rounded-[2rem] border border-amber-300/30 bg-amber-500/5 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300/80">Progression</p>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-3xl font-semibold text-white">Level {level}</p>
                <p className="mt-1 text-sm text-amber-200/70">{title}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-medium text-white">{xp} XP</p>
                <p className="mt-1 text-xs text-slate-400">Total earned</p>
              </div>
            </div>
            <div className="mt-6">
              <div className="flex justify-between text-xs text-slate-400 mb-2">
                <span>{progress.currentLevelXp} XP</span>
                <span>{progress.nextLevelXp} XP</span>
              </div>
              <div className="h-3 w-full rounded-full bg-black/40 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-1000"
                  style={{ width: \`\${progress.percentage}%\` }}
                />
              </div>
              <p className="mt-3 text-center text-xs text-slate-500">{progress.nextLevelXp - progress.currentLevelXp} XP to next level</p>
            </div>
            
            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-6">
              <div>
                <p className="text-2xl font-semibold text-white">{profile.user.gamesAnalyzed || 0}</p>
                <p className="text-xs text-slate-400 uppercase tracking-wider mt-1">Games Analyzed</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-white">{profile.user.puzzlesSolved || 0}</p>
                <p className="text-xs text-slate-400 uppercase tracking-wider mt-1">Puzzles Solved</p>
              </div>
            </div>
          </div>
`;

    code = code.replace(
      `<div className="mt-8 rounded-[2rem] border border-white/10 bg-slate-950/45 p-6">`,
      `${progressionUI}\n          <div className="mt-8 rounded-[2rem] border border-white/10 bg-slate-950/45 p-6">`
    );
    
    await writeFile(file, code);
  }
}
run();
