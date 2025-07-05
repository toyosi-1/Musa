'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();
  
  const handleGoBack = () => {
    router.back();
  };
  return (
    <div className="min-h-screen bg-musa-bg dark:bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <h1 className="text-6xl font-bold text-musa-blue dark:text-blue-400 mb-4">404</h1>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Page Not Found
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4 justify-center">
          <Link
            href="/"
            className="px-4 py-2 bg-musa-blue text-white rounded-md hover:bg-blue-600 transition-colors text-center"
          >
            Go to Home
          </Link>
          <button
            onClick={handleGoBack}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
