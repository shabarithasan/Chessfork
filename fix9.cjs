const fs = require('fs');
let c = fs.readFileSync('src/lib/chess/client-analyzer.ts', 'utf8');

c = c.replace(/Blunder: (.*?)\n\s*};\n\s*return messages\[grade\];/, 'Blunder: $1\n    Miss: "Missed a much better move.",\n  };\n  return messages[grade];');
c = c.replace(/capsFromEvaluations\(\{ bestScore: bestMoverScore, moveScore: actualMoverScore, materialCount \}\)/, 'capsFromEvaluations({ bestScore: bestMoverScore, moveScore: actualMoverScore })');

fs.writeFileSync('src/lib/chess/client-analyzer.ts', c);
console.log('Done!');
