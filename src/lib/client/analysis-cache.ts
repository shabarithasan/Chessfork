import type { AnalysisRun } from "@/types/platform";

const dbName = "knightowl-analysis-cache";
const storeName = "reports";
const cacheTtlMs = 7 * 24 * 60 * 60 * 1000;

export type CachedAnalysisResponse = {
  analysisId: string;
  chartData?: unknown[];
  elapsedMs?: number;
  game?: unknown;
  message: string;
  moves?: unknown[];
  report: AnalysisRun;
  shareUrl: string;
  statistics?: unknown;
};

type StoredAnalysis = {
  createdAt: number;
  response: CachedAnalysisResponse;
};

function openAnalysisCache() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(storeName);
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function transaction<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) {
  return openAnalysisCache().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const request = run(tx.objectStore(storeName));

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        tx.oncomplete = () => db.close();
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      }),
  );
}

export async function hashAnalysisInput(pgn: string, mode: "deep" | "quick") {
  const data = new TextEncoder().encode(`${mode}:${pgn}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function readCachedAnalysis(cacheKey: string) {
  if (!("indexedDB" in window)) {
    return null;
  }

  const cached = await transaction<StoredAnalysis | undefined>("readonly", (store) => store.get(cacheKey)).catch(() => undefined);

  if (!cached) {
    return null;
  }

  if (Date.now() - cached.createdAt > cacheTtlMs) {
    await transaction("readwrite", (store) => store.delete(cacheKey)).catch(() => undefined);
    return null;
  }

  return cached.response;
}

export async function writeCachedAnalysis(cacheKey: string, response: CachedAnalysisResponse) {
  if (!("indexedDB" in window)) {
    return;
  }

  await transaction("readwrite", (store) => store.put({ createdAt: Date.now(), response } satisfies StoredAnalysis, cacheKey)).catch(() => undefined);
}
