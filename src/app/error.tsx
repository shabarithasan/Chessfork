"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-4xl flex-col items-center justify-center px-5 py-16 text-center sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-300/80">Something broke</p>
      <h1 className="mt-4 text-5xl font-semibold text-white">The page hit a runtime error.</h1>
      <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
        Try the request again. If the issue keeps happening, return to the main app surfaces and restart from a saved report or a new
        import.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
        >
          Return home
        </Link>
      </div>
      {error.digest ? <p className="mt-6 text-xs uppercase tracking-[0.22em] text-slate-500">Error ID: {error.digest}</p> : null}
    </div>
  );
}
