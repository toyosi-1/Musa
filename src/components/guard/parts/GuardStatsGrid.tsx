import { CheckCircleIcon } from '@heroicons/react/24/solid';

export interface GuardStats {
  totalVerifications: number;
  validAccess: number;
  deniedAccess: number;
  todayVerifications: number;
  successRate: number;
}

interface GuardStatsGridProps {
  stats: GuardStats;
  loading: boolean;
}

/** Four-up stats grid (today/total/granted/denied) plus the success-rate pill. */
export function GuardStatsGrid({ stats, loading }: GuardStatsGridProps) {
  const cells: Array<{ value: number; label: string; tone: string }> = [
    { value: stats.todayVerifications, label: 'Today',   tone: 'text-blue-600 dark:text-blue-400' },
    { value: stats.totalVerifications, label: 'Total',   tone: 'text-gray-800 dark:text-white' },
    { value: stats.validAccess,        label: 'Granted', tone: 'text-emerald-600 dark:text-emerald-400' },
    { value: stats.deniedAccess,       label: 'Denied',  tone: 'text-red-500 dark:text-red-400' },
  ];

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-1">
        Statistics
      </h2>
      <div className="grid grid-cols-4 gap-2 md:gap-3">
        {cells.map((cell) => (
          <div
            key={cell.label}
            className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-100 dark:border-gray-800 p-3 text-center"
          >
            <p className={`text-lg md:text-xl font-bold ${cell.tone}`}>
              {loading ? '-' : cell.value}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">
              {cell.label}
            </p>
          </div>
        ))}
      </div>
      <div className="flex justify-center mt-3">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50">
          <CheckCircleIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
            {loading ? '...' : `${stats.successRate}%`}
          </span>
          <span className="text-xs text-emerald-600 dark:text-emerald-400">success rate</span>
        </div>
      </div>
    </div>
  );
}
