import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { VerificationRecord } from '../types';

interface VerificationHistoryListProps {
  history: VerificationRecord[];
  isLoading: boolean;
}

export const VerificationHistoryList = React.memo(({ history, isLoading }: VerificationHistoryListProps) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
          <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-700 rounded-lg p-6 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No verification history</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Your recent access code verifications will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-300px)] pr-2 -mr-2">
      {history.map((record) => {
        const borderColor = record.isValid 
          ? 'border-green-200 dark:border-green-800' 
          : 'border-red-200 dark:border-red-800';
        const bgColor = record.isValid 
          ? 'bg-green-50 dark:bg-green-900/10' 
          : 'bg-red-50 dark:bg-red-900/10';
        const textColor = record.isValid 
          ? 'text-green-700 dark:text-green-400' 
          : 'text-red-700 dark:text-red-400';

        return (
          <div 
            key={record.id} 
            className={`p-4 rounded-lg border ${borderColor} ${bgColor} transition-colors duration-150`}
          >
            <div className="flex justify-between items-start">
              <div className="font-medium">
                <span className={textColor}>
                  {record.isValid ? 'Granted' : 'Denied'}
                </span>
                <span className="mx-2 text-gray-400">•</span>
                <span className="font-mono text-sm text-gray-600 dark:text-gray-300">
                  {record.code}
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {formatDistanceToNow(record.timestamp, { addSuffix: true })}
              </div>
            </div>
            {record.message && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {record.message}
              </p>
            )}
            {record.destinationAddress && (
              <div className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
                <svg
                  className="h-3.5 w-3.5 mr-1.5 flex-shrink-0 text-gray-400"
                  fill="none"
                  viewBox="0 0 20 20"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="truncate">{record.destinationAddress}</span>
              </div>
            )}
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {new Date(record.timestamp).toLocaleString()}
            </div>
          </div>
        );
      })}
    </div>
  );
});
