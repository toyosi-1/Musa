"use client";

import { useState, useEffect, useRef } from 'react';
import { User, Household } from '@/types/user';
import { verifyAccessCode } from '@/services/accessCodeService';
import { MapPinIcon, ClockIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { getGuardVerificationHistory, getGuardActivityStats, logVerificationAttempt, VerificationRecord } from '@/services/guardActivityService';
import { format, formatDistanceToNow } from 'date-fns';

interface GuardDashboardProps {
  user: User;
}

export default function GuardDashboard({ user }: GuardDashboardProps) {
  const [manualCode, setManualCode] = useState('');
  const [scanResult, setScanResult] = useState<{ 
    isValid: boolean; 
    message?: string;
    household?: Household;
    destinationAddress?: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [verificationHistory, setVerificationHistory] = useState<VerificationRecord[]>([]);
  const [activityStats, setActivityStats] = useState({
    totalVerifications: 0,
    validAccess: 0,
    deniedAccess: 0,
    todayVerifications: 0,
    successRate: 0,
    expiredCodes: 0,
    invalidCodes: 0,
    thisWeekVerifications: 0,
    thisMonthVerifications: 0,
    averagePerDay: 0
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
      console.log('Logging verification attempt:', {
        guardId: user.uid,
        code: manualCode,
        isValid: result.isValid,
        message: result.message,
        householdId: result.household?.id,
        destinationAddress: result.destinationAddress
      });
      
      try {
        await logVerificationAttempt(user.uid, {
          code: manualCode,
          isValid: result.isValid,
          message: result.message,
          householdId: result.household?.id,
          destinationAddress: result.destinationAddress,
          accessCodeId: result.accessCodeId
        });
        console.log('Verification attempt logged successfully');
      } catch (logError) {
        console.error('Failed to log verification attempt:', logError);
      }
      
      // Refresh statistics from database to ensure accuracy
      try {
        const updatedStats = await getGuardActivityStats(user.uid);
        console.log('Refreshed stats after verification:', updatedStats);
        setActivityStats(updatedStats);
      } catch (statsError) {
        console.error('Failed to refresh stats:', statsError);
        // Fallback to local update if database refresh fails
        setActivityStats(prev => ({
          ...prev,
          totalVerifications: prev.totalVerifications + 1,
          validAccess: prev.validAccess + (result.isValid ? 1 : 0),
          deniedAccess: prev.deniedAccess + (result.isValid ? 0 : 1),
          todayVerifications: prev.todayVerifications + 1
        }));
      }
      
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
        console.log('Loading guard data for user:', user.uid);
        
        // Fetch guard activity stats
        const stats = await getGuardActivityStats(user.uid);
        console.log('Loaded guard stats:', stats);
        setActivityStats(stats);
        
        // Try to fetch verification history
        try {
          const history = await getGuardVerificationHistory(user.uid, 10);
          console.log('Loaded verification history:', history.length, 'records');
          setVerificationHistory(history);
        } catch (historyError) {
          // Handle the missing index error with a manual fallback
          console.warn('Using fallback method for guard history due to:', historyError);
          
          try {
            const db = await import('@/lib/firebase').then(m => m.getFirebaseDatabase());
            const { ref, get } = await import('firebase/database');
            
            // Direct fetch without ordering (bypassing the need for an index)
            const verificationRef = ref(db, `guardActivity/${user.uid}/verifications`);
            const snapshot = await get(verificationRef);
            
            if (snapshot.exists()) {
              // Process and sort the data manually
              const records: VerificationRecord[] = Object.values(snapshot.val());
              const sortedRecords = records.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
              console.log('Fallback loaded verification history:', sortedRecords.length, 'records');
              setVerificationHistory(sortedRecords);
            } else {
              console.log('No verification history found with fallback method');
              setVerificationHistory([]);
            }
          } catch (fallbackError) {
            console.error('Fallback method also failed:', fallbackError);
            setVerificationHistory([]);
          }
        }
        
        // Log current statistics for debugging
        console.log('Current activity stats:', {
          total: stats.totalVerifications,
          valid: stats.validAccess,
          denied: stats.deniedAccess,
          today: stats.todayVerifications,
          successRate: stats.successRate
        });
      } catch (error) {
        console.error('Error loading guard data:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };
    
    loadGuardData();
  }, [user.uid]);

  return (
    <div className="w-full h-full flex flex-col">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800 dark:text-white">
        Guard Dashboard
      </h1>
      
      {/* Comprehensive Security Statistics */}
      <div className="mb-6 animate-fade-in">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" />
            <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
          </svg>
          Security Statistics
        </h2>
        
        {/* Primary Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-3 md:p-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                <ClockIcon className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-300">Today</p>
                <p className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">
                  {isLoadingStats ? '...' : activityStats.todayVerifications}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-3 md:p-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-info-100 dark:bg-info-900/30 rounded-lg flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5 text-info" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-300">Total</p>
                <p className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">
                  {isLoadingStats ? '...' : activityStats.totalVerifications}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-3 md:p-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-success-100 dark:bg-success-900/30 rounded-lg flex items-center justify-center">
                <CheckCircleIcon className="h-4 w-4 md:h-5 md:w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-300">Granted</p>
                <p className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">
                  {isLoadingStats ? '...' : activityStats.validAccess}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-3 md:p-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-danger-100 dark:bg-danger-900/30 rounded-lg flex items-center justify-center">
                <XCircleIcon className="h-4 w-4 md:h-5 md:w-5 text-danger" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-300">Denied</p>
                <p className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">
                  {isLoadingStats ? '...' : activityStats.deniedAccess}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Simplified Success Rate Card */}
        <div className="flex justify-center">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-700 p-4 w-48">
            <div className="text-center">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12l2 2 4-4" />
                  <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c2.12 0 4.07.74 5.61 1.97" />
                </svg>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Success Rate</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {isLoadingStats ? '...' : `${activityStats.successRate}%`}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid md:grid-cols-5 gap-6 flex-grow overflow-y-auto pb-4">
        {/* Left Column - Access Code Verification */}
        <div className="md:col-span-3 h-full flex flex-col">
          <div className="card animate-fade-in border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 hover:shadow-card-hover flex-grow flex flex-col">
        {/* Manual Code Entry Section */}
        <div className="p-6 md:p-8">
          <h2 className="text-xl font-semibold mb-6 text-center flex items-center justify-center gap-3 text-gray-800 dark:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            Access Code Verification
          </h2>
          <form onSubmit={handleVerifyCode} className="space-y-6 max-w-md mx-auto">
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
            </div>
            
            <button
              type="submit"
              className="btn-primary w-full py-4 text-lg font-medium rounded-xl flex items-center justify-center gap-2 transition-all duration-300"
              disabled={!manualCode || isProcessing}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              {isProcessing ? 'Verifying...' : 'Verify Code'}
            </button>
          </form>
        </div>
        
        {/* Verification Result */}
        {scanResult && (
          <div 
            className={`p-8 md:p-10 text-center animate-fade-in transition-all duration-300 ${
              scanResult.isValid 
                ? 'bg-success-50 dark:bg-success-900/20 border-t border-success-200 dark:border-success-700' 
                : 'bg-danger-50 dark:bg-danger-900/20 border-t border-danger-200 dark:border-danger-700'
            }`}
          >
            <div className={`w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center ${
              scanResult.isValid 
                ? 'bg-success text-white' 
                : 'bg-danger text-white'
            }`}>
              {scanResult.isValid ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
              )}
            </div>
            <h3 className={`text-2xl font-bold mb-2 ${
              scanResult.isValid 
                ? 'text-success-700 dark:text-success-400' 
                : 'text-danger-700 dark:text-danger-400'
            }`}>
              {scanResult.isValid ? 'Access Granted' : 'Access Denied'}
            </h3>
            {scanResult.message && (
              <p className={`mb-2 ${
                scanResult.isValid 
                  ? 'text-success-600 dark:text-success-300' 
                  : 'text-danger-600 dark:text-danger-300'
              }`}>
                {scanResult.message}
              </p>
            )}
            
            {/* Show destination address if available */}
            {scanResult.isValid && scanResult.destinationAddress && (
              <div className="mt-6 pt-5 border-t border-success-200 dark:border-success-700/50 text-left max-w-md mx-auto">
                <div className="flex items-start bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-success-100 dark:border-success-800/30">
                  <div className="w-10 h-10 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                    <MapPinIcon className="h-6 w-6 text-success-600 dark:text-success-400" />
                  </div>
                  <div>
                    <p className="font-medium mb-1 text-gray-800 dark:text-white">Going to:</p>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{scanResult.destinationAddress}</p>
                    {scanResult.household?.name && (
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-300 flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                          <circle cx="9" cy="7" r="4"></circle>
                          <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        Resident: {scanResult.household.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </div>

        {/* Right Column - Enhanced Verification History */}
        <div className="md:col-span-2 h-full flex flex-col">
          <div className="card animate-fade-in-delay border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 hover:shadow-card-hover flex-grow flex flex-col">
            <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg md:text-xl font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 3v18h18" />
                      <path d="M7 8h10" />
                      <path d="M7 12h10" />
                      <path d="M7 16h10" />
                    </svg>
                    Security Log
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-300">Recent access verifications</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-800 dark:text-white">
                    {verificationHistory.length} Records
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-300">
                    Last 10 entries
                  </p>
                </div>
              </div>
            </div>
            <div className="flex-grow overflow-y-auto">
              {verificationHistory.length > 0 ? (
                <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {verificationHistory.map((record: VerificationRecord, index) => (
                    <div key={record.id} className="p-3 md:p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200">
                      <div className="flex items-start gap-3 md:gap-4">
                        {/* Status Icon */}
                        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                          record.isValid 
                            ? 'bg-success-100 dark:bg-success-900/30' 
                            : record.message?.toLowerCase().includes('expired')
                              ? 'bg-orange-100 dark:bg-orange-900/30'
                              : 'bg-danger-100 dark:bg-danger-900/30'
                        }`}>
                          {record.isValid ? (
                            <CheckCircleIcon className="h-4 w-4 md:h-5 md:w-5 text-success" />
                          ) : record.message?.toLowerCase().includes('expired') ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5 text-orange-600 dark:text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12,6 12,12 16,14" />
                            </svg>
                          ) : (
                            <XCircleIcon className="h-4 w-4 md:h-5 md:w-5 text-danger" />
                          )}
                        </div>
                        
                        {/* Record Details */}
                        <div className="flex-grow min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-grow min-w-0">
                              {/* Code and Status */}
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-mono text-sm md:text-base font-semibold text-gray-800 dark:text-white truncate">
                                  {record.code.length > 8 ? `${record.code.substring(0, 8)}...` : record.code}
                                </p>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  record.isValid 
                                    ? 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-400'
                                    : record.message?.toLowerCase().includes('expired')
                                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                                      : 'bg-danger-100 text-danger-800 dark:bg-danger-900/30 dark:text-danger-400'
                                }`}>
                                  {record.isValid ? 'GRANTED' : record.message?.toLowerCase().includes('expired') ? 'EXPIRED' : 'DENIED'}
                                </span>
                              </div>
                              
                              {/* Message */}
                              {record.message && (
                                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
                                  {record.message}
                                </p>
                              )}
                              
                              {/* Destination Address */}
                              {record.destinationAddress && (
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 mb-2">
                                  <p className="text-xs text-gray-500 dark:text-gray-300 mb-1 flex items-center gap-1">
                                    <MapPinIcon className="h-3 w-3" />
                                    Destination:
                                  </p>
                                  <p className="text-xs md:text-sm text-gray-700 dark:text-gray-300 font-medium">
                                    {record.destinationAddress.split('\n')[0]}
                                    {record.destinationAddress.includes('\n') && (
                                      <span className="text-gray-500 dark:text-gray-300"> (+more)</span>
                                    )}
                                  </p>
                                </div>
                              )}
                              
                              {/* Timestamp */}
                              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-300">
                                <span className="flex items-center gap-1">
                                  <ClockIcon className="h-3 w-3" />
                                  {formatDistanceToNow(new Date(record.timestamp), { addSuffix: true })}
                                </span>
                                <span className="hidden sm:inline">
                                  {format(new Date(record.timestamp), 'MMM d, HH:mm')}
                                </span>
                              </div>
                            </div>
                            
                            {/* Entry Number */}
                            <div className="text-right flex-shrink-0">
                              <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300">
                                {index + 1}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 3v18h18" />
                      <path d="M7 8h10" />
                      <path d="M7 12h10" />
                      <path d="M7 16h10" />
                    </svg>
                  </div>
                  <p className="text-gray-500 dark:text-gray-300 mb-2">
                    {isLoadingStats ? 'Loading security log...' : 'No recent activity'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-300">
                    {isLoadingStats ? 'Please wait...' : 'Verification records will appear here'}
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
