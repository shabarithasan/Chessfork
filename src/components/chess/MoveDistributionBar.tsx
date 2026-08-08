import { cn } from "@/lib/utils";
import type { ReportTabStats } from "@/components/chess/ReportTab";

export function MoveDistributionBar({
  stats,
  side,
  className,
}: {
  stats: ReportTabStats;
  side: "left" | "right";
  className?: string;
}) {
  const categories = [
    { key: "Brilliant", color: "bg-[#525252]" },
    { key: "Great", color: "bg-[#658ba7]" },
    { key: "Best", color: "bg-[#6b8841]" },
    { key: "Excellent", color: "bg-[#81a153]" },
    { key: "Good", color: "bg-[#96b864]" },
    { key: "Book", color: "bg-[#a3907c]" },
    { key: "Inaccuracy", color: "bg-[#eac069]" },
    { key: "Mistake", color: "bg-[#d88c39]" },
    { key: "Blunder", color: "bg-[#a2251c]" },
  ] as const;

  let total = 0;
  const items = categories.map((cat) => {
    // @ts-ignore
    const count = (stats[cat.key]?.[side] as number) || 0;
    total += count;
    return { ...cat, count };
  }).filter((c) => c.count > 0);

  if (total === 0) return null;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex w-full h-[6px] overflow-hidden rounded-full bg-neutral-800">
        {items.map((item) => (
          <div
            key={item.key}
            className={cn("h-full transition-all duration-300", item.color)}
            style={{ width: `${(item.count / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-2.5 gap-y-1">
        {items.map((item) => (
          <div key={item.key} className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", item.color)} />
            <span className="text-[11px] font-medium text-neutral-400">
              <span className="text-neutral-200">{item.count}</span> {item.key}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
