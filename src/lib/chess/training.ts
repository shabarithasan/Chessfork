import { average } from "@/lib/utils";
import type {
  AnalysisRun,
  CoachPillar,
  CoachProfileSnapshot,
  TrainingModule,
  TrainingTask,
} from "@/types/platform";

export function buildTrainingModules(analysisRuns: AnalysisRun[]): TrainingModule[] {
  const blunders = analysisRuns.flatMap((run) =>
    run.criticalMoments.filter((moment) => moment.grade === "Blunder"),
  );
  const mistakes = analysisRuns.flatMap((run) =>
    run.criticalMoments.filter((moment) => moment.grade === "Mistake"),
  );

  const modules: TrainingModule[] = [
    {
      id: "woodpecker-cycle",
      title: "Woodpecker Cycle",
      description: "Repeat your error clusters until recognition becomes instant.",
      objective: "Shorten tactical hesitation windows.",
      cadence: "3 rounds over 7 days",
      tasks: blunders.slice(0, 3).map(
        (moment, index): TrainingTask => ({
          id: `woodpecker-${index + 1}`,
          title: `Re-solve ${moment.san} collapse`,
          description: moment.insight,
          focus: "Tactics",
          durationMinutes: 5,
          proof: [moment.san],
        }),
      ),
    },
    {
      id: "conversion-drills",
      title: "Conversion Drills",
      description: "Practice turning advantages into points.",
      objective: "Stabilize winning positions.",
      cadence: "4 positions this week",
      tasks: mistakes.slice(0, 3).map(
        (moment, index): TrainingTask => ({
          id: `conversion-${index + 1}`,
          title: `Convert after ${moment.san}`,
          description: "Play the cleanest continuation from a winning evaluation.",
          focus: "Conversion",
          durationMinutes: 4,
          proof: [moment.san, moment.insight],
        }),
      ),
    },
  ];

  return modules.map((module) => ({
    ...module,
    tasks: module.tasks.length
      ? module.tasks
      : [
          {
            id: `${module.id}-fallback`,
            title: "Baseline calibration",
            description: "No recurring issue detected yet; run a benchmark pack.",
            focus: module.title,
            durationMinutes: 10,
            proof: ["Awaiting more game evidence."],
          },
        ],
  }));
}

export function buildCoachSnapshot(subject: string, analysisRuns: AnalysisRun[]): CoachProfileSnapshot {
  const cpLosses = analysisRuns.flatMap((run) => run.moveEvaluations.map((move) => move.cpLoss));
  const avgLoss = average(cpLosses);
  const modules = buildTrainingModules(analysisRuns);

  const pillars: CoachPillar[] = [
    {
      name: "Blunders",
      score: Math.max(45, Math.round(100 - avgLoss / 2.8)),
      confidence: 86,
      trend: "Down from last month. Big losses happen after time pressure spikes.",
      evidence: analysisRuns.flatMap((run) => run.criticalMoments.slice(0, 1).map((moment) => moment.insight)),
    },
    {
      name: "Discipline",
      score: 74,
      confidence: 78,
      trend: "Healthy when you follow your opening structure.",
      evidence: ["Opening exits are stable through move 10 in most rapid games."],
    },
    {
      name: "Tactics",
      score: 81,
      confidence: 82,
      trend: "Calculation is strong, but second choices are too forcing.",
      evidence: ["Best tactical sequences appear in short bursts, not consistently."],
    },
    {
      name: "Conversion",
      score: 63,
      confidence: 80,
      trend: "This is the clearest growth area in better positions.",
      evidence: ["Winning advantages flatten when queens stay on the board."],
    },
    {
      name: "Preparation",
      score: 77,
      confidence: 69,
      trend: "Repertoire is coherent but missing anti-Sicilian depth.",
      evidence: ["Theory exit appears around move 8 against 1...c5."],
    },
  ];

  return {
    id: `coach-${subject.toLowerCase().replace(/\s+/g, "-")}`,
    generatedAt: new Date().toISOString(),
    subject,
    summary:
      "The player is tactically ambitious and creates chances, but their rating ceiling is currently set by avoidable collapses and shaky conversion technique.",
    pillars,
    dailyPlan: modules.flatMap((module) => module.tasks).slice(0, 3),
    modules,
  };
}
