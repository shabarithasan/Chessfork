const fs = require('fs');

const f1 = 'src/components/review/game-review-page.tsx';
let c1 = fs.readFileSync(f1, 'utf8');
c1 = c1.replace('  Mistake: "border-[#f97316]/45 bg-[#f97316]/24 font-bold text-orange-50",\n};', '  Mistake: "border-[#f97316]/45 bg-[#f97316]/24 font-bold text-orange-50",\n  Miss: "border-[#f43f5e]/45 bg-[#f43f5e]/24 font-bold text-rose-50",\n};');
c1 = c1.replace('  Mistake: "bg-[#f97316]",\n};', '  Mistake: "bg-[#f97316]",\n  Miss: "bg-[#f43f5e]",\n};');
fs.writeFileSync(f1, c1);

const f2 = 'src/hooks/useLiveAnalysisSession.ts';
let c2 = fs.readFileSync(f2, 'utf8');
c2 = c2.replace('        Mistake: 0,\n        Blunder: 0,\n      }', '        Mistake: 0,\n        Blunder: 0,\n        Miss: 0,\n      }');
fs.writeFileSync(f2, c2);

const f3 = 'src/lib/chess/analysis.ts';
let c3 = fs.readFileSync(f3, 'utf8');
c3 = c3.replace('  Mistake: "Mistake",\n  Blunder: "Blunder",\n};', '  Mistake: "Mistake",\n  Blunder: "Blunder",\n  Miss: "Miss",\n};');
fs.writeFileSync(f3, c3);

const f4 = 'src/lib/chess/client-analyzer.ts';
let c4 = fs.readFileSync(f4, 'utf8');
c4 = c4.replace('  Mistake: "Mistake",\n  Blunder: "Blunder",\n};', '  Mistake: "Mistake",\n  Blunder: "Blunder",\n  Miss: "Miss",\n};');
c4 = c4.replace('          const classificationInput = {\n            bestScore: previousEvalForGrade,\n            moveScore: currentEvalForGrade,\n            materialCount: new Chess(board.fen()).board().flat().filter(Boolean).length,', '          const classificationInput = {\n            bestScore: previousEvalForGrade,\n            moveScore: currentEvalForGrade,');
fs.writeFileSync(f4, c4);

const f5 = 'src/server/chess/stockfish-report.ts';
let c5 = fs.readFileSync(f5, 'utf8');
c5 = c5.replace('  Mistake: "Mistake",\n  Blunder: "Blunder",\n};', '  Mistake: "Mistake",\n  Blunder: "Blunder",\n  Miss: "Miss",\n};');
fs.writeFileSync(f5, c5);

const f6 = 'src/components/analysis/game-analysis-page.tsx';
let c6 = fs.readFileSync(f6, 'utf8');

const replacementBadgeIcon = `function BadgeIcon({ badge, size = 16 }: { badge: string; size?: number }) {
  if (!badge) return null;
  return <img src={\`/images/brilliance_v2/svg/\${badge}.svg\`} alt="" width={size} height={size} className="shrink-0" />;
}`;

c6 = c6.replace(/const BADGE_IMG: Record<string, string> = {[\s\S]*?};/, '');
c6 = c6.replace(/const GRADE_TO_BADGE: Record<string, string> = {[\s\S]*?};/, `const GRADE_TO_LABEL: Record<string, string> = {
  Brilliant: "brilliant",
  Great: "great_find",
  Best: "best",
  Excellent: "excellent",
  Good: "good",
  Book: "book",
  Inaccuracy: "inaccuracy",
  Mistake: "mistake",
  Blunder: "blunder",
  Miss: "miss",
};`);

c6 = c6.replace(/function BadgeIcon[\s\S]*?}/, replacementBadgeIcon);

c6 = c6.replace('badge={GRADE_TO_BADGE[isLiveActive', 'badge={GRADE_TO_LABEL[isLiveActive');
c6 = c6.replace('liveEngine={liveEngine}', '');

// Also remove GRADE_TO_LABEL from inside BoardWorkspace
c6 = c6.replace(/const GRADE_TO_LABEL: Record<string, string> = {[\s\S]*?Miss: "miss",\n  };/, '');

fs.writeFileSync(f6, c6);
console.log('Done!');
