"use client";

import { useState, useEffect, useRef } from 'react';
import { User } from '@/types/user';
import { verifyAccessCode } from '@/services/accessCodeService';
import QRCodeScanner from '@/components/guard/QRCodeScanner';

interface GuardDashboardProps {
  user: User;
}

export default function GuardDashboard({ user }: GuardDashboardProps) {
  const [manualCode, setManualCode] = useState('');
  const [scanResult, setScanResult] = useState<{ isValid: boolean; message?: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle QR code scanning
  const handleQRCodeScanned = async (code: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setManualCode(code);
    console.log('QR code scanned:', code);
    
    try {
      console.log('Verifying QR code...');
      const result = await verifyAccessCode(code);
      console.log('Verification result:', result);
      setScanResult(result);
      
      // Reset after 5 seconds
      setTimeout(() => {
        setScanResult(null);
        setManualCode('');
      }, 5000);
    } catch (err) {
      console.error('Error verifying QR code:', err);
      setScanResult({ 
        isValid: false, 
        message: 'Failed to verify code: ' + (err instanceof Error ? err.message : 'Unknown error')
      });
      
      // Reset after 5 seconds
      setTimeout(() => {
        setScanResult(null);
        setManualCode('');
      }, 5000);
    } finally {
      setIsProcessing(false);
    }
  };

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
      
      // Reset after 5 seconds
      setTimeout(() => {
        setScanResult(null);
        setManualCode('');
      }, 5000);
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

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Guard Dashboard</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        {/* QR Code Scanner Section */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4">QR Code Scanner</h2>
          <div className="aspect-square max-w-sm mx-auto bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden">
            <QRCodeScanner onScan={handleQRCodeScanned} isActive={!scanResult} />
          </div>
        </div>
        
        {/* Manual Code Entry Section */}
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">Manual Code Entry</h2>
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <input
                ref={inputRef}
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="Enter access code (e.g., MUSA1234)"
                className="input w-full text-center text-3xl font-black font-mono tracking-wider py-4 text-black dark:text-white bg-gray-100 dark:bg-gray-700 border-4 border-indigo-600 focus:border-indigo-800 focus:ring-2 focus:ring-indigo-500 rounded-lg shadow-lg"
                disabled={isProcessing}
                autoCapitalize="characters"
                autoComplete="off"
                maxLength={10}
              />
            </div>
            
            <button
              type="submit"
              className="btn-primary w-full py-3"
              disabled={!manualCode || isProcessing}
            >
              Verify Code
            </button>
          </form>
        </div>
        
        {/* Verification Result */}
        {scanResult && (
          <div 
            className={`p-8 text-center ${
              scanResult.isValid 
                ? 'bg-success text-white' 
                : 'bg-danger text-white'
            }`}
          >
            <div className="text-5xl mb-4">
              {scanResult.isValid ? '✓' : '✗'}
            </div>
            <h3 className="text-2xl font-bold mb-2">
              {scanResult.isValid ? 'Access Granted' : 'Access Denied'}
            </h3>
            {scanResult.message && (
              <p className="opacity-90">{scanResult.message}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
