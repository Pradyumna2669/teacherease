// The route the Android launcher opens. Painting the splash's ground and mark
// again means the splash hands off to something that still looks like the app,
// instead of a spinner on a bare page.
export default function DashboardLoading() {
  return (
    <div
      role="status"
      className="min-h-[100dvh] bg-paper flex flex-col items-center justify-center gap-6 px-6"
    >
      <div className="w-14 h-14 bg-ink rounded-2xl flex items-center justify-center">
        <span className="font-display text-2xl font-semibold text-white">
          P<span className="text-pen">G</span>
        </span>
      </div>
      <p className="text-sm text-graphite motion-safe:animate-pulse">
        Opening your papers…
      </p>
    </div>
  );
}
