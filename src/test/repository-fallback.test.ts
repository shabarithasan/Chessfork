import { describe, expect, it, vi } from "vitest";

import { analyzePgn } from "@/lib/chess/analysis";
import { samplePgn, sampleCoachSnapshot } from "@/data/sample-data";
import type { AnalysisRun, CoachProfileSnapshot } from "@/types/platform";

const globalForFallbackStore = globalThis as typeof globalThis & {
  __knightowlFallbackAnalysisRuns?: Map<string, AnalysisRun>;
  __knightowlFallbackCoachSnapshots?: Map<string, CoachProfileSnapshot>;
};

describe("repository fallback stores", () => {
  it("keeps imported analysis runs available across module reloads", async () => {
    delete globalForFallbackStore.__knightowlFallbackAnalysisRuns;
    vi.resetModules();

    const firstRepository = await import("@/server/repositories/analysis-repository");
    const run = analyzePgn(samplePgn, {
      requestedDepth: "quick",
      source: "chesscom",
      subject: "hikaru",
    });

    await firstRepository.persistAnalysisRun(run, "chesscom");

    vi.resetModules();

    const secondRepository = await import("@/server/repositories/analysis-repository");
    const restored = await secondRepository.findAnalysisRunById(run.id);

    expect(restored?.id).toBe(run.id);
    expect(restored?.source).toBe("chesscom");
  }, 15000);

  it("keeps coach snapshots available across module reloads", async () => {
    delete globalForFallbackStore.__knightowlFallbackCoachSnapshots;
    vi.resetModules();

    const firstRepository = await import("@/server/repositories/coach-repository");
    const snapshot = {
      ...sampleCoachSnapshot,
      id: `${sampleCoachSnapshot.id}-fallback-test`,
      summary: "Fallback coach snapshot persisted across module reloads.",
    };

    await firstRepository.persistCoachSnapshot(snapshot);

    vi.resetModules();

    const secondRepository = await import("@/server/repositories/coach-repository");
    const restored = await secondRepository.findCoachSnapshotById(snapshot.id);

    expect(restored?.id).toBe(snapshot.id);
    expect(restored?.summary).toBe(snapshot.summary);
  }, 15000);
});
