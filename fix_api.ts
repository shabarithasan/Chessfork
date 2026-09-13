import { readFile, writeFile } from "fs/promises";
async function run() {
  const file = "src/app/api/analysis/save/route.ts";
  let code = await readFile(file, "utf8");
  
  if (!code.includes("awardUserXp")) {
    code = code.replace(
      `import { persistAnalysisRun } from "@/server/repositories/analysis-repository";`,
      `import { persistAnalysisRun } from "@/server/repositories/analysis-repository";\nimport { awardUserXp } from "@/server/repositories/user-repository";\nimport { XP_AWARDS } from "@/lib/progression";`
    );
    
    code = code.replace(
      `await persistAnalysisRun(run, run.source ?? "pgn", await getCurrentUser().then(u => u?.id));`,
      `const user = await getCurrentUser();\n    await persistAnalysisRun(run, run.source ?? "pgn", user?.id);\n\n    if (user) {\n      await awardUserXp(user.id, XP_AWARDS.ANALYZE_GAME, "gamesAnalyzed").catch(console.error);\n    }`
    );
    
    await writeFile(file, code);
  }
}
run();
