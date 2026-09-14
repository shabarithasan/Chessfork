import { readFile, writeFile } from "fs/promises";
async function run() {
  const file = "src/components/analysis/game-analysis-page.tsx";
  let code = await readFile(file, "utf8");
  
  // 1. Add viewer prop type
  code = code.replace(
    `export default function GameAnalysisPage({ analysis }: { analysis: AnalysisRun }) {`,
    `export default function GameAnalysisPage({ analysis, viewer }: { analysis: AnalysisRun, viewer?: { coachPersona?: string; level?: number; displayName?: string } | null }) {`
  );
  code = code.replace(
    `export function GameAnalysisPage({ analysis }: { analysis: AnalysisRun }) {`,
    `export function GameAnalysisPage({ analysis, viewer }: { analysis: AnalysisRun, viewer?: { coachPersona?: string; level?: number; displayName?: string } | null }) {`
  );

  // 2. Add persona to fetch payload
  const fetchTarget = `        body: JSON.stringify({
          fenBefore: move.fen,
          fenAfter: evaluation.fen,
          playedMove: evaluation.san,
          bestMove: evaluation.bestContinuation,
          grade: grade,
          playedEval: evaluation.score,
          bestEval: wiScore ?? 0,
          evalLoss: loss,
          depth: evaluation.depth,
          topMoves: evaluation.pv,
          sideToMove: chess.turn() === "w" ? "white" : "black",
          moveNumber: move.moveNumber,
          reasons: [],
        }),`;
  const fetchReplace = `        body: JSON.stringify({
          fenBefore: move.fen,
          fenAfter: evaluation.fen,
          playedMove: evaluation.san,
          bestMove: evaluation.bestContinuation,
          grade: grade,
          playedEval: evaluation.score,
          bestEval: wiScore ?? 0,
          evalLoss: loss,
          depth: evaluation.depth,
          topMoves: evaluation.pv,
          sideToMove: chess.turn() === "w" ? "white" : "black",
          moveNumber: move.moveNumber,
          reasons: [],
          persona: viewer?.coachPersona,
        }),`;
  code = code.replace(fetchTarget, fetchReplace);

  // 3. Add viewer to PremiumSidebar in game-analysis-page
  const sidebarTarget = `<PremiumSidebar
        pathname={pathname}
        onShowWhatsNew={() => setShowWhatsNew(true)}
        collapsed={navCollapsed}
        onToggleCollapsed={() => setNavCollapsed((c) => !c)}
      />`;
  const sidebarReplace = `<PremiumSidebar
        pathname={pathname}
        onShowWhatsNew={() => setShowWhatsNew(true)}
        collapsed={navCollapsed}
        onToggleCollapsed={() => setNavCollapsed((c) => !c)}
        viewer={viewer as any}
      />`;
  code = code.replace(sidebarTarget, sidebarReplace);

  await writeFile(file, code);

  // 4. Pass viewer in pages.tsx
  const pagesFile = "src/components/pages.tsx";
  let pagesCode = await readFile(pagesFile, "utf8");
  pagesCode = pagesCode.replace(
    `<GameAnalysisPage analysis={analysis} />`,
    `<GameAnalysisPage analysis={analysis} viewer={viewer} />`
  );
  await writeFile(pagesFile, pagesCode);
}
run();
