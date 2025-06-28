"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { User } from 'firebase/auth';

// Components
import { VerificationForm } from './components/VerificationForm';
import { ScanResultDisplay } from './components/ScanResultDisplay';
import { VerificationHistoryList } from './components/VerificationHistoryList';
import { VerificationHistoryErrorBoundary } from './components/VerificationHistoryErrorBoundary';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Types and exports
export type { 
  Household, 
  VerificationRecord, 
  VerificationResult, 
  ActivityStats 
} from './types';

import type { 
  Household, 
  VerificationRecord, 
  VerificationResult, 
  ActivityStats 
} from './types';

// Mock API functions
const verifyAccessCode = async (code: string): Promise<VerificationResult> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const isValid = code.startsWith('MUSA');
      resolve({
        isValid,
        message: isValid ? 'Valid access code' : 'Invalid access code',
        household: isValid ? { id: '1', address: '123 Main St' } : undefined
      });
    }, 500);
  });
};

const logVerificationAttempt = async (
  guardId: string,
  data: { code: string; isValid: boolean; message: string; householdId?: string; destinationAddress?: string }
): Promise<void> => {
  console.log('Logging verification attempt:', { guardId, ...data });
};

const getGuardVerificationHistory = async (guardId: string): Promise<VerificationRecord[]> => {
  return [
    {
      id: '1',
      timestamp: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
      code: 'MUSA1234',
      guardId,
      isValid: true,
      message: 'Access granted',
      householdId: '1',
      destinationAddress: '123 Main St'
    },
    {
      id: '2',
      timestamp: Date.now() - 1000 * 60 * 30, // 30 minutes ago
      code: 'INVALID123',
      guardId,
      isValid: false,
      message: 'Invalid code',
    }
  ];
};

const getGuardActivityStats = async (guardId: string): Promise<ActivityStats> => {
  return {
    totalVerifications: 42,
    validAccess: 35,
    deniedAccess: 7,
    todayVerifications: 5
  };
};

// Stats card component
const StatsCard = ({ 
  title, 
  value, 
  icon: Icon, 
  isLoading 
}: { 
  title: string; 
  value: number; 
  icon: React.ElementType;
  isLoading: boolean;
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex items-center">
    <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
      <Icon className="h-6 w-6" />
    </div>
    <div className="ml-4">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
      {isLoading ? (
        <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1"></div>
      ) : (
        <p className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
      )}
    </div>
  </div>
);


export default function GuardDashboard({ user }: { user: User }) {
  const router = useRouter();
  const [manualCode, setManualCode] = useState('');
  const [scanResult, setScanResult] = useState<VerificationResult | null>(null);
  const [verificationHistory, setVerificationHistory] = useState<VerificationRecord[]>([]);
  const [activityStats, setActivityStats] = useState<ActivityStats>({
    totalVerifications: 0,
    validAccess: 0,
    deniedAccess: 0,
    todayVerifications: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load verification history and stats on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Load verification history
        const history = await getGuardVerificationHistory(user.uid);
        setVerificationHistory(history);
        
        // Load activity stats
        const stats = await getGuardActivityStats(user.uid);
        setActivityStats(stats);
      } catch (err) {
        console.error('Error loading guard dashboard data:', err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user.uid]);

  // Clear scan result after 5 seconds
  useEffect(() => {
    if (!scanResult) return;
    
    const timer = setTimeout(() => {
      setScanResult(null);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [scanResult]);

  // Handle manual code verification
  const handleVerifyCode = async (code: string) => {
    if (!code.trim() || isProcessing) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await verifyAccessCode(code);
      setScanResult(result);
      
      // Log this verification attempt
      await logVerificationAttempt(user.uid, {
        code,
        isValid: result.isValid,
        message: result.message,
        householdId: result.household?.id,
        destinationAddress: result.destinationAddress
      });
      
      // Update local stats and history without reloading everything
      setActivityStats(prev => ({
        ...prev,
        totalVerifications: prev.totalVerifications + 1,
        validAccess: prev.validAccess + (result.isValid ? 1 : 0),
        deniedAccess: prev.deniedAccess + (result.isValid ? 0 : 1),
        todayVerifications: prev.todayVerifications + 1
      }));
      
          // Add to verification history
      const newRecord: VerificationRecord = {
        id: `local-${Date.now()}`,
        timestamp: Date.now(),
        code,
        guardId: user.uid,
        isValid: result.isValid,
        message: result.message,
        householdId: result.household?.id,
        destinationAddress: result.destinationAddress
      };
      
      setVerificationHistory(prev => [newRecord, ...prev].slice(0, 50)); // Keep only the 50 most recent records
      
    } catch (err) {
      console.error('Error verifying code:', err);
      setError('Failed to verify code. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle QR code scanning - now directly using router.push in the UI

  // Icons for stats cards
  const StatsIcon = ({ icon: Icon, className = '' }: { icon: React.ElementType; className?: string }) => (
    <div className={`p-2 rounded-full ${className}`}>
      <Icon className="h-5 w-5 text-white" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center mb-8">
          <button
            onClick={() => router.back()}
            className="mr-4 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Go back"
          >
            <svg className="h-5 w-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Guard Dashboard</h1>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard 
            title="Total Verifications" 
            value={activityStats.totalVerifications} 
            icon={() => (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            )}
            isLoading={isLoading}
          />
          <StatsCard 
            title="Valid Access" 
            value={activityStats.validAccess} 
            icon={() => (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            isLoading={isLoading}
          />
          <StatsCard 
            title="Denied Access" 
            value={activityStats.deniedAccess} 
            icon={() => (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            isLoading={isLoading}
          />
          <StatsCard 
            title="Today" 
            value={activityStats.todayVerifications} 
            icon={() => (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
            isLoading={isLoading}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Verify Access Code</h2>
              
              <VerificationForm 
                onSubmit={handleVerifyCode} 
                isProcessing={isProcessing}
              />
              
              {scanResult && (
                <div className="mt-6">
                  <ScanResultDisplay 
                    result={scanResult}
                    onClose={() => setScanResult(null)}
                  />
                </div>
              )}
              
              {verificationHistory.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No verification history</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Scan or enter an access code to get started.</p>
                </div>
              ) : (
                <VerificationHistoryList 
                  history={verificationHistory} 
                  isLoading={isLoading}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
