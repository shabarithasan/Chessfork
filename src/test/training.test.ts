import { describe, expect, it } from "vitest";

import { buildCoachSnapshot, buildTrainingModules } from "@/lib/chess/training";
import { baseAnalysis } from "@/data/sample-data";

describe("training synthesis", () => {
  it("builds repeatable modules from reports", () => {
    const modules = buildTrainingModules([baseAnalysis]);

    expect(modules.length).toBeGreaterThan(0);
    expect(modules[0].tasks.length).toBeGreaterThan(0);
  });

  it("builds a coach snapshot with all five pillars", () => {
    const snapshot = buildCoachSnapshot("Maya Lopez", [baseAnalysis]);

    expect(snapshot.pillars).toHaveLength(5);
    expect(snapshot.dailyPlan.length).toBeGreaterThan(0);
  });
});
