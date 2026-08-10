const fs = require('fs');

function fixSyntax(file) {
  let c = fs.readFileSync(file, 'utf8');
  // Revert the bad replace
  c = c.replace(/Blunder: \n\s*Miss: (.*?),/, 'Blunder: `This completely changes the evaluation and loses the position.`,\n    Miss: `$1`,');
  // For stockfish-report.ts where the message might be different
  c = c.replace(/Blunder: \n\s*Miss: Miss,/, 'Blunder: "Blunder",\n  Miss: "Miss",');
  fs.writeFileSync(file, c);
}

fixSyntax('src/lib/chess/analysis.ts');
fixSyntax('src/lib/chess/client-analyzer.ts');
fixSyntax('src/server/chess/stockfish-report.ts');

console.log('Done!');
