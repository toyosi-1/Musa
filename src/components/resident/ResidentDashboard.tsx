"use client";

import { useState, useEffect } from 'react';
import { User, AccessCode, Household } from '@/types/user';
import { getResidentAccessCodes, createAccessCode, deactivateAccessCode } from '@/services/accessCodeService';
import { getHousehold, createHousehold } from '@/services/householdService';
import AccessCodeCard from '@/components/resident/AccessCodeCard';
import HouseholdManager from '@/components/resident/HouseholdManager';
import CreateAccessCodeForm from '@/components/resident/CreateAccessCodeForm';

interface ResidentDashboardProps {
  user: User;
}

export default function ResidentDashboard({ user }: ResidentDashboardProps) {
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'codes' | 'household'>('codes');

  // Load resident data
  useEffect(() => {
    const loadData = async () => {
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
    };
    
    loadData();
  }, [user.uid, user.householdId]);

  // Create a new access code
  const handleCreateAccessCode = async (description: string, expiresAt?: number) => {
    if (!user.householdId) {
      console.error('No household ID found for user:', user.uid);
      setError('You need to create or join a household first');
      return null;
    }
    
    try {
      setLoading(true);
      console.log('Creating access code with description:', description);
      console.log('User ID:', user.uid, 'Household ID:', user.householdId);
      
      const result = await createAccessCode(user.uid, user.householdId, description, expiresAt);
      console.log('Access code created successfully:', result);
      
      // Refresh access codes
      const updatedCodes = await getResidentAccessCodes(user.uid);
      setAccessCodes(updatedCodes);
      
      // Make sure we return a properly structured result
      if (result && result.code && result.qrCode) {
        return { code: result.code, qrCode: result.qrCode };
      } else {
        console.error('Invalid result from createAccessCode:', result);
        throw new Error('Invalid access code result structure');
      }
    } catch (err) {
      console.error('Error creating access code:', err);
      setError('Failed to create access code: ' + (err instanceof Error ? err.message : 'Unknown error'));
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Deactivate an access code
  const handleDeactivateCode = async (codeId: string) => {
    try {
      setLoading(true);
      await deactivateAccessCode(codeId, user.uid);
      
      // Update the local state
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

  // Create a new household (for users without a household)
  const handleCreateHousehold = async (name: string) => {
    try {
      setLoading(true);
      const newHousehold = await createHousehold(user.uid, name);
      setHousehold(newHousehold);
      return newHousehold;
    } catch (err) {
      console.error('Error creating household:', err);
      setError('Failed to create household');
      return null;
    } finally {
      setLoading(false);
    }
  };

  if (loading && !accessCodes.length && !household) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Resident Dashboard</h1>
        <div className="animate-pulse space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Resident Dashboard</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      
      {!user.householdId && !household && (
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 px-4 py-3 rounded mb-6">
          <h3 className="font-semibold">Welcome to Musa!</h3>
          <p className="mt-1">You need to create or join a household before generating access codes.</p>
        </div>
      )}
      
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('codes')}
            className={`py-4 px-1 font-medium text-sm border-b-2 ${
              activeTab === 'codes'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Access Codes
          </button>
          <button
            onClick={() => setActiveTab('household')}
            className={`py-4 px-1 font-medium text-sm border-b-2 ${
              activeTab === 'household'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Household Management
          </button>
        </nav>
      </div>
      
      {/* Tab Content */}
      {activeTab === 'codes' && (
        <div>
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Generate New Access Code</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <CreateAccessCodeForm 
                onCreateCode={handleCreateAccessCode} 
                disabled={!user.householdId && !household}
              />
            </div>
          </div>
          
          <div>
            <h2 className="text-lg font-semibold mb-4">Your Access Codes</h2>
            {accessCodes.length === 0 ? (
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
      )}
      
      {activeTab === 'household' && (
        <HouseholdManager 
          user={user}
          household={household}
          onCreateHousehold={handleCreateHousehold}
        />
      )}
    </div>
  );
}
