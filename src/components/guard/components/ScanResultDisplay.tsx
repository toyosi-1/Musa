import React from 'react';
import { CheckCircleIcon, XCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { MapPinIcon } from '@heroicons/react/20/solid';
import { Household, VerificationResult } from '../types';

interface ScanResultDisplayProps {
  result: VerificationResult;
  onClose?: () => void;
}

export const ScanResultDisplay = React.memo(({ result, onClose }: ScanResultDisplayProps) => {
  const bgColor = result.isValid 
    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
  
  const textColor = result.isValid 
    ? 'text-green-800 dark:text-green-200' 
    : 'text-red-800 dark:text-red-200';
  
  const iconColor = result.isValid ? 'text-green-500' : 'text-red-500';
  
  return (
    <div className={`p-6 mt-6 rounded-xl border relative ${bgColor}`}>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200"
          aria-label="Close"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      )}
      
      <div className="flex items-start">
        <div className={`flex-shrink-0 mt-0.5 ${iconColor}`}>
          {result.isValid ? (
            <CheckCircleIcon className="h-6 w-6" />
          ) : (
            <XCircleIcon className="h-6 w-6" />
          )}
        </div>
        <div className="ml-3 pr-6">
          <h3 className={`text-lg font-medium ${textColor}`}>
            {result.isValid ? 'Access Granted' : 'Access Denied'}
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {result.message}
          </p>
          {result.household && (
            <div className="mt-2 flex items-center text-sm text-gray-600 dark:text-gray-300">
              <MapPinIcon className="h-4 w-4 mr-1.5 flex-shrink-0" />
              <span>{result.household.address}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
