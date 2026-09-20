import fs from 'fs';
let content = fs.readFileSync('src/components/analysis/position-workbench.tsx', 'utf-8');

const targetRegex = /<div className={\\\ounded-xl border border-neutral-800[\s\S]*?bg-\[linear-gradient\(180deg,rgba\(41,41,38,0\.96\),rgba\(24,24,24,0\.98\)\)\] p-4 shadow-\[0_24px_80px_rgba\(0,0,0,0\.28\)\] sm:p-6[\s\S]*?\$\{mode === "next-move" \|\| mode === "board" \? "xl:order-2" : ""\}\\\}>([\s\S]*?)<\/div>\s*<aside className={\\\space-y-4/m;

const match = content.match(targetRegex);
if (!match) {
  console.log("Could not find the block to replace.");
  process.exit(1);
}

const originalBlockContent = match[1]; // The inner content of the original div
const entireMatch = match[0];

const replacement = \
        {mode === "board" ? (
          <div className="rounded-xl border border-neutral-800 bg-[#121624] flex flex-col overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.28)] xl:order-2 p-4 h-full">
            <div className="flex bg-[#0b0d14] p-1 rounded-lg shrink-0">
              <button className="flex-1 bg-[#282d3b] shadow text-white py-1.5 rounded-md text-sm font-semibold">Analysis</button>
              <button className="flex-1 text-neutral-400 py-1.5 text-sm font-semibold hover:bg-white/5 rounded-md transition">Coach</button>
            </div>

            <div className="flex items-center justify-between mt-4">
              <span className="bg-amber-400/20 text-amber-400 border border-amber-400/30 px-3 py-1 rounded-md font-mono font-bold text-sm">
                {engineLines.length > 0 ? formatEngineScore(engineLines[0].score) : "0.00"}
              </span>
              <span className="text-neutral-400 text-sm font-medium">Depth {engineAnalysis.depth} • SF 18 WASM</span>
            </div>

            <button
              onClick={() => {
                const best = engineLines[0];
                if (!best || !chess) return;
                try {
                  const current = loadChess(fen);
                  const move = current?.move(best.san);
                  if (move && current) {
                    setFenHistory((h) => [...h, fen]);
                    applyFen(current.fen(), \\\\\\ played. Engine is updating.\\\);
                  }
                } catch {}
              }}
              className="w-full mt-4 bg-amber-400 hover:bg-amber-500 text-black font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/><path d="m15 6-6 6 6 6"/></svg>
              Follow Best Line
            </button>

            <div className="mt-4 flex-1 overflow-y-auto space-y-1">
              {engineLines.map((line, idx) => (
                <div key={idx} className="flex gap-3 text-sm items-center hover:bg-white/5 p-2 rounded-lg cursor-pointer transition-colors" onClick={() => {
                  try {
                    const current = loadChess(fen);
                    const move = current?.move(line.san);
                    if (move && current) {
                      setFenHistory((h) => [...h, fen]);
                      applyFen(current.fen(), \\\\\\ played. Engine is updating.\\\);
                    }
                  } catch {}
                }}>
                  <span className="w-8 font-mono font-bold text-neutral-200">{line.san}</span>
                  <span className="w-12 font-mono text-neutral-400 text-right">{formatEngineScore(line.score)}</span>
                  {idx === 0 && (
                    <span className="flex items-center gap-1 bg-[#1c2130] text-[#a0aab8] px-2 py-0.5 rounded-full text-[0.65rem] uppercase tracking-wider font-bold shrink-0">
                      <span className="text-amber-400 text-xs">??</span> is best
                    </span>
                  )}
                  <span className="text-neutral-500 truncate min-w-0 flex-1">{line.line.slice(1).join(" ")}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-neutral-800 flex justify-between gap-2">
              <button onClick={undoMove} disabled={fenHistory.length === 0} className="flex-1 bg-[#282d3b] hover:bg-[#343b4d] disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition">
                Undo
              </button>
              <button onClick={resetBoard} className="flex-1 bg-[#282d3b] hover:bg-[#343b4d] text-white font-semibold py-2 rounded-lg transition">
                Reset
              </button>
            </div>
            
            <div className="mt-4 space-y-4">
              <label className="block">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">FEN</span>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(fen)}
                    className="text-[0.65rem] font-semibold uppercase tracking-wider text-amber-500 hover:text-amber-400"
                  >
                    Copy FEN
                  </button>
                </div>
                <textarea
                  value={fen}
                  onChange={(event) => handleFenChange(event.target.value)}
                  className="min-h-16 w-full rounded-lg border border-neutral-800 bg-neutral-950/75 px-4 py-3 font-mono text-xs leading-6 text-neutral-100 outline-none transition focus:border-amber-400/70"
                  spellCheck={false}
                />
              </label>
              
              <label className="block">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">PGN</span>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(chess?.pgn() ?? "")}
                    className="text-[0.65rem] font-semibold uppercase tracking-wider text-amber-500 hover:text-amber-400"
                  >
                    Copy PGN
                  </button>
                </div>
                <textarea
                  value={chess?.pgn() ?? ""}
                  readOnly
                  className="min-h-24 w-full rounded-lg border border-neutral-800 bg-neutral-950/75 px-4 py-3 font-mono text-xs leading-6 text-neutral-100 outline-none transition focus:border-amber-400/70"
                  spellCheck={false}
                />
              </label>
            </div>
          </div>
        ) : (
          <div className={\ounded-xl border border-neutral-800 bg-[linear-gradient(180deg,rgba(41,41,38,0.96),rgba(24,24,24,0.98))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-6 \\}>
\
          </div>
        )}
      <aside className={\space-y-4\;

content = content.replace(targetRegex, replacement);
fs.writeFileSync('src/components/analysis/position-workbench.tsx', content);
console.log("Success");
