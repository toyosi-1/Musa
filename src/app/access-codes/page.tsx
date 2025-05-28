"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import RouteGuard from '@/utils/RouteGuard';
import { getResidentAccessCodes, createAccessCode, deactivateAccessCode } from '@/services/accessCodeService';
import { AccessCode } from '@/types/user';
import AccessCodeCard from '@/components/resident/AccessCodeCard';
import CreateAccessCodeForm from '@/components/resident/CreateAccessCodeForm';
import Link from 'next/link';

export default function AccessCodesPage() {
  const { currentUser } = useAuth();
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load resident's access codes
  useEffect(() => {
    const loadAccessCodes = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        const codes = await getResidentAccessCodes(currentUser.uid);
        setAccessCodes(codes);
      } catch (err) {
        console.error('Error loading access codes:', err);
        setError('Failed to load your access codes');
      } finally {
        setLoading(false);
      }
    };
    
    loadAccessCodes();
  }, [currentUser]);

  // Create a new access code
  const handleCreateAccessCode = async (description: string, expiresAt?: number) => {
    if (!currentUser || !currentUser.householdId) {
      setError('You need to create or join a household first');
      return null;
    }
    
    try {
      setLoading(true);
      const { code, qrCode } = await createAccessCode(
        currentUser.uid, 
        currentUser.householdId, 
        description, 
        expiresAt
      );
      
      // Refresh the list of codes
      const updatedCodes = await getResidentAccessCodes(currentUser.uid);
      setAccessCodes(updatedCodes);
      
      return { code, qrCode };
    } catch (err) {
      console.error('Error creating access code:', err);
      setError('Failed to create access code');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Deactivate an access code
  const handleDeactivateCode = async (codeId: string) => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      await deactivateAccessCode(codeId, currentUser.uid);
      
      // Update the code in the local state
      setAccessCodes(prevCodes => 
        prevCodes.map(code => 
          code.id === codeId 
            ? { ...code, isActive: false } 
            : code
        )
      );
    } catch (err) {
      console.error('Error deactivating code:', err);
      setError('Failed to deactivate code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <RouteGuard allowedRoles={['resident']}>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link href="/dashboard" className="inline-flex items-center text-primary hover:text-primary-dark transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold">Access Codes</h1>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Generate New Access Code</h2>
            <CreateAccessCodeForm 
              onCreateCode={handleCreateAccessCode} 
              disabled={!currentUser?.householdId}
            />
          </div>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-4">Your Access Codes</h2>
          
          {loading && !accessCodes.length ? (
            <div className="animate-pulse space-y-4">
              <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ) : accessCodes.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                You haven't created any access codes yet.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {accessCodes.map(code => (
                <AccessCodeCard 
                  key={code.id} 
                  accessCode={code} 
                  onDeactivate={() => handleDeactivateCode(code.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </RouteGuard>
  );
}
