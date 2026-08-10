const fs = require('fs');
let c = fs.readFileSync('src/lib/chess/client-analyzer.ts', 'utf8');

if (!c.includes('Miss: "Missed a much better move."')) {
  c = c.replace(/Blunder: (.*?)\n\s*};\n\s*return messages\[grade\];/s, 'Blunder: $1\n    Miss: "Missed a much better move.",\n  };\n  return messages[grade];');
}
fs.writeFileSync('src/lib/chess/client-analyzer.ts', c);
console.log('Done!');
