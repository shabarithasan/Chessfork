import { useRef, useCallback, useMemo, useId } from "react";

interface Props {
  scores?: number[];
  annotations?: Record<number, string>;
  currentMoveIndex?: number;
  onMoveSelect?: (index: number) => void;
}

const VW = 376;
const VH = 78;
const MID_Y = VH / 2;

function scoreToCp(score: number): number {
  return (score - 50) * 6;
}

function cpToY(cp: number): number {
  const clamped = Math.max(-300, Math.min(300, cp));
  return MID_Y - (clamped / 300) * 37;
}

const BADGE_TO_SVG: Record<string, string> = {
  blunder: "blunder",
  mistake: "mistake",
  inaccuracy: "inaccuracy",
  brilliant: "brilliant",
  excellent: "excellent",
  great: "great_find",
  best: "best",
};

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;
  let d = `M${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = i > 0 ? pts[i - 1] : pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = i < pts.length - 2 ? pts[i + 2] : p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
}

const ChessEvaluationGraph = ({
  scores,
  annotations = {},
  currentMoveIndex = 0,
  onMoveSelect,
}: Props) => {
  const uid = useId();
  const svgRef = useRef<SVGSVGElement>(null);

  const points = useMemo(() => {
    if (!scores || scores.length === 0) return [];
    const total = scores.length;
    return scores.map((s, i) => {
      const cp = scoreToCp(s);
      const x = total > 1 ? (i / (total - 1)) * VW : VW / 2;
      const y = cpToY(cp);
      return { x, y, cp, index: i };
    });
  }, [scores]);

  const areaD = useMemo(() => {
    const pts = points;
    if (pts.length === 0) return "";
    const curve = smoothPath(pts);
    const last = pts[pts.length - 1];
    const firstX = pts[0]?.x ?? 0;
    return `${curve} L${last.x.toFixed(2)},${VH} L${firstX.toFixed(2)},${VH} Z`;
  }, [points]);

  const markerIdx = Math.min(Math.max(0, currentMoveIndex), points.length - 1);
  const markerPt = points[markerIdx];

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current || points.length < 2) return;
      const rect = svgRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const idx = Math.round(pct * (points.length - 1));
      if (idx !== currentMoveIndex && onMoveSelect) onMoveSelect(idx);
    },
    [points.length, currentMoveIndex, onMoveSelect],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current || points.length < 2) return;
      const rect = svgRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const idx = Math.round(pct * (points.length - 1));
      if (onMoveSelect) onMoveSelect(idx);
    },
    [points.length, onMoveSelect],
  );

  if (points.length === 0) {
    return (
      <div className="shrink-0 mt-3.5">
        <div className="flex items-center justify-center rounded-md bg-[#1f1f1f]" style={{ height: VH }}>
          <span className="text-xs text-stone-500">No evaluation data</span>
        </div>
      </div>
    );
  }

  return (
    <div className="shrink-0 mt-3.5">
      <div className="relative" style={{ height: VH }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VW} ${VH}`}
          preserveAspectRatio="none"
          className="block rounded-md bg-[#1f1f1f] cursor-pointer select-none"
          style={{ width: "100%", height: "100%", touchAction: "none" }}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
        >
          <defs>
            <clipPath id={`${uid}-reveal`}>
              <rect x="0" y="0" width={VW} height={VH} />
            </clipPath>
            <clipPath id={`${uid}-ahead`}>
              <rect x={markerPt?.x ?? 0} y="0" width={VW - (markerPt?.x ?? 0)} height={VH} />
            </clipPath>
          </defs>

          {/* Reveal layer (past + future, dim) */}
          <g clipPath={`url(#${uid}-reveal)`}>
            <path d={areaD} fill="#f5f5f4" fillOpacity={0.24} />
          </g>

          {/* Ahead layer (future, bright) */}
          <g clipPath={`url(#${uid}-ahead)`}>
            <path d={areaD} fill="#f5f5f4" fillOpacity={0.94} />
          </g>

          {/* Equilibrium line */}
          <line x1="0" y1={MID_Y} x2={VW} y2={MID_Y} stroke="rgba(115,115,115,.45)" strokeWidth={1} />

          {/* Current move vertical line */}
          {markerPt && (
            <>
              <line x1={markerPt.x} y1={2} x2={markerPt.x} y2={VH - 2} stroke="#fbbf24" strokeWidth={1.5} />
              <circle cx={markerPt.x} cy={markerPt.y} r={4.2} fill="#fbbf24" stroke="#171717" strokeWidth={1.5} />
              <circle cx={markerPt.x} cy={markerPt.y} r={3.4} fill="#fafafa" stroke="#171717" strokeWidth={1.4} />
            </>
          )}
        </svg>

        {/* Badges + score pill */}
        <div className="pointer-events-none absolute inset-0">
          {Object.entries(annotations).map(([idxStr, type]) => {
            const idx = Number(idxStr);
            const pt = points[idx];
            if (!pt) return null;
            const badgeKey = type.toLowerCase();
            const svgFile = BADGE_TO_SVG[badgeKey] ?? badgeKey;
            const leftPct = (pt.x / VW) * 100;
            const isPast = pt.x < (markerPt?.x ?? 0);
            return (
              <div
                key={idxStr}
                className="absolute -translate-x-1/2 -translate-y-1/2 transition-opacity duration-150"
                style={{
                  left: `clamp(7px, ${leftPct}%, calc(100% - 7px))`,
                  top: pt.y,
                  opacity: isPast ? 0.4 : 1,
                }}
              >
                <div style={{ filter: "drop-shadow(rgba(23,23,23,.9) 0 0 1px) drop-shadow(rgba(0,0,0,.45) 0 1px 1.5px)" }}>
                  <img
                    alt={badgeKey}
                    width={12}
                    height={12}
                    decoding="async"
                    src={`/images/brilliance_v2/svg/${svgFile}.svg`}
                    style={{ color: "transparent" }}
                  />
                </div>
              </div>
            );
          })}

          {/* Score pill at current move */}
          {markerPt && (
            <div
              className="absolute"
              style={{
                left: `clamp(2px, ${(markerPt.x / VW) * 100}%, calc(100% - 2px))`,
                top: markerPt.y,
                transform: "translate(-50%, -100%)",
              }}
            >
              <div className="whitespace-nowrap rounded-md bg-[#fafafa] px-1.5 py-[3px] text-[11px] font-bold leading-none tabular-nums text-[#171717] shadow-[0_1px_5px_rgba(0,0,0,.45)]">
                {markerPt.cp >= 0 ? "+" : ""}{(markerPt.cp / 100).toFixed(1)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChessEvaluationGraph;
