import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  color?: 'primary' | 'secondary' | 'white' | 'red';
}

export default function LoadingSpinner({ 
  size = 'md', 
  fullScreen = false,
  color = 'primary' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-5 w-5 border-2',
    md: 'h-10 w-10 border-2',
    lg: 'h-16 w-16 border-3',
  };

  const colorClasses = {
    primary: 'border-t-primary border-r-transparent border-b-primary border-l-transparent',
    secondary: 'border-t-secondary border-r-transparent border-b-secondary border-l-transparent',
    white: 'border-t-white border-r-transparent border-b-white border-l-transparent',
    red: 'border-t-musa-red border-r-transparent border-b-musa-red border-l-transparent',
  };

  const spinner = (
    <div className="relative">
      <div className={`animate-spin rounded-full ${sizeClasses[size]} ${colorClasses[color]}`}></div>
      <div className={`absolute inset-0 rounded-full animate-ping opacity-30 ${colorClasses[color]}`}></div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-musa-bg/90 dark:bg-gray-900/90 z-50">
        {spinner}
        <p className="mt-4 text-gray-600 dark:text-gray-300 font-medium">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-4">
      {spinner}
    </div>
  );
}
