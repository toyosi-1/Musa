"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { User, AccessCode, Household } from '@/types/user';
import { getResidentAccessCodes, createAccessCode, deactivateAccessCode } from '@/services/accessCodeService';
import { getHousehold, createHousehold } from '@/services/householdService';
import AccessCodeCard from '@/components/resident/AccessCodeCard';
import HouseholdManager from '@/components/resident/HouseholdManager';
import CreateAccessCodeForm from '@/components/resident/CreateAccessCodeForm';
import CreateHouseholdForm from '@/components/resident/CreateHouseholdForm';

interface ResidentDashboardProps {
  user: User;
}

export default function ResidentDashboard({ user }: ResidentDashboardProps) {
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load resident data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load access codes
      const codes = await getResidentAccessCodes(user.uid);
      setAccessCodes(codes);
      
      // Load household data if the user has a household
      if (user.householdId) {
        const householdData = await getHousehold(user.householdId);
        setHousehold(householdData);
      }
    } catch (err) {
      console.error('Error loading resident data:', err);
      setError('Failed to load your data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, [user.uid, user.householdId]);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Create a new access code
  const handleCreateAccessCode = useCallback(async (description: string, expiresAt?: number) => {
    if (!user.householdId) {
      setError('You need to create or join a household first');
      return null;
    }
    
    try {
      setLoading(true);
      const newCode = await createAccessCode(user.uid, user.householdId, description, expiresAt);
      setAccessCodes(prev => [...prev, newCode]);
      return newCode;
    } catch (err) {
      console.error('Error creating access code:', err);
      setError('Failed to create access code. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user.uid, user.householdId]);

  // Deactivate an access code
  const handleDeactivateCode = useCallback(async (codeId: string) => {
    try {
      setLoading(true);
      await deactivateAccessCode(codeId);
      setAccessCodes(prev => 
        prev.map(code => 
          code.id === codeId ? { ...code, isActive: false } : code
        )
      );
    } catch (err) {
      console.error('Error deactivating code:', err);
      setError('Failed to deactivate access code. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new household
  const handleCreateHousehold = useCallback(async (householdData: any) => {
    try {
      setLoading(true);
      const newHousehold = await createHousehold(householdData);
      setHousehold(newHousehold);
      return newHousehold;
    } catch (err) {
      console.error('Error creating household:', err);
      setError('Failed to create household. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-8">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-300 px-6 py-4 rounded-xl shadow-card">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Resident Dashboard</h1>
        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
          Welcome back, {user.displayName?.split(' ')[0] || 'Resident'}
        </p>
      </div>

      {/* No Household Message */}
      {!user.householdId && !household && (
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 text-yellow-800 dark:text-yellow-200 px-6 py-4 rounded-xl shadow-card">
          <div className="flex">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-yellow-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-semibold text-lg">Welcome to Musa!</h3>
              <p className="mt-1">You need to create or join a household before generating access codes.</p>
            </div>
          </div>
        </div>
      )}

      {/* Access Codes Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Access Codes</h2>
        </div>
        
        {user.householdId && household && !household.address && (
          <div className="bg-orange-50 dark:bg-orange-900/30 border-l-4 border-orange-400 text-orange-700 dark:text-orange-200 px-6 py-4 rounded-xl shadow-card">
            <div className="flex">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-orange-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="font-semibold">Address Required</h3>
                <p>Please add your household address to generate access codes.</p>
              </div>
            </div>
          </div>
        )}

        {user.householdId && household?.address && (
          <CreateAccessCodeForm 
            onCreateCode={handleCreateAccessCode} 
            disabled={loading} 
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accessCodes.map(code => (
            <AccessCodeCard 
              key={code.id} 
              code={code} 
              onDeactivate={() => handleDeactivateCode(code.id)}
            />
          ))}
          
          {accessCodes.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400 col-span-full text-center py-8">
              No access codes found. {user.householdId ? 'Create your first access code above.' : ''}
            </p>
          )}
        </div>
      </div>

      {/* My Household Section */}
      <div className="space-y-6">
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">My Household</h2>
        </div>
        
        <div className="bg-musa-bg dark:bg-gray-900/50 rounded-xl p-6">
          {household ? (
            <HouseholdManager 
              user={user}
              household={household}
              onCreateHousehold={handleCreateHousehold}
              refreshHousehold={loadData}
            />
          ) : (
            <CreateHouseholdForm
              onCreateHousehold={handleCreateHousehold}
              disabled={loading}
            />
          )}
        </div>
      </div>
    </div>
  );
}
