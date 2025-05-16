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
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden ${
      !accessCode.isActive || isExpired ? 'opacity-70' : ''
    }`}>
      {/* Status indicator */}
      <div className={`w-full h-2 ${
        !accessCode.isActive ? 'bg-gray-300 dark:bg-gray-600' :
        isExpired ? 'bg-yellow-500' : 'bg-green-500'
      }`}></div>
      
      <div className="p-5">
        {/* Code header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold font-mono tracking-wide">
              {accessCode.code}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {accessCode.description || 'No description'}
            </p>
          </div>
          
          <div className="flex space-x-2">
            <button 
              onClick={copyToClipboard}
              className="p-2 text-gray-500 hover:text-primary transition-colors"
              title="Copy to clipboard"
            >
              {isCopied ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
                  <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2a1 1 0 110 2h-2v-2z" />
                </svg>
              )}
            </button>
            
            {navigator.share && (
              <button 
                onClick={shareCode}
                className="p-2 text-gray-500 hover:text-primary transition-colors"
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
            <div className="relative w-full max-w-sm mx-auto bg-white p-2 rounded-lg">
              <Image 
                src={accessCode.qrCode} 
                alt="QR Code" 
                width={200} 
                height={200}
                className="mx-auto"
              />
            </div>
          ) : (
            <button
              onClick={() => setShowQR(true)}
              className="w-full py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-md text-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Show QR Code
            </button>
          )}
        </div>
        
        {/* Code info */}
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex justify-between">
            <span>Status:</span>
            <span className={`font-medium ${
              !accessCode.isActive ? 'text-gray-500 dark:text-gray-400' :
              isExpired ? 'text-yellow-500' : 'text-green-500'
            }`}>
              {!accessCode.isActive ? 'Inactive' :
               isExpired ? 'Expired' : 'Active'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span>Created:</span>
            <span>{new Date(accessCode.createdAt).toLocaleDateString()}</span>
          </div>
          
          {accessCode.expiresAt && (
            <div className="flex justify-between">
              <span>Expires:</span>
              <span>{formatExpirationDate(accessCode.expiresAt)}</span>
            </div>
          )}
          
          <div className="flex justify-between">
            <span>Usage count:</span>
            <span>{accessCode.usageCount || 0} times</span>
          </div>
        </div>
        
        {/* Actions */}
        {accessCode.isActive && !isExpired && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleDeactivate}
              className="w-full py-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
              disabled={isDeactivating}
            >
              {isDeactivating ? 'Deactivating...' : 'Deactivate Code'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
