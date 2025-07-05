'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('An error occurred:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-musa-bg dark:bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <h1 className="text-3xl font-bold text-red-500 mb-4">Oops! Something went wrong</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          {error.message || 'An unexpected error occurred. Please try again later.'}
        </p>
        <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-musa-blue text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-center"
          >
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
