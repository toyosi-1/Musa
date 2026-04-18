"use client";

import React from 'react';

interface ErrorStateProps {
  /** Optional custom icon. Defaults to a warning triangle. */
  icon?: React.ReactNode;
  /** Short headline shown in bold. */
  title?: string;
  /** Longer explanation / next-step guidance. */
  description?: string;
  /** Optional raw error (Error instance or string) to surface technical details. */
  error?: Error | string | null;
  /** Optional retry handler — renders a "Try Again" button when provided. */
  onRetry?: () => void;
  /** Optional label for a secondary action (e.g. "Contact Support"). */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** When true, uses a compact inline layout instead of the full-width centered card. */
  compact?: boolean;
  className?: string;
}

/**
 * Standard error-state component used across the app to show a consistent
 * message when something fails to load or an action errors out.
 *
 * Examples:
 *   <ErrorState title="Couldn't load vendors" onRetry={refetch} />
 *   <ErrorState error={err} compact />
 */
export default function ErrorState({
  icon,
  title = 'Something went wrong',
  description = 'Please try again in a moment. If the issue persists, contact support.',
  error,
  onRetry,
  secondaryAction,
  compact = false,
  className = '',
}: ErrorStateProps) {
  const defaultIcon = (
    <svg
      className={compact ? 'h-8 w-8 text-red-500' : 'h-16 w-16 text-red-500'}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
      />
    </svg>
  );

  const errorMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : null;

  if (compact) {
    return (
      <div
        role="alert"
        className={`flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30 ${className}`}
      >
        <div className="flex-shrink-0">{icon || defaultIcon}</div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-red-900 dark:text-red-200">{title}</h4>
          <p className="mt-1 text-sm text-red-700 dark:text-red-300">{description}</p>
          {errorMessage && (
            <p className="mt-2 break-words text-xs font-mono text-red-600 dark:text-red-400">
              {errorMessage}
            </p>
          )}
          {(onRetry || secondaryAction) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  Try Again
                </button>
              )}
              {secondaryAction && (
                <button
                  onClick={secondaryAction.onClick}
                  className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-300 hover:bg-red-100 dark:bg-red-950 dark:text-red-200 dark:ring-red-800 dark:hover:bg-red-900"
                >
                  {secondaryAction.label}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div role="alert" className={`text-center py-12 px-6 ${className}`}>
      <div className="flex justify-center mb-6">{icon || defaultIcon}</div>

      <h3 className="heading-4 text-gray-900 dark:text-white mb-3">{title}</h3>

      <p className="body-normal text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-4">
        {description}
      </p>

      {errorMessage && (
        <details className="mb-6 max-w-md mx-auto text-left">
          <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            Technical details
          </summary>
          <pre className="mt-2 overflow-auto rounded-md bg-gray-100 p-3 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            {errorMessage}
          </pre>
        </details>
      )}

      {(onRetry || secondaryAction) && (
        <div className="flex flex-wrap justify-center gap-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 rounded-xl shadow-md shadow-red-500/20 transition-all"
            >
              Try Again
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="px-5 py-2.5 text-sm font-bold text-gray-700 bg-white ring-1 ring-inset ring-gray-300 hover:bg-gray-50 rounded-xl transition-all dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-600 dark:hover:bg-gray-700"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Network-specific error state. */
export function NetworkErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      icon={
        <svg className="h-16 w-16 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z"
          />
        </svg>
      }
      title="Connection problem"
      description="We can't reach our servers right now. Please check your internet connection and try again."
      onRetry={onRetry}
    />
  );
}

/** Permission-denied error (403). */
export function PermissionDeniedState({ onGoBack }: { onGoBack?: () => void }) {
  return (
    <ErrorState
      icon={
        <svg className="h-16 w-16 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
          />
        </svg>
      }
      title="You don't have access"
      description="This area is restricted. Contact your estate administrator if you believe this is a mistake."
      onRetry={onGoBack}
    />
  );
}
