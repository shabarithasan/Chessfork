import { readFile, writeFile } from "fs/promises";
async function run() {
  const file = "src/components/analysis/game-analysis-page.tsx";
  let code = await readFile(file, "utf8");
  
  // 1. Pass viewer to inner
  code = code.replace(
    `<GameAnalysisPageInner analysis={analysis} />`,
    `<GameAnalysisPageInner analysis={analysis} viewer={viewer} />`
  );
  
  // 2. Add viewer to inner props
  code = code.replace(
    `function GameAnalysisPageInner({ analysis }: { analysis: AnalysisRun }) {`,
    `function GameAnalysisPageInner({ analysis, viewer }: { analysis: AnalysisRun, viewer?: { coachPersona?: string; level?: number; displayName?: string } | null }) {`
  );

  await writeFile(file, code);
}
run();
