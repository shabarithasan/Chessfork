const fs = require('fs');

// 1. Fix game-analysis-page.tsx
const f6 = 'src/components/analysis/game-analysis-page.tsx';
let c6 = fs.readFileSync(f6, 'utf8');

if (!c6.includes('const GRADE_TO_LABEL: Record<string, string> = {')) {
  const insertIndex = c6.indexOf('const GRADE_VERB:');
  const gradeToLabelStr = `const GRADE_TO_LABEL: Record<string, string> = {
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
};\n\n`;
  c6 = c6.substring(0, insertIndex) + gradeToLabelStr + c6.substring(insertIndex);
}
c6 = c6.replace('liveEngine={liveEngine}', '');
fs.writeFileSync(f6, c6);


// 2. Fix useLiveAnalysisSession.ts
const f2 = 'src/hooks/useLiveAnalysisSession.ts';
let c2 = fs.readFileSync(f2, 'utf8');
c2 = c2.replace(/Blunder: 0,\n\s*}/, 'Blunder: 0,\n        Miss: 0,\n      }');
fs.writeFileSync(f2, c2);


// 3. Fix analysis.ts
const f3 = 'src/lib/chess/analysis.ts';
let c3 = fs.readFileSync(f3, 'utf8');
c3 = c3.replace(/Blunder: "Blunder",\n};/, 'Blunder: "Blunder",\n  Miss: "Miss",\n};');
fs.writeFileSync(f3, c3);


// 4. Fix client-analyzer.ts
const f4 = 'src/lib/chess/client-analyzer.ts';
let c4 = fs.readFileSync(f4, 'utf8');
c4 = c4.replace(/Blunder: "Blunder",\n};/, 'Blunder: "Blunder",\n  Miss: "Miss",\n};');
c4 = c4.replace(/materialCount: [^,]+,/, '');
fs.writeFileSync(f4, c4);


// 5. Fix stockfish-report.ts
const f5 = 'src/server/chess/stockfish-report.ts';
let c5 = fs.readFileSync(f5, 'utf8');
c5 = c5.replace(/Blunder: "Blunder",\n};/, 'Blunder: "Blunder",\n  Miss: "Miss",\n};');
fs.writeFileSync(f5, c5);

console.log('Done!');
