const fs = require('fs');
let c = fs.readFileSync('src/lib/chess/client-analyzer.ts', 'utf8');
c = c.replace(/Blunder: \n\s*Miss: Missed a much better move.,/, 'Blunder: "This completely changes the evaluation and loses the position.",\n    Miss: "Missed a much better move.",');
fs.writeFileSync('src/lib/chess/client-analyzer.ts', c);
console.log('Done!');
