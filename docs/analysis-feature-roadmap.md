# Chess Analysis Product Roadmap

This roadmap captures the requested Chess.com/Chessigma-style features so we can build them one by one without losing the vision.

## 1. Chess.com Game Browser Flow

- Status: Done.
- After entering a Chess.com username and clicking Fetch Recent Games, show a real games/matches page.
- Show recent games with opponent, date, win/loss/draw, time control, ratings, rated/casual, ECO/opening, and source link.
- Add a Refresh button that re-imports/reloads recent games when the newest game is missing.
- Let the user select a game and run quick/deep analysis from that game.

## 2. Professional Loading Analysis

- Status: Done.
- Show Stockfish-style progress with stages, depth, percent, and board preview.
- Keep the loading screen connected to real analysis work, not fake random UI.
- Show background board/engine activity while the report is being built.

## 3. Report Page Polish

- Status: Done.
- Show accuracy, estimated Elo, result, opening, graph, and key move list clearly.
- Add Learn from Mistakes / Try Again training from bad positions.
- Keep the report from the reviewed player perspective, not opponent perspective.

## 4. Engine Settings

- Status: Done.
- Support Stockfish version/depth display and controls.
- Let the user choose number of engine lines, ideally 1-5.
- Use selected engine line count for arrows and top-move list.

## 5. Engine Arrows

- Status: Done.
- Draw arrows only from Stockfish lines.
- Strong/dark green means best move.
- Lighter green arrows mean second/third best candidate moves.
- Avoid random arrows and avoid arrows that cover pieces too much.

## 6. Analysis Sidebar

- Status: Done.
- Keep Chessigma-style tabs: Report, Analysis, Coach, Settings.
- Analysis tab should show eval, depth, top engine lines, move grades, and move list.
- Coach tab should explain human meaning, not just engine numbers.

## 7. Settings

- Status: Done.
- Add board color themes.
- Add piece themes.
- Add classification-name presets such as Chessigma, Common, and Custom.
- Let users customize move grade labels/icons where practical.

## 8. Evaluation Graph

- Status: Done.
- Build a professional eval graph with move-quality icons on critical moments.
- Make blunders, mistakes, best moves, and mate swings easy to understand.
- Add selected-move details, largest-swing metrics, ACPL/accuracy explanation, and move-classification ranges.

## 9. Live Board Analysis

- Status: Done.
- Add a board-analysis mode where users can move pieces manually.
- Analyze the new position live with Stockfish.
- Show changing eval, depth, best moves, and arrows as the position changes.
- Use only returned engine lines for board arrows while keeping FEN editing and manual refresh available.

## 10. Account Polish

- Keep sign-in, saved usernames, and streak features clean.
- Previously used Chess.com usernames should be easy to reuse.
