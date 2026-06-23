function LoadingCard({
  className = "",
}: {
  className?: string;
}) {
  return <div className={`animate-pulse rounded-[1.5rem] border border-white/8 bg-white/[0.04] ${className}`} />;
}

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8">
      <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <LoadingCard className="h-4 w-36" />
          <LoadingCard className="mt-5 h-16 w-full max-w-3xl" />
          <LoadingCard className="mt-5 h-24 w-full max-w-2xl" />
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <LoadingCard className="h-28" />
            <LoadingCard className="h-28" />
            <LoadingCard className="h-28" />
          </div>
        </div>

        <LoadingCard className="min-h-[30rem]" />
      </div>

      <div className="mt-16 grid gap-6 lg:grid-cols-3">
        <LoadingCard className="h-64" />
        <LoadingCard className="h-64" />
        <LoadingCard className="h-64" />
      </div>
    </div>
  );
}
