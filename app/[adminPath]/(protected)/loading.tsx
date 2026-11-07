export default function AdminLoadingSkeleton() {
  return (
    <div className="p-6 lg:p-8 max-w-[1440px] mx-auto w-full flex flex-col gap-6 animate-pulse">
      {/* Top Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-black/[0.06] dark:border-white/[0.07]">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-48 rounded-[10px] bg-black/[0.06] dark:bg-white/[0.08]" />
          <div className="h-4 w-72 rounded-[6px] bg-black/[0.04] dark:bg-white/[0.05]" />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-24 rounded-full bg-black/[0.05] dark:bg-white/[0.07]" />
          <div className="h-9 w-32 rounded-full bg-[#ff4f31]/20" />
        </div>
      </div>

      {/* KPI Cards Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 rounded-[20px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.08] shadow-xs flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-24 rounded bg-black/[0.05] dark:bg-white/[0.06]" />
              <div className="h-7 w-7 rounded-[10px] bg-black/[0.04] dark:bg-white/[0.06]" />
            </div>
            <div className="h-8 w-20 rounded-[8px] bg-black/[0.08] dark:bg-white/[0.1]" />
            <div className="h-3 w-32 rounded bg-black/[0.04] dark:bg-white/[0.05]" />
          </div>
        ))}
      </div>

      {/* Main Table / Content Skeleton */}
      <div className="rounded-[24px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.08] p-6 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-36 rounded bg-black/[0.06] dark:bg-white/[0.08]" />
          <div className="h-9 w-48 rounded-full bg-black/[0.04] dark:bg-white/[0.06]" />
        </div>
        <div className="flex flex-col gap-2.5 pt-2">
          {[1, 2, 3, 4, 5, 6].map((row) => (
            <div
              key={row}
              className="h-12 w-full rounded-[14px] bg-black/[0.03] dark:bg-white/[0.04]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
