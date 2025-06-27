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

  return (
    <div className="max-w-4xl mx-auto px-4 w-full h-full flex flex-col">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800 dark:text-white">
        Guard Dashboard
      </h1>
      
      {/* Status Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 animate-fade-in">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 md:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
              <ClockIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Today</p>
              <p className="text-xl font-bold text-gray-800 dark:text-white">
                {isLoadingStats ? '...' : activityStats.todayVerifications}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 md:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-info-100 dark:bg-info-900/30 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-info" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
              <p className="text-xl font-bold text-gray-800 dark:text-white">
                {isLoadingStats ? '...' : activityStats.totalVerifications}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 md:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-success-100 dark:bg-success-900/30 rounded-lg flex items-center justify-center">
              <CheckCircleIcon className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Granted</p>
              <p className="text-xl font-bold text-gray-800 dark:text-white">
                {isLoadingStats ? '...' : activityStats.validAccess}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 md:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-danger-100 dark:bg-danger-900/30 rounded-lg flex items-center justify-center">
              <XCircleIcon className="h-6 w-6 text-danger" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Denied</p>
              <p className="text-xl font-bold text-gray-800 dark:text-white">
                {isLoadingStats ? '...' : activityStats.deniedAccess}
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
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                          <polyline points="9 22 9 12 15 12 15 22"></polyline>
                        </svg>
                        <span>{scanResult.household.name}</span>
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
        
        {/* Right Column - Visit History */}
        <div className="md:col-span-2 h-full flex flex-col">
          <div className="card animate-fade-in border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 hover:shadow-card-hover flex-grow flex flex-col">
            <div className="p-6 md:p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
                Recent Verification History
              </h2>
              
              {isLoadingStats ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-pulse-slow text-primary">Loading history...</div>
                </div>
              ) : verificationHistory.length > 0 ? (
                <div className="space-y-3">
                  {verificationHistory.map((record) => (
                    <div 
                      key={record.id} 
                      className={`p-3 rounded-lg border ${record.isValid 
                        ? 'border-success-200 dark:border-success-800 bg-success-50 dark:bg-success-900/10' 
                        : 'border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-900/10'
                      } text-sm`}
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <div className="font-medium">
                          <span className={`${record.isValid 
                            ? 'text-success-700 dark:text-success-500' 
                            : 'text-danger-700 dark:text-danger-500'
                          }`}>
                            {record.isValid ? 'Granted' : 'Denied'}
                          </span>
                          <span className="mx-1.5 text-gray-400">•</span>
                          <span className="font-mono text-gray-600 dark:text-gray-400">
                            {record.code}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {formatDistanceToNow(record.timestamp, { addSuffix: true })}
                        </div>
                      </div>
                      {record.message && (
                        <p className="text-gray-600 dark:text-gray-300 text-xs mt-1">{record.message}</p>
                      )}
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
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
