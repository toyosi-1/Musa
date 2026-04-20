import { format, formatDistanceToNow } from 'date-fns';
import { CheckCircleIcon, ClockIcon, MapPinIcon, XCircleIcon } from '@heroicons/react/24/solid';
import type { VerificationRecord } from '@/services/guardActivityService';

interface VerificationHistoryPanelProps {
  records: VerificationRecord[];
  isLoading: boolean;
}

function isExpired(record: VerificationRecord): boolean {
  return !!record.message?.toLowerCase().includes('expired');
}

function truncateCode(code: string): string {
  return code.length > 8 ? `${code.substring(0, 8)}...` : code;
}

/** Right-column list of recent verification attempts for the guard. */
export function VerificationHistoryPanel({ records, isLoading }: VerificationHistoryPanelProps) {
  return (
    <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex-grow flex flex-col">
      <div className="p-4 md:p-5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <ClockIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Security Log</h2>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              {records.length} recent entries
            </p>
          </div>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto">
        {records.length > 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {records.map((record, index) => (
              <HistoryRow key={record.id} record={record} index={index} />
            ))}
          </div>
        ) : (
          <EmptyHistory loading={isLoading} />
        )}
      </div>
    </div>
  );
}

function HistoryRow({ record, index }: { record: VerificationRecord; index: number }) {
  const expired = isExpired(record);

  const statusIconBg = record.isValid
    ? 'bg-success-100 dark:bg-success-900/30'
    : expired
      ? 'bg-orange-100 dark:bg-orange-900/30'
      : 'bg-danger-100 dark:bg-danger-900/30';

  const statusPillClass = record.isValid
    ? 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-400'
    : expired
      ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
      : 'bg-danger-100 text-danger-800 dark:bg-danger-900/30 dark:text-danger-400';

  const statusLabel = record.isValid ? 'GRANTED' : expired ? 'EXPIRED' : 'DENIED';

  return (
    <div className="p-3 md:p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200">
      <div className="flex items-start gap-3 md:gap-4">
        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${statusIconBg}`}>
          {record.isValid ? (
            <CheckCircleIcon className="h-4 w-4 md:h-5 md:w-5 text-success" />
          ) : expired ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5 text-orange-600 dark:text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12,6 12,12 16,14" />
            </svg>
          ) : (
            <XCircleIcon className="h-4 w-4 md:h-5 md:w-5 text-danger" />
          )}
        </div>

        <div className="flex-grow min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-grow min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-mono text-sm md:text-base font-semibold text-gray-800 dark:text-white truncate">
                  {truncateCode(record.code)}
                </p>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusPillClass}`}>
                  {statusLabel}
                </span>
              </div>

              {record.message && (
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
                  {record.message}
                </p>
              )}

              {record.destinationAddress && (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 mb-2">
                  <p className="text-xs text-gray-500 dark:text-gray-300 mb-1 flex items-center gap-1">
                    <MapPinIcon className="h-3 w-3" />
                    Destination:
                  </p>
                  <p className="text-xs md:text-sm text-gray-700 dark:text-gray-300 font-medium">
                    {record.destinationAddress.split('\n')[0]}
                    {record.destinationAddress.includes('\n') && (
                      <span className="text-gray-500 dark:text-gray-300"> (+more)</span>
                    )}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-300">
                <span className="flex items-center gap-1">
                  <ClockIcon className="h-3 w-3" />
                  {formatDistanceToNow(new Date(record.timestamp), { addSuffix: true })}
                </span>
                <span className="hidden sm:inline">
                  {format(new Date(record.timestamp), 'MMM d, HH:mm')}
                </span>
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300">
                {index + 1}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyHistory({ loading }: { loading: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="w-14 h-14 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-3">
        <ClockIcon className="h-6 w-6 text-gray-300 dark:text-gray-600" />
      </div>
      <p className="text-sm font-medium text-gray-400 dark:text-gray-500">
        {loading ? 'Loading...' : 'No recent activity'}
      </p>
      <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">
        {loading ? '' : 'Verification records will appear here'}
      </p>
    </div>
  );
}
