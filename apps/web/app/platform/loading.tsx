export default function PlatformLoading() {
  return (
    <div className="min-h-screen bg-[#05070f] text-white">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute inset-x-0 top-0 h-[500px]"
          style={{
            background:
              "radial-gradient(700px 400px at 50% 0%, rgba(58,111,255,0.14), transparent 70%)"
          }}
        />
      </div>

      <div className="relative z-[1] flex min-h-screen flex-col">
        {/* Header skeleton */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/5 bg-[#05070f]/85 px-4 py-3 backdrop-blur-xl md:px-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 animate-pulse rounded-lg bg-[#3a6fff]/20" />
            <div className="h-5 w-24 animate-pulse rounded bg-white/10" />
          </div>
          <div className="h-8 w-32 animate-pulse rounded-full bg-white/5" />
        </header>

        <div className="flex flex-1">
          {/* Sidebar skeleton */}
          <aside className="hidden w-56 shrink-0 flex-col gap-2 border-r border-white/5 px-3 py-5 md:flex">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-9 animate-pulse rounded-lg bg-white/[0.03]" style={{ animationDelay: `${i * 100}ms` }} />
            ))}
          </aside>

          {/* Main content skeleton */}
          <main className="flex-1 p-4 md:p-6">
            <div className="mx-auto max-w-[1400px] space-y-4">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
                <div className="h-7 w-48 animate-pulse rounded bg-white/10" />
                <div className="mt-3 h-4 w-80 animate-pulse rounded bg-white/5" />
                <div className="mt-5 flex gap-2">
                  <div className="h-10 flex-1 animate-pulse rounded-lg bg-white/5" />
                  <div className="h-10 w-24 animate-pulse rounded-lg bg-white/5" />
                  <div className="h-10 w-28 animate-pulse rounded-lg bg-[#3a6fff]/10" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-40 animate-pulse rounded-xl border border-white/10 bg-white/[0.02]" style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
