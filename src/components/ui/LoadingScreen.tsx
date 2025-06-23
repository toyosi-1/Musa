'use client';

import React from 'react';

interface LoadingScreenProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  showBackground?: boolean;
}

export default function LoadingScreen({ 
  message = 'Loading...', 
  size = 'md',
  showBackground = true 
}: LoadingScreenProps) {
  // Determine size classes
  const sizeClasses = {
    sm: 'w-12 h-12 border-3',
    md: 'w-16 h-16 border-4',
    lg: 'w-20 h-20 border-4'
  };

  // Determine text size classes
  const textSizeClasses = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl'
  };

  return (
    <div className={`fixed inset-0 flex flex-col items-center justify-center z-50 ${showBackground ? 'bg-white dark:bg-gray-900' : ''} p-4`}>
      <div className={`${sizeClasses[size]} border-primary border-t-transparent rounded-full animate-spin`}>
        <span className="sr-only">Loading</span>
      </div>
      {message && (
        <p className={`mt-4 ${textSizeClasses[size]} font-medium text-gray-700 dark:text-gray-300 text-center max-w-xs sm:max-w-sm`}>
          {message}
        </p>
      )}
    </div>
  );
}
