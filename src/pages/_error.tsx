import { NextPage, NextPageContext } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

interface ErrorProps {
  statusCode: number;
  title?: string;
  message?: string;
}

const Error: NextPage<ErrorProps> = ({ statusCode = 500, title, message }) => {
  const router = useRouter();

  // Auto-redirect to home page if offline and error is not 404
  useEffect(() => {
    if (statusCode >= 500 && !navigator.onLine) {
      router.push('/offline');
    }
  }, [statusCode, router]);

  // Default error messages
  const errorMessages = {
    400: {
      title: 'Bad Request',
      message: 'The request could not be understood by the server.',
    },
    401: {
      title: 'Unauthorized',
      message: 'You need to be logged in to access this page.',
    },
    403: {
      title: 'Forbidden',
      message: 'You do not have permission to access this resource.',
    },
    404: {
      title: 'Page Not Found',
      message: 'The page you are looking for does not exist or has been moved.',
    },
    408: {
      title: 'Request Timeout',
      message: 'The request took too long to complete.',
    },
    500: {
      title: 'Internal Server Error',
      message: 'An unexpected error occurred on the server.',
    },
    502: {
      title: 'Bad Gateway',
      message: 'The server received an invalid response from another server.',
    },
    503: {
      title: 'Service Unavailable',
      message: 'The server is currently unable to handle the request.',
    },
    504: {
      title: 'Gateway Timeout',
      message: 'The server did not receive a timely response from another server.',
    },
    default: {
      title: title || 'An Error Occurred',
      message: message || 'An unexpected error occurred. Please try again later.',
    },
  };

  // Get the appropriate error message
  const error = statusCode ? errorMessages[statusCode as keyof typeof errorMessages] || errorMessages.default : errorMessages.default;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
      <Head>
        <title>{`${error.title} | Musa`}</title>
        <meta name="description" content={error.message} />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <div className="text-6xl font-bold text-blue-600 dark:text-blue-400 mb-4">
          {statusCode || 'Error'}
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {error.title}
        </h1>
        
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          {error.message}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
          >
            Refresh Page
          </button>
          
          <Link 
            href="/" 
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium rounded-md transition-colors text-center"
          >
            Go to Homepage
          </Link>
        </div>
        
        {!navigator.onLine && (
          <div className="mt-6 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md text-sm text-yellow-700 dark:text-yellow-300">
            You are currently offline. Some features may not be available.
          </div>
        )}
      </div>
      
      <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>If the problem persists, please contact support.</p>
        <p className="mt-1">Error code: {statusCode || 'unknown'}</p>
      </div>
    </div>
  );
};

Error.getInitialProps = async ({ res, err }: NextPageContext): Promise<ErrorProps> => {
  const statusCode = res ? res.statusCode : err ? err.statusCode || 500 : 404;
  return { statusCode } as ErrorProps;
};

export default Error;
