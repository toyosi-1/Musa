"use client";

import React from 'react';

interface EmptyStateProps {
  /** Custom icon (rendered inside the rounded container). Falls back to a generic placeholder. */
  icon?: React.ReactNode;
  /** Required headline. */
  title: string;
  /** Optional supporting copy. Pass `null` or omit to skip. */
  description?: string | null;
  /** Simple primary action — renders a blue gradient button. For custom CTAs use `children`. */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Custom CTA(s) rendered after the description. Use when `action` styling doesn't fit. */
  children?: React.ReactNode;
  /**
   * - `'card'` (default): wraps content in a rounded card with shadow — for top-level page emptiness.
   * - `'plain'`: just centered text — for use inside an existing card or sub-section.
   */
  variant?: 'plain' | 'card';
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  children,
  variant = 'card',
  className = '',
}: EmptyStateProps) {
  const defaultIcon = (
    <svg
      className="h-8 w-8 text-gray-300 dark:text-gray-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8l-4 4m0 0l-4-4m4 4V3"
      />
    </svg>
  );

  const inner = (
    <>
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        {icon || defaultIcon}
      </div>

      <h3 className="text-base font-bold text-gray-800 dark:text-white mb-1">
        {title}
      </h3>

      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-5">
          {description}
        </p>
      )}

      {action && (
        <button
          onClick={action.onClick}
          className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-md shadow-blue-500/20 transition-all"
        >
          {action.label}
        </button>
      )}

      {children}
    </>
  );

  if (variant === 'plain') {
    return <div className={`text-center py-12 px-6 ${className}`}>{inner}</div>;
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-12 text-center ${className}`}
    >
      {inner}
    </div>
  );
}

// Specialized empty states for common use cases
export function NoAccessCodesEmpty({ onCreateCode }: { onCreateCode: () => void }) {
  return (
    <EmptyState
      icon={
        <svg className="h-8 w-8 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      }
      title="No Access Codes Yet"
      description="Create your first access code to start sharing secure entry with visitors, family, or service providers."
      action={{
        label: "Create Access Code",
        onClick: onCreateCode
      }}
    />
  );
}

export function NoHouseholdEmpty({ onCreateHousehold }: { onCreateHousehold: () => void }) {
  return (
    <EmptyState
      icon={
        <svg className="h-8 w-8 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      }
      title="Create Your Household"
      description="Set up your household to start managing access codes and inviting family members to join your secure community."
      action={{
        label: "Create Household",
        onClick: onCreateHousehold
      }}
    />
  );
}

export function NoInvitationsEmpty() {
  return (
    <EmptyState
      icon={
        <svg className="h-8 w-8 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      }
      title="No Pending Invitations"
      description="You don't have any household invitations at the moment. When someone invites you to join their household, it will appear here."
    />
  );
}
