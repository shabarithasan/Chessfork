import { Check, X } from "lucide-react";
import Link from "next/link";

const rows = [
  ["Analyze games", "Unlimited", "Unlimited"],
  ["Stockfish 18", "Yes", "Yes"],
  ["Game history", "Last 10", "Unlimited"],
  ["AI Coaching", "No", "Yes"],
  ["Streak sync", "Device only", "All devices"],
  ["Share reports", "Yes", "Yes"],
  ["Badges", "Yes", "Yes"],
] as const;

function FeatureValue({ value }: { value: string }) {
  if (value === "Yes") {
    return (
      <span className="inline-flex items-center gap-2 text-[#9fffea]">
        <Check className="size-4" />
        Yes
      </span>
    );
  }

  if (value === "No") {
    return (
      <span className="inline-flex items-center gap-2 text-slate-500">
        <X className="size-4" />
        No
      </span>
    );
  }

  return <span>{value}</span>;
}

export function FeaturesPage() {
  return (
    <section className="mx-auto w-full max-w-6xl py-8 sm:py-12">
      <div className="rounded-[1.5rem] border border-[#1e1e2e] bg-[#111118] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#00d4aa]">Guest vs account</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-white sm:text-5xl">
          Analysis is free first. Accounts only add memory.
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
          You can analyze games without signing up. Create a free account when you want unlimited history, synced streaks,
          saved favorites, and coach progress across devices.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/analyze" className="rounded-lg bg-[#00d4aa] px-4 py-2 text-sm font-black text-slate-950 hover:bg-[#26e8c1]">
            Start analyzing
          </Link>
          <Link href="/auth?next=%2Fprofile" className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-100 hover:bg-white/[0.08]">
            Create free account
          </Link>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-[#1e1e2e] bg-[#111118]">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.22em] text-slate-500">
                <th className="px-5 py-4 font-black">Feature</th>
                <th className="px-5 py-4 font-black">Guest</th>
                <th className="px-5 py-4 font-black">Free Account</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([feature, guest, account]) => (
                <tr key={feature} className="border-b border-white/6 last:border-b-0">
                  <td className="px-5 py-4 text-sm font-black text-white">{feature}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-slate-300">
                    <FeatureValue value={guest} />
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-slate-300">
                    <FeatureValue value={account} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
