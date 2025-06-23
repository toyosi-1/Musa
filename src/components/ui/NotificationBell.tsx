'use client';

import { BellIcon } from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';

type NotificationBellProps = {
  count?: number;
  onClick?: () => void;
  className?: string;
};

export default function NotificationBell({ count = 0, onClick, className = '' }: NotificationBellProps) {
  const [animated, setAnimated] = useState(false);
  
  // Add entrance animation
  useEffect(() => {
    setAnimated(true);
  }, []);

  // Add animation when count changes
  useEffect(() => {
    if (count > 0) {
      setAnimated(false);
      setTimeout(() => setAnimated(true), 50);
    }
  }, [count]);

  return (
    <button 
      onClick={onClick}
      className={`relative p-2 rounded-full transition-all duration-300 ${
        count > 0 
          ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' 
          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
      } hover:bg-gray-200 dark:hover:bg-gray-700 ${className}`}
      aria-label={`Notifications ${count > 0 ? `(${count} unread)` : '(no notifications)'}`}
    >
      <BellIcon className={`w-5 h-5 transform ${
        animated && count > 0 ? 'animate-bounce-gentle' : ''
      }`} />
      
      {count > 0 && (
        <span className={`absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-800 ${
          animated ? 'animate-scale' : ''
        }`}>
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}
