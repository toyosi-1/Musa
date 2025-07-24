"use client";

import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export default function EmptyState({ 
  icon, 
  title, 
  description, 
  action, 
  className = '' 
}: EmptyStateProps) {
  const defaultIcon = (
    <svg 
      className="h-16 w-16 text-gray-300 dark:text-gray-600" 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={1} 
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8l-4 4m0 0l-4-4m4 4V3" 
      />
    </svg>
  );

  return (
    <div className={`text-center py-12 px-6 ${className}`}>
      <div className="flex justify-center mb-6">
        {icon || defaultIcon}
      </div>
      
      <h3 className="heading-4 text-gray-900 dark:text-white mb-3">
        {title}
      </h3>
      
      <p className="body-normal text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
        {description}
      </p>
      
      {action && (
        <button
          onClick={action.onClick}
          className="btn-primary"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// Specialized empty states for common use cases
export function NoAccessCodesEmpty({ onCreateCode }: { onCreateCode: () => void }) {
  return (
    <EmptyState
      icon={
        <svg className="h-16 w-16 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
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
        <svg className="h-16 w-16 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
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
        <svg className="h-16 w-16 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      }
      title="No Pending Invitations"
      description="You don't have any household invitations at the moment. When someone invites you to join their household, it will appear here."
    />
  );
}
