"use client";

import { useState } from 'react';
import { AccessCode } from '@/types/user';
import Image from 'next/image';

interface AccessCodeCardProps {
  accessCode: AccessCode;
  onDeactivate: () => Promise<void>;
}

export default function AccessCodeCard({ accessCode, onDeactivate }: AccessCodeCardProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // Check if code is expired
  const isExpired = accessCode.expiresAt ? accessCode.expiresAt < Date.now() : false;

  // Format expiration date
  const formatExpirationDate = (timestamp: number) => {
    if (!timestamp) return 'Never expires';
    
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Copy code to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(accessCode.code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Share code via available share mechanisms
  const shareCode = async () => {
    if (!navigator.share) return;
    
    try {
      await navigator.share({
        title: 'Musa Access Code',
        text: `Here's my access code for the estate: ${accessCode.code}`,
      });
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  // Handle deactivation
  const handleDeactivate = async () => {
    if (!window.confirm('Are you sure you want to deactivate this access code? This cannot be undone.')) {
      return;
    }
    
    setIsDeactivating(true);
    try {
      await onDeactivate();
    } catch (err) {
      console.error('Error deactivating:', err);
    } finally {
      setIsDeactivating(false);
    }
  };

  return (
    <div className={`w-full box-border bg-musa-bg dark:bg-gray-900/50 rounded-xl md:rounded-2xl shadow-lg border border-transparent dark:border-gray-700/50 animate-fade-in transition-all duration-300 ${!accessCode.isActive || isExpired ? 'opacity-80' : 'hover:shadow-card-hover'}`}>
      {/* Status indicator */}
      <div className={`w-full h-1.5 rounded-t-xl md:rounded-t-2xl ${!accessCode.isActive ? 'bg-gray-300 dark:bg-gray-600' : isExpired ? 'bg-warning' : 'bg-success'}`}></div>
      
      <div className="p-4 md:p-5">
        {/* Code header with status badge */}
        <div className="flex justify-between items-start mb-3 md:mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg md:text-xl font-bold font-mono tracking-wide break-all">
                {accessCode.code}
              </h3>
              <span className={`badge text-xs ${!accessCode.isActive ? 'badge-danger' : isExpired ? 'badge-warning' : 'badge-success'}`}>
                {!accessCode.isActive ? 'Inactive' : isExpired ? 'Expired' : 'Active'}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-300 mt-1 break-words">
              {accessCode.description || 'No description'}
            </p>
          </div>
          
          <div className="flex space-x-1 md:space-x-2 ml-2">
            <button 
              onClick={copyToClipboard}
              className="p-1.5 md:p-2 text-gray-500 hover:text-primary-600 transition-all duration-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Copy to clipboard"
            >
              {isCopied ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              )}
            </button>
            
            {typeof navigator.share === 'function' && (
              <button 
                onClick={shareCode}
                className="p-2 text-gray-500 hover:text-primary-600 transition-all duration-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Share"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                </svg>
              </button>
            )}
          </div>
        </div>
        
        {/* QR Code display */}
        <div className="mb-4">
          {showQR && accessCode.qrCode ? (
            <div className="relative w-full box-border bg-white dark:bg-gray-800 p-4 rounded-xl shadow-card border border-gray-200 dark:border-gray-700 animate-fade-in">
              <div className="absolute top-2 right-2">
                <button 
                  onClick={() => setShowQR(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              <div className="flex justify-center w-full overflow-hidden">
                <Image 
                  src={accessCode.qrCode} 
                  alt="QR Code" 
                  width={200} 
                  height={200}
                  className="rounded-md max-w-full h-auto"
                />
              </div>
              <div className="mt-2 text-center text-xs text-gray-500 dark:text-gray-300">
                Scan this code for entry
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowQR(true)}
              className="w-full py-3 px-4 box-border bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 shadow-sm hover:shadow group overflow-hidden"
            >
              <span className="flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 group-hover:text-primary-500 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <rect x="7" y="7" width="3" height="3"></rect>
                  <rect x="14" y="7" width="3" height="3"></rect>
                  <rect x="7" y="14" width="3" height="3"></rect>
                  <rect x="14" y="14" width="3" height="3"></rect>
                </svg>
                <span className="font-medium">Show QR Code</span>
              </span>
            </button>
          )}
        </div>
        
        {/* Code details */}
        <div className="space-y-2 md:space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <span>Status:</span>
            </span>
            <span className={`font-medium ${
              !accessCode.isActive ? 'text-gray-500 dark:text-gray-300' :
              isExpired ? 'text-warning-600' : 'text-success-600'
            }`}>
              {!accessCode.isActive ? 'Inactive' :
               isExpired ? 'Expired' : 'Active'}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>Created:</span>
            </span>
            <span className="font-medium">{new Date(accessCode.createdAt).toLocaleDateString()}</span>
          </div>
          
          {accessCode.expiresAt && (
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span>Expires:</span>
              </span>
              <span className="font-medium">{formatExpirationDate(accessCode.expiresAt)}</span>
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <span>Usage count:</span>
            </span>
            <span className="font-medium">{accessCode.usageCount || 0} times</span>
          </div>
        </div>
        
        {/* Actions */}
        {accessCode.isActive && !isExpired && (
          <div className="mt-4 md:mt-5">
            <button
              onClick={handleDeactivate}
              className="w-full py-2 md:py-2.5 text-sm text-danger hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-950/30 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2"
              disabled={isDeactivating}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="9" x2="15" y2="15"></line>
                <line x1="15" y1="9" x2="9" y2="15"></line>
              </svg>
              {isDeactivating ? 'Deactivating...' : 'Deactivate Code'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
