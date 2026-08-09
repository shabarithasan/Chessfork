const fs = require('fs');
let code = fs.readFileSync('public/engineWorker.js', 'utf8');

code = code.replace('self.postMessage = function(msg) {', 'self.postMessage = function(msg) {\\n    console.log(\\'[STOCKFISH->UI]\\', msg);');
code = code.replace('_engineHandler({ data: \\'uci\\' });', 'console.log(\\'[UI->STOCKFISH] uci\\');\\n  _engineHandler({ data: \\'uci\\' });');
code = code.replace('_engineHandler({ data: \\'stop\\' });', 'console.log(\\'[UI->STOCKFISH] stop\\');\\n            _engineHandler({ data: \\'stop\\' });');

code = code.replace(/_engineHandler\(\{ data: 'setoption name MultiPV value ' \+ \(data\.multiPV \|\| 3\) \}\);/, 'console.log(\\'[UI->STOCKFISH] setoption MultiPV \\' + (data.multiPV || 3));\\n  _engineHandler({ data: \\'setoption name MultiPV value \\' + (data.multiPV || 3) });');
code = code.replace(/_engineHandler\(\{ data: 'position fen ' \+ data\.fen \}\);/, 'console.log(\\'[UI->STOCKFISH] position fen \\' + data.fen);\\n  _engineHandler({ data: \\'position fen \\' + data.fen });');
code = code.replace(/_engineHandler\(\{ data: 'go depth ' \+ \(data\.depth \|\| 14\) \}\);/, 'console.log(\\'[UI->STOCKFISH] go depth \\' + (data.depth || 14));\\n  _engineHandler({ data: \\'go depth \\' + (data.depth || 14) });');

fs.writeFileSync('public/engineWorker.js', code);
console.log('Done!');
