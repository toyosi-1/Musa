'use client';

import { useEffect } from 'react';

/**
 * Top-level App Router error boundary. Catches render/runtime errors in any
 * route segment so users see a friendly recovery screen instead of a blank page.
 *
 * Next.js automatically wires this file as the boundary for the root layout.
 * See: https://nextjs.org/docs/app/building-your-application/routing/error-handling
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console and (later) send to an error tracking service
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f0] px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-[#e5e5e0] p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#2d2d2d]">Something went wrong</h2>
            <p className="text-xs text-[#7a7a6e]">An unexpected error occurred.</p>
          </div>
        </div>

        <p className="text-sm text-[#5a5a50] mb-4">
          You can try again, or go back to the home page. If this keeps happening, please contact support.
        </p>

        {error.digest && (
          <p className="text-[10px] text-[#999] font-mono mb-4">Ref: {error.digest}</p>
        )}

        <div className="flex gap-2">
          <button
            onClick={reset}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#4a7c59] text-white text-sm font-semibold hover:bg-[#3d6a4b] transition-colors"
          >
            Try again
          </button>
          <a
            href="/"
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#f0f0eb] text-[#5a5a50] text-sm font-semibold text-center hover:bg-[#e5e5e0] transition-colors"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
