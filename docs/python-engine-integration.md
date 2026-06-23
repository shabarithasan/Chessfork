# Python Engine Integration Reference

This repository runs Stockfish from TypeScript. If you later move analysis into a Python worker, this is the equivalent integration.

## CAPS-like Accuracy

```python
import chess
import chess.engine

def win_prob(eval_cp: int) -> float:
    return 1 / (1 + 10 ** (-eval_cp / 400))

def caps(best_cp: int, move_cp: int, worst_cp: int = -200) -> float:
    best = win_prob(best_cp)
    move = win_prob(move_cp)
    worst = win_prob(worst_cp)
    denom = best - worst
    if abs(denom) <= 1e-12:
        return 100.0 if move_cp >= best_cp else 0.0
    return max(0.0, min(100.0, ((move - worst) / denom) * 100))

def pov_cp(score: chess.engine.PovScore, turn: chess.Color) -> int:
    return score.pov(turn).score(mate_score=190000) or 0

def analyse_move(engine: chess.engine.SimpleEngine, board: chess.Board, move: chess.Move) -> dict:
    best_info = engine.analyse(board, chess.engine.Limit(depth=20, time=0.5), multipv=1)[0]
    best_cp = pov_cp(best_info["score"], board.turn)

    actual_info = engine.analyse(board, chess.engine.Limit(depth=18, time=0.5), root_moves=[move], multipv=1)
    actual_cp = pov_cp(actual_info["score"], board.turn)

    return {
        "san": board.san(move),
        "best_move": best_info["pv"][0].uci() if best_info.get("pv") else None,
        "cp_loss": max(0, min(999, best_cp - actual_cp)),
        "caps": caps(best_cp, actual_cp),
    }
```

## Syzygy Setup

Download sources:

- `https://tablebase.lichess.ovh/tables/standard/3-4-5/`
- `https://tablebase.lichess.ovh/tables/standard/6-wdl/`
- `https://tablebase.lichess.ovh/tables/standard/6-dtz/`

The 3-4-5 files are still needed for 6-piece positions because captures can reach smaller material.

```python
import re
from pathlib import Path
from urllib.parse import urljoin

import requests

SOURCES = [
    "https://tablebase.lichess.ovh/tables/standard/3-4-5/",
    "https://tablebase.lichess.ovh/tables/standard/6-wdl/",
    "https://tablebase.lichess.ovh/tables/standard/6-dtz/",
]
TARGET = Path("./syzygy")
TARGET.mkdir(exist_ok=True)

def links(url: str) -> list[str]:
    html = requests.get(url, timeout=30).text
    return [urljoin(url, href) for href in re.findall(r'href="([^"]+\.(?:rtbw|rtbz))"', html)]

for source in SOURCES:
    for file_url in links(source):
        target = TARGET / file_url.rsplit("/", 1)[-1]
        if target.exists():
            continue
        with requests.get(file_url, stream=True, timeout=60) as response:
            response.raise_for_status()
            with target.open("wb") as out:
                for chunk in response.iter_content(chunk_size=1024 * 1024):
                    if chunk:
                        out.write(chunk)
```

```python
import chess
import chess.engine
import chess.syzygy

SYZYGY = "./syzygy"
ENGINE = "./stockfish"

engine = chess.engine.SimpleEngine.popen_uci(ENGINE)
engine.configure({
    "Threads": 8,
    "Hash": 2048,
    "SyzygyPath": SYZYGY,
    "SyzygyProbeDepth": 1,
    "SyzygyProbeLimit": 6,
})

board = chess.Board("8/8/8/8/8/2k5/4K3/8 w - - 0 1")
info = engine.analyse(board, chess.engine.Limit(depth=20, time=0.5), multipv=1)
print("Stockfish tbhits:", info[0].get("tbhits", 0))

with chess.syzygy.open_tablebase(SYZYGY) as tablebase:
    print("WDL:", tablebase.probe_wdl(board))
    print("DTZ:", tablebase.probe_dtz(board))

engine.quit()
```

## Polyglot Opening Book

```python
import chess
import chess.engine
import chess.polyglot

BOOK_PATH = "./books/Perfect2023.bin"
ENGINE = "./stockfish"
MAX_BOOK_PLIES = 16

def book_move(board: chess.Board) -> chess.Move | None:
    if board.ply() >= MAX_BOOK_PLIES:
        return None
    try:
        with chess.polyglot.open_reader(BOOK_PATH) as reader:
            return reader.weighted_choice(board).move
    except (IndexError, FileNotFoundError):
        return None

def choose_move(engine: chess.engine.SimpleEngine, board: chess.Board) -> chess.Move:
    move = book_move(board)
    if move:
        return move
    info = engine.analyse(board, chess.engine.Limit(depth=20, time=0.5), multipv=1)
    return info[0]["pv"][0]
```
