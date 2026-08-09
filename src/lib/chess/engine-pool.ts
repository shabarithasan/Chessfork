class EnginePool {
  private static instance: EnginePool;
  private heavyWorker: Worker | null = null;
  private liveWorker: Worker | null = null;

  private constructor() {}

  public static getInstance(): EnginePool {
    if (!EnginePool.instance) {
      EnginePool.instance = new EnginePool();
    }
    return EnginePool.instance;
  }

  public getHeavyWorker(): Worker {
    if (typeof window === "undefined") {
      throw new Error("Cannot instantiate Worker on server");
    }
    if (!this.heavyWorker) {
      this.heavyWorker = new Worker(`/stockfishWorker.js?v=${Date.now()}#/stockfish/stockfish.wasm`);
      console.log("[EnginePool] Initialized Heavy Worker (Game Analysis)");
    }
    return this.heavyWorker;
  }

  public getLiveWorker(): Worker {
    if (typeof window === "undefined") {
      throw new Error("Cannot instantiate Worker on server");
    }
    if (!this.liveWorker) {
      this.liveWorker = new Worker(`/stockfishWorker.js?v=${Date.now()}_live#/stockfish/stockfish.wasm`);
      console.log("[EnginePool] Initialized Live Worker (What-If / Free Board)");
    }
    return this.liveWorker;
  }
}

export const enginePool = EnginePool.getInstance();
