"use client";

import React from 'react';

export type PageLoadingAccent = 'gray' | 'blue' | 'indigo' | 'purple' | 'emerald' | 'amber';

interface PageLoadingProps {
  /** Decorative icon shown inside the gradient container above the spinner. */
  icon: React.ReactNode;
  /** Accent color used for the icon-container gradient and the spinner ring. */
  accent?: PageLoadingAccent;
  /** Optional caption rendered below the spinner. */
  label?: string;
  /** Override the wrapper className when the default full-screen layout doesn't fit. */
  className?: string;
}

/**
 * Full-screen page-level loading indicator used while top-level data for a page
 * is being fetched. Matches the icon-in-gradient-container + spinner pattern
 * used across the admin section.
 *
 * For inline data-loading inside a page, use {@link LoadingSpinner} instead.
 */
const ACCENT_CLASSES: Record<PageLoadingAccent, { gradient: string; shadow: string; spinner: string }> = {
  gray: {
    gradient: 'from-gray-500 to-gray-600',
    shadow: 'shadow-gray-500/20',
    spinner: 'border-gray-200 border-t-gray-600',
  },
  blue: {
    gradient: 'from-blue-500 to-indigo-600',
    shadow: 'shadow-blue-500/20',
    spinner: 'border-blue-200 border-t-blue-600',
  },
  indigo: {
    gradient: 'from-indigo-500 to-violet-600',
    shadow: 'shadow-indigo-500/20',
    spinner: 'border-indigo-200 border-t-indigo-600',
  },
  purple: {
    gradient: 'from-purple-500 to-pink-600',
    shadow: 'shadow-purple-500/20',
    spinner: 'border-purple-200 border-t-purple-600',
  },
  emerald: {
    gradient: 'from-emerald-500 to-teal-600',
    shadow: 'shadow-emerald-500/20',
    spinner: 'border-emerald-200 border-t-emerald-600',
  },
  amber: {
    gradient: 'from-amber-500 to-orange-600',
    shadow: 'shadow-amber-500/20',
    spinner: 'border-amber-200 border-t-amber-600',
  },
};

export default function PageLoading({
  icon,
  accent = 'indigo',
  label,
  className,
}: PageLoadingProps) {
  const a = ACCENT_CLASSES[accent];
  const wrapperClass =
    className ??
    'flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950 gap-3';

  return (
    <div className={wrapperClass} role="status" aria-live="polite">
      <div
        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${a.gradient} flex items-center justify-center shadow-lg ${a.shadow} animate-pulse`}
      >
        {icon}
      </div>
      <div className={`w-5 h-5 border-2 ${a.spinner} rounded-full animate-spin`} />
      {label && <p className="text-sm text-gray-400">{label}</p>}
      <span className="sr-only">Loading{label ? `: ${label}` : ''}</span>
    </div>
  );
}
