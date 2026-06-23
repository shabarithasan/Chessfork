import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-4xl flex-col items-center justify-center px-5 py-16 text-center sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-300/80">Not found</p>
      <h1 className="mt-4 text-5xl font-semibold text-white">That page is off the board.</h1>
      <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
        The route you asked for does not exist, was moved, or has not been published yet. The main analysis and training surfaces are
        still available from the home page.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
      >
        Return home
      </Link>
    </div>
  );
}
