"use client";

import { useState, useEffect, useRef } from 'react';
import { User, Household } from '@/types/user';
import { verifyAccessCode } from '@/services/accessCodeService';
import { MapPinIcon, ClockIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { getGuardVerificationHistory, getGuardActivityStats, logVerificationAttempt, VerificationRecord } from '@/services/guardActivityService';
import { format, formatDistanceToNow } from 'date-fns';

interface ScanResult {
  isValid: boolean;
  message?: string;
  household?: Household;
  destinationAddress?: string;
}

interface ActivityStats {
  totalVerifications: number;
  validAccess: number;
  deniedAccess: number;
  todayVerifications: number;
}

interface GuardDashboardProps {
  user: User;
}

export default function GuardDashboard({ user }: GuardDashboardProps) {
  const [manualCode, setManualCode] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [verificationHistory, setVerificationHistory] = useState<VerificationRecord[]>([]);
  const [activityStats, setActivityStats] = useState<ActivityStats>({
    totalVerifications: 0,
    validAccess: 0,
    deniedAccess: 0,
    todayVerifications: 0
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Function removed: QR code scanning has been moved to the dedicated Scan page

  // Handle manual code verification
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!manualCode.trim() || isProcessing) return;
    setIsProcessing(true);
    console.log('Verifying manual code:', manualCode);
    
    try {
      console.log('Calling verifyAccessCode...');
      const result = await verifyAccessCode(manualCode);
      console.log('Verification result:', result);
      setScanResult(result);
      
      // Log this verification attempt to the database
      await logVerificationAttempt(user.uid, {
        code: manualCode,
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
        code: manualCode,
        guardId: user.uid,
        isValid: result.isValid,
        message: result.message,
        householdId: result.household?.id,
        destinationAddress: result.destinationAddress
      };
      
      setVerificationHistory(prev => [newRecord, ...prev.slice(0, 9)]); // Keep only 10 items
      
      // Keep result visible longer if it's valid and has address info
      const displayTime = result.isValid && result.destinationAddress ? 10000 : 5000;
      
      // Reset after display time
      setTimeout(() => {
        setScanResult(null);
        setManualCode('');
      }, displayTime);
    } catch (err) {
      console.error('Error verifying manual code:', err);
      setScanResult({ 
        isValid: false, 
        message: 'Failed to verify code: ' + (err instanceof Error ? err.message : 'Unknown error')
      });
      
      // Reset after 5 seconds
      setTimeout(() => {
        setScanResult(null);
      }, 5000);
    } finally {
      setIsProcessing(false);
      inputRef.current?.focus();
    }
  };

  // Focus input on mount and load guard stats
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    // Load guard stats and verification history
    const loadGuardData = async () => {
      setIsLoadingStats(true);
      try {
        // Fetch guard activity stats
        const stats = await getGuardActivityStats(user.uid);
        setActivityStats(stats);
        
        // Fetch verification history
        const history = await getGuardVerificationHistory(user.uid, 10);
        setVerificationHistory(history);
      } catch (error) {
        console.error('Error loading guard data:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };
    
    loadGuardData();
  }, [user.uid]);

  // Helper function to render verification form
  const renderVerificationForm = () => (
    <div>
      <input
        ref={inputRef}
        type="text"
        value={manualCode}
        onChange={(e) => setManualCode(e.target.value.toUpperCase())}
        placeholder="Enter access code (e.g., MUSA1234)"
        aria-label="Access code input"
        className="input block w-full text-center text-xl font-medium font-mono tracking-wider py-5 text-gray-800 dark:text-white bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 focus:border-primary-500 dark:focus:border-primary-400 focus:ring-2 focus:ring-primary-300 dark:focus:ring-primary-800/30 rounded-xl shadow-sm transition-all duration-200"
        disabled={isProcessing}
        autoCapitalize="characters"
        autoComplete="off"
        maxLength={10}
      />
      
      <button
        type="submit"
        className="btn-primary w-full py-4 text-lg font-medium rounded-xl flex items-center justify-center gap-2 transition-all duration-300 mt-4"
        disabled={!manualCode || isProcessing}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        {isProcessing ? 'Verifying...' : 'Verify Code'}
      </button>
    </div>
  );

  // Helper function to render scan result
  const renderScanResult = () => {
    if (!scanResult) return null;
    
    return (
      <div 
        className={`p-6 mt-6 rounded-xl border ${
          scanResult.isValid 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}
      >
        <div className="flex items-start">
          <div className={`flex-shrink-0 mt-0.5 ${
            scanResult.isValid ? 'text-green-500' : 'text-red-500'
          }`}>
            {scanResult.isValid ? (
              <CheckCircleIcon className="h-6 w-6" />
            ) : (
              <XCircleIcon className="h-6 w-6" />
            )}
          </div>
          <div className="ml-3">
            <h3 className={`text-lg font-medium ${
              scanResult.isValid 
                ? 'text-green-800 dark:text-green-200' 
                : 'text-red-800 dark:text-red-200'
            }`}>
              {scanResult.isValid ? 'Access Granted' : 'Access Denied'}
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {scanResult.message}
            </p>
            {scanResult.household && (
              <div className="mt-2 flex items-center text-sm text-gray-600 dark:text-gray-300">
                <MapPinIcon className="h-4 w-4 mr-1.5 flex-shrink-0" />
                <span>{scanResult.household.address}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Helper function to render verification history
  const renderVerificationHistory = () => {
    if (verificationHistory.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No verification history yet</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {verificationHistory.slice(0, 5).map((record: VerificationRecord) => (
          <div key={record.id} className="flex items-start">
            <div className={`flex-shrink-0 mt-0.5 ${
              record.isValid ? 'text-green-500' : 'text-red-500'
            }`}>
              {record.isValid ? (
                <CheckCircleIcon className="h-5 w-5" />
              ) : (
                <XCircleIcon className="h-5 w-5" />
              )}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {record.isValid ? 'Access granted' : 'Access denied'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {format(new Date(record.timestamp), 'MMM d, yyyy h:mm a')}
              </p>
              <p className="mt-1 text-xs font-mono bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                {record.code}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full h-full flex flex-col space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Guard Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
            Welcome back, {user.displayName?.split(' ')[0] || 'Guard'}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 w-full sm:w-auto">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <ClockIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Today</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {isLoadingStats ? '...' : activityStats.todayVerifications}
              </p>
            </div>
          </div>
          
          <div className="h-8 w-px bg-gray-200 dark:bg-gray-700"></div>
          
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg">
              <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Approved</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {isLoadingStats ? '...' : activityStats.validAccess}
              </p>
            </div>
          </div>
          
          <div className="h-8 w-px bg-gray-200 dark:bg-gray-700"></div>
          
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-red-50 dark:bg-red-900/30 rounded-lg">
              <XCircleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Denied</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {isLoadingStats ? '...' : activityStats.deniedAccess}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
        {/* Left Column - Access Code Verification */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 hover:shadow-md">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-6 text-center flex items-center justify-center gap-3 text-gray-800 dark:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-musa-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                Access Code Verification
              </h2>
              <form onSubmit={handleVerifyCode} className="space-y-6 max-w-md mx-auto">
                {renderVerificationForm()}
              </form>
              {scanResult && renderScanResult()}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <a
                  href="/guard/scan"
                  className="flex items-center justify-center p-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors duration-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  <span className="font-medium text-gray-700 dark:text-gray-200">Scan QR Code</span>
                </a>
                <button
                  onClick={() => {
                    setManualCode('');
                    inputRef.current?.focus();
                  }}
                  className="flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600 dark:text-gray-300 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span className="font-medium text-gray-700 dark:text-gray-200">Clear Form</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Column - Visit History */}
        <div className="lg:col-span-1 h-full">
          <div className="h-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
                Recent Verification History
              </h2>
              
              {isLoadingStats ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-pulse text-primary">Loading history...</div>
                </div>
              ) : verificationHistory.length > 0 ? (
                <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-400px)] pr-2 -mr-2">
                  {verificationHistory.map((record) => (
                    <div 
                      key={record.id} 
                      className={`p-3 rounded-lg border ${
                        record.isValid 
                          ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10' 
                          : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="font-medium">
                          <span className={`${
                            record.isValid 
                              ? 'text-green-700 dark:text-green-400' 
                              : 'text-red-700 dark:text-red-400'
                          }`}>
                            {record.isValid ? 'Granted' : 'Denied'}
                          </span>
                          <span className="mx-2 text-gray-400">•</span>
                          <span className="font-mono text-sm text-gray-600 dark:text-gray-300">
                            {record.code}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDistanceToNow(record.timestamp, { addSuffix: true })}
                        </div>
                      </div>
                      {record.message && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          {record.message}
                        </p>
                      )}
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(record.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-700 rounded-lg p-6 text-center">
                  <p className="text-gray-500 dark:text-gray-400">No verification history yet.</p>
                  <p className="text-sm mt-2 text-gray-400 dark:text-gray-500">
                    Your recent access code verifications will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
