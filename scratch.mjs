import https from 'https';
import { Chess } from 'chess.js';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Chessfork Debugger' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function run() {
  const archives = await fetchJson('https://api.chess.com/pub/player/mr-demon-only/games/archives');
  // Check the last few months
  for (let i = archives.archives.length - 1; i >= Math.max(0, archives.archives.length - 3); i--) {
    const monthUrl = archives.archives[i];
    const games = await fetchJson(monthUrl);
    for (const game of games.games) {
      if (!game.pgn) continue;
      if (game.pgn.includes('29. Rxc2') || game.pgn.includes('29... Rxc2') || game.pgn.includes('Rxc2')) {
        const chess = new Chess();
        chess.loadPgn(game.pgn);
        const chess2 = new Chess();
        const moves = chess.history({ verbose: true });
        
        for (const m of moves) {
          if (m.san === 'Rxc2') {
             console.log("Game URL:", game.url);
             console.log("FEN BEFORE Rxc2:", chess2.fen());
             chess2.move(m);
             console.log("FEN AFTER Rxc2:", chess2.fen());
             return;
          }
          chess2.move(m);
        }
      }
    }
  }
  console.log("Not found.");
}
run();
