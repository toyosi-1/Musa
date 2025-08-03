"use client";

import { useState } from 'react';
import Image from 'next/image';

interface CreateAccessCodeFormProps {
  onCreateCode: (description: string, expiresAt?: number) => Promise<{ code: string; qrCode: string } | null>;
  disabled?: boolean;
  noHouseholdMessage?: string;
}

export default function CreateAccessCodeForm({ onCreateCode, disabled, noHouseholdMessage }: CreateAccessCodeFormProps) {
  const [description, setDescription] = useState('');
  const [expiration, setExpiration] = useState<string>('24h');
  const [isLoading, setIsLoading] = useState(false);
  const [newCode, setNewCode] = useState<{ code: string; qrCode: string } | null>(null);
  const [error, setError] = useState('');
  
  // Calculate expiration timestamp based on selected option
  const calculateExpirationTimestamp = (): number | undefined => {
    if (expiration === 'never') return undefined;
    
    const now = Date.now();
    switch (expiration) {
      case '1h':
        return now + (1 * 60 * 60 * 1000); // 1 hour
      case '6h':
        return now + (6 * 60 * 60 * 1000); // 6 hours
      case '24h':
        return now + (24 * 60 * 60 * 1000); // 24 hours
      case '48h':
        return now + (48 * 60 * 60 * 1000); // 48 hours
      case '7d':
        return now + (7 * 24 * 60 * 60 * 1000); // 7 days
      default:
        return now + (24 * 60 * 60 * 1000); // Default: 24 hours
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (disabled) {
      console.log('Form is disabled, household is required');
      setError(noHouseholdMessage || 'You need to create or join a household first');
      return;
    }
    
    if (!description.trim()) {
      setError('Please provide a description for this code');
      return;
    }
    
    setIsLoading(true);
    setError('');
    console.log('Creating access code with description:', description);
    
    try {
      const expiresAt = calculateExpirationTimestamp();
      console.log('Calculated expiration timestamp:', expiresAt);
      console.log('Calling onCreateCode...');
      const result = await onCreateCode(description, expiresAt);
      console.log('Access code creation result:', result);
      
      if (result) {
        setNewCode(result);
        setDescription('');
        console.log('Access code created successfully with QR code');
      } else {
        console.error('No result returned from onCreateCode');
        setError('Could not create access code. Please try again.');
      }
    } catch (err) {
      console.error('Error creating code:', err);
      
      // Convert technical error messages to user-friendly ones
      let userFriendlyMessage = 'Could not create access code. Please try again.';
      
      if (err instanceof Error) {
        const errorMessage = err.message;
        
        if (errorMessage.includes('permission-denied') || errorMessage.includes('permission denied')) {
          userFriendlyMessage = 'You do not have permission to create access codes.';
        } else if (errorMessage.includes('quota-exceeded') || errorMessage.includes('quota exceeded')) {
          userFriendlyMessage = 'You have reached the maximum number of access codes allowed.';
        } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
          userFriendlyMessage = 'Network error. Please check your internet connection and try again.';
        }
      }
      
      setError(userFriendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Reset form to create another code
  const handleCreateAnother = () => {
    setNewCode(null);
  };
  
  // If a new code was just created, show it
  if (newCode) {
    return (
      <div className="text-center">
        <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-6 mb-6">
          <div className="flex justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-2">
            Access Code Created Successfully!
          </h3>
          <p className="text-green-700 dark:text-green-400">
            You can share this code with visitors or family members.
          </p>
        </div>
        
        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg mb-6">
          <h4 className="text-lg font-bold font-mono mb-2">{newCode.code}</h4>
          <div className="mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Copy this code or share the QR code below
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg max-w-xs mx-auto mb-4">
            <Image 
              src={newCode.qrCode} 
              alt="QR Code" 
              width={200}
              height={200}
              className="mx-auto"
            />
          </div>
          
          <div className="flex space-x-4 justify-center">
            <button
              onClick={() => navigator.clipboard.writeText(newCode.code)}
              className="text-primary hover:text-primary-dark flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
                <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2a1 1 0 110 2h-2v-2z" />
              </svg>
              Copy Code
            </button>
            
            {navigator.share && (
              <button
                onClick={() => {
                  const expiry = expiration === 'never' ? 'never expires' : 
                    new Date(calculateExpirationTimestamp() || 0).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    });
                  
                  // Format message with the user's household details
                  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
                  const household = JSON.parse(localStorage.getItem('household') || '{}');
                  const userName = currentUser?.displayName || 'Resident';
                  const address = household?.address || '';
                  const addressLine2 = household?.addressLine2 || '';
                  const fullAddress = [address, addressLine2].filter(Boolean).join(', ');
                  
                  const messageText = `Good day,

You have been invited to ${fullAddress}.

Your access code: ${newCode.code}

When you arrive at the Estate gate, please give the above code to the Security team. Your code ${expiration === 'never' ? 'never expires' : `expires on ${expiry}`}

Powered By Musa Security`;
                  
                  navigator.share({
                    title: 'Musa Access Code',
                    text: messageText,
                  });
                }}
                className="text-primary hover:text-primary-dark flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                </svg>
                Share
              </button>
            )}
          </div>
        </div>
        
        <button 
          onClick={handleCreateAnother}
          className="btn-primary"
        >
          Create Another Code
        </button>
      </div>
    );
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Purpose / Description
        </label>
        <input
          id="description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., Cleaner, Family Visit, Party Guest"
          className="input w-full"
          disabled={isLoading || disabled}
          maxLength={50}
        />
        <p className="text-xs text-gray-500 mt-1">This helps you remember who this code is for</p>
      </div>
      
      <div>
        <label htmlFor="expiration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Expiration
        </label>
        <select
          id="expiration"
          value={expiration}
          onChange={(e) => setExpiration(e.target.value)}
          className="input w-full"
          disabled={isLoading || disabled}
        >
          <option value="1h">1 hour</option>
          <option value="6h">6 hours</option>
          <option value="24h">24 hours</option>
          <option value="48h">2 days</option>
          <option value="7d">7 days</option>
          <option value="never">Never expires</option>
        </select>
      </div>
      
      <div className="pt-2">
        <button
          type="submit"
          className="btn-primary w-full"
          disabled={isLoading || disabled}
        >
          {isLoading ? 'Creating...' : 'Generate Access Code'}
        </button>
      </div>
    </form>
  );
}
