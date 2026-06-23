import { normalizeFen } from "@/lib/chess/fen";
import { hashString } from "@/lib/utils";

export function createAnalysisCacheKey(params: {
  fen: string;
  depth: number;
  engineVersion: string;
}) {
  return [
    "analysis",
    hashString(normalizeFen(params.fen)),
    params.engineVersion,
    params.depth,
  ].join(":");
}
