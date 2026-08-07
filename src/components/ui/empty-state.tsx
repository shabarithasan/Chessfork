import Link from "next/link";
import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

type EmptyStateAction = {
  label: string;
  href: string;
};

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  className?: string;
};

/**
 * Standard empty-state surface: icon, title, description, and an optional
 * primary CTA link. Centered, calm, on-brand with the dark surface cards.
 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-[1.5rem] border border-white/10 bg-white/[0.02] px-6 py-16 text-center",
        className,
      )}
    >
      <div className="grid size-14 place-items-center rounded-2xl border border-[#00d4aa]/20 bg-[#00d4aa]/10 text-[#9fffea]">
        {icon}
      </div>
      <div className="space-y-2">
        <p className="text-lg font-semibold text-white">{title}</p>
        {description ? (
          <p className="mx-auto max-w-md text-sm leading-7 text-slate-400">{description}</p>
        ) : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className="premium-primary-action mt-1 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-slate-950 transition"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
