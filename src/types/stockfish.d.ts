declare module "stockfish" {
  export interface StockfishEngine {
    sendCommand: (cmd: string) => void;
    onmessage?: (msg: string) => void;
  }

  type StockfishInitCallback = (err: Error | null, engine: StockfishEngine) => void;

  function initEngine(cb: StockfishInitCallback): void;
  function initEngine(enginePath?: string): Promise<StockfishEngine>;
  function initEngine(enginePath: string, cb: StockfishInitCallback): void;

  export default initEngine;
}
