const fs = require('fs');
let c = fs.readFileSync('src/lib/chess/client-analyzer.ts', 'utf8');
c = c.replace(/actualScoreForWhite = turn === "w" \? actualMoverScore : -actualMoverScore;\n      const bestMoverScore = best.score; \/\/ best.score is from mover's perspective.\n      const materialCount = fenBefore.split\(" "\)\[0\].replace\(\/\[\^a-zA-Z\]\/g, ""\).length;/, 
`actualScoreForWhite = turn === "w" ? actualMoverScore : -actualMoverScore;
      }

      const bestMoverScore = best.score; // best.score is from mover's perspective.
      const materialCount = fenBefore.split(" ")[0].replace(/[^a-zA-Z]/g, "").length;`);
fs.writeFileSync('src/lib/chess/client-analyzer.ts', c);
console.log('Done!');
