"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, MapPinIcon } from '@heroicons/react/24/solid';
import dynamic from 'next/dynamic';
import { Household } from '@/types/user';
import { logVerificationAttempt } from '@/services/guardActivityService';

// Import the QrScanner component with dynamic loading to avoid SSR issues
const QrScanner = dynamic(() => import('@/components/qr/QrScanner'), { 
  ssr: false, // Disable server-side rendering
  loading: () => <div className="h-full w-full flex items-center justify-center">Loading scanner...</div>
});

export default function ScanPage() {
  const { currentUser } = useAuth();
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scanResult, setScanResult] = useState<{ 
    isValid: boolean; 
    message?: string; 
    household?: Household;
    destinationAddress?: string;
    accessCodeId?: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();
  
  const handleScanResult = async (result: { 
    isValid: boolean; 
    message?: string; 
    household?: Household;
    destinationAddress?: string;
    accessCodeId?: string;
  }) => {
    setScanResult(result);
    
    // Log the verification attempt and send notification to resident
    if (currentUser?.role === 'guard') {
      try {
        await logVerificationAttempt(currentUser.uid, {
          code: 'QR_SCAN', // We don't have the actual code text from QR scan
          isValid: result.isValid,
          message: result.message,
          householdId: result.household?.id,
          destinationAddress: result.destinationAddress,
          accessCodeId: result.accessCodeId
        });
        console.log('✅ QR scan verification logged and notification sent');
      } catch (error) {
        console.error('❌ Error logging QR scan verification:', error);
      }
    }
    
    // Keep the result visible for longer if it's valid and has address info
    const displayTime = result.isValid && result.destinationAddress ? 10000 : 5000;
    
    // Reset the scan result after display time
    setTimeout(() => {
      setScanResult(null);
      setIsProcessing(false);
    }, displayTime);
  };
  
  const handleStartScan = () => {
    if (isCameraActive) {
      setIsCameraActive(false);
    } else {
      setIsCameraActive(true);
    }
  };
  
  const handleScanningStateChange = (isScanning: boolean) => {
    setIsCameraActive(isScanning);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-md relative">
      <button 
        onClick={() => router.back()} 
        className="absolute top-0 left-0 flex items-center text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-all duration-200 rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <ArrowLeftIcon className="h-5 w-5 mr-1" />
        <span className="font-medium">Back</span>
      </button>
      
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-center text-gray-800 dark:text-white mt-4">
        Scan QR Code
      </h1>
      
      {/* Verification Result */}
      {scanResult && (
        <div 
          className={`card animate-fade-in border transition-all duration-300 mb-6 text-center ${
            scanResult.isValid 
              ? 'bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-700' 
              : 'bg-danger-50 dark:bg-danger-900/20 border-danger-200 dark:border-danger-700'
          }`}
        >
          <div className="p-6 md:p-8">
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
              }`}>{scanResult.message}</p>
            )}
          
            {/* Show destination address if available */}
            {scanResult.isValid && scanResult.destinationAddress && (
              <div className="mt-6 pt-5 border-t border-success-200 dark:border-success-700/50 text-left">
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
        </div>
      )}

      {!scanResult && (
        <div className="card border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm mb-6 overflow-hidden">
          <div className="aspect-square bg-gray-100 dark:bg-gray-700 flex items-center justify-center rounded-t-lg overflow-hidden">
            {isCameraActive ? (
              <div className="w-full h-full overflow-hidden">
                <QrScanner 
                  isActive={isCameraActive}
                  onScanResult={handleScanResult}
                  onScanningStateChange={handleScanningStateChange}
                />
              </div>
            ) : (
              <div className="text-center p-8 animate-pulse-slow">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mx-auto text-gray-400 dark:text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
                  Camera inactive
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                  Tap the button below to activate the camera and scan a QR code
                </p>
              </div>
            )}
          </div>
          
          <div className="p-4">
            <button 
              onClick={handleStartScan}
              disabled={isProcessing}
              className={`w-full py-3 px-4 rounded-lg font-medium text-base transition-all duration-200 flex items-center justify-center ${
                isProcessing
                  ? 'bg-gray-200 dark:bg-gray-700 cursor-not-allowed text-gray-500 dark:text-gray-400'
                  : isCameraActive 
                    ? 'bg-danger hover:bg-danger-600 text-white shadow-sm hover:shadow-md focus:ring-2 focus:ring-danger-200 focus:ring-offset-1' 
                    : 'bg-primary hover:bg-primary-600 text-white shadow-sm hover:shadow-md focus:ring-2 focus:ring-primary-200 focus:ring-offset-1'
              }`}
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Processing...</span>
                </>
              ) : (
                <span className="flex items-center">
                  {isCameraActive ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Stop Camera
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Start Camera
                    </>
                  )}
                </span>
              )}
            </button>
          </div>
        </div>
      )}
      
      <div className="card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">How to use</h2>
        </div>
        <ol className="list-decimal pl-5 space-y-2.5 text-gray-600 dark:text-gray-300">
          <li>Click <span className="font-medium text-primary-600 dark:text-primary-400">Start Camera</span> to activate your device's camera</li>
          <li>Position the QR code within the scanning frame</li>
          <li>Hold steady until the code is recognized</li>
          <li>The app will automatically process the code once detected</li>
        </ol>
      </div>
    </div>
  );
}
