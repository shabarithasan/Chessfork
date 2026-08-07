<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:annotation-labels -->
# Move Annotation Labels — DO NOT MODIFY

The annotation badge system (brilliance_v2 SVGs on board squares and move bar) is final and approved by the user. Do not change:
- SVG image paths: always `/images/brilliance_v2/svg/{filename}.svg`
- Board positioning: top-right corner inside the square (`translate(-100%, 0)`, `size-8`)
- Move bar labels: inline after SAN text, `size-5`
- Mapping: see `CLASS_TO_LABEL` in `FullAnalysisBoard.tsx` and `GRADE_TO_LABEL` in `game-analysis-page.tsx`
- Move bar pill style: `px-4 py-1.5 rounded-full`, selected = `bg-[#f3c53d]/20 border border-[#f3c53d]` with black text
<!-- END:annotation-labels -->

<!-- BEGIN:interactive-analysis-deleted -->
# InteractiveAnalysis.tsx — DELETED

`src/components/analysis/InteractiveAnalysis.tsx` (891 lines) was deleted on 2026-07-05 per user request.
Do NOT recreate or modify this file. The interactive analysis feature is handled entirely by `game-analysis-page.tsx` (`/analysis/[id]` route).

Previous function: standalone interactive analysis board used by `AnalysisPageFlow.tsx` ("interactive" view mode).
- Replaced by removing the "interactive" view mode from `AnalysisPageFlow.tsx`.
- All What-If feature work should go into `game-analysis-page.tsx` only.
<!-- END:interactive-analysis-deleted -->

<!-- BEGIN:key-fixes -->
# Key Fixes

- **Grader unit mismatch**: `engineWorker.js:68` divides Stockfish's centipawns by 100, yielding pawns (0.50). `toCentipawns()` and `buildTopMoves()` in `useWhatIfSessions.ts` now multiply by 100 to restore centipawns for grader thresholds (8/25/100/200 cp). Previously a 370cp blunder (hanging bishop) was read as 3.7cp and classified Excellent. See `src/hooks/useWhatIfSessions.ts:55,61`.
- **Board glitch on drop**: `altFen` derives from `currentSession?.fen ?? pendingFen ?? null` instead of only `currentSession?.fen`. During search, `currentSession` is null so `altFen` was null → `boardFen` fell back to game position → piece snapped back after drag-drop. Now board shows pending position immediately; analysis panel remains atomic (gated on `currentSession`). See `src/components/analysis/game-analysis-page.tsx:1171`.
- **First what-if coach "Analyzing..." forever**: The first what-if from a game position had `prevSessionEvalRef.current === null`, so the freeze effect skipped grading entirely (`grade` stayed `null`). The coach saw `!wiGrade` and showed "Analyzing..." permanently. Fixed by seeding `prevSessionEvalRef` with the game position's `selectedMove.score` (in centipawns) when `createSession` receives a `gameCtx` parameter. See `src/hooks/useWhatIfSessions.ts:79` and `game-analysis-page.tsx:1560`.
- **Engine dead in dev ("WASM streaming failed")**: `public/stockfish/stockfish.js` derives the .wasm URL from the **worker script's own pathname**: `location.pathname.replace(/\.js$/i, ".wasm")` (plus `location.hash` first). Our entry worker is `/stockfishWorker.js`, so it fetched `/stockfishWorker.wasm` — which doesn't exist and Next dev serves as the HTML app shell (200 text/html) → streaming compile failed → engine silently died (`engineStatus` stuck "analyzing", depth 0, no PVs). Fixed by passing the wasm URL through the worker URL hash: `new Worker("/stockfishWorker.js#/stockfish/stockfish.wasm")` in `src/hooks/useEngine.ts:39`. `public/engineWorker.js` also keeps an `instantiateStreaming` → ArrayBuffer fallback as insurance.
<!-- END:key-fixes -->
