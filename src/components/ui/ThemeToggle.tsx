'use client';

import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
import { useTheme } from '@/contexts/ThemeContext';
import { useState } from 'react';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const themeOptions = [
    { value: 'light' as const, label: 'Light', icon: SunIcon },
    { value: 'dark' as const, label: 'Dark', icon: MoonIcon },
    { value: 'system' as const, label: 'System', icon: ComputerDesktopIcon },
  ];

  const currentTheme = themeOptions.find(option => option.value === theme);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300 transform hover:scale-110 focus:ring-2 focus:ring-primary-300 dark:focus:ring-primary-600"
        aria-label={`Current theme: ${currentTheme?.label}. Click to change theme`}
      >
        {currentTheme && (
          <currentTheme.icon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setTheme(option.value);
                  setIsOpen(false);
                }}
                className={`
                  w-full px-3 py-2 text-left flex items-center gap-2 text-sm
                  hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200
                  ${theme === option.value 
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' 
                    : 'text-gray-700 dark:text-gray-300'
                  }
                  ${option.value === 'light' ? 'rounded-t-lg' : ''}
                  ${option.value === 'system' ? 'rounded-b-lg' : ''}
                `}
              >
                <option.icon className="w-4 h-4" />
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
