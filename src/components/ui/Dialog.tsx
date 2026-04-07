"use client";

import React, { useState, useEffect } from 'react';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Dialog({ isOpen, onClose, title, children }: DialogProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timeout = setTimeout(() => {
        setIsVisible(false);
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  if (!isVisible && !isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 
      ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
      
      <div 
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden w-full max-w-md z-10
        transform transition-transform duration-200 ${isOpen ? 'scale-100' : 'scale-95'}`}
      >
        {title && (
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          </div>
        )}
        
        <div className="p-6">
          {children}
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 
            rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
