import type { AnalysisMode } from "@/types/platform";

export function chooseAnalysisMode(params: {
  isAnonymous: boolean;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  prefersDeep?: boolean;
}) {
  if (params.prefersDeep) {
    return "worker" satisfies AnalysisMode;
  }

  if (params.isAnonymous && (params.deviceMemory ?? 8) >= 6 && (params.hardwareConcurrency ?? 8) >= 6) {
    return "browser" satisfies AnalysisMode;
  }

  if ((params.deviceMemory ?? 4) <= 4 || (params.hardwareConcurrency ?? 4) <= 4) {
    return "worker" satisfies AnalysisMode;
  }

  return "blended" satisfies AnalysisMode;
}
