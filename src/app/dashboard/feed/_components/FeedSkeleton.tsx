/**
 * Skeleton placeholder shown while the initial feed load is in flight.
 * Rendering three cards gives a better perceived-performance feel than
 * a single spinner.
 */
export function FeedSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden p-4"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1">
              <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded-full w-28 mb-1.5" />
              <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full w-16" />
            </div>
          </div>
          <div className="space-y-2 mb-3">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-full" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-4/5" />
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full w-3/5" />
          </div>
          {i === 1 && <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />}
          <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full w-12" />
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full w-12" />
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}
