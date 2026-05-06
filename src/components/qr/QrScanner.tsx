'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { verifyAccessCode } from '@/services/accessCodeService';
import { verifyCodeOffline } from '@/services/offlineGuardService';
import { Household } from '@/types/user';
import {
  CameraError,
  classifyCameraError,
  checkSecureContext,
  checkMediaDevicesSupport,
} from './cameraErrors';

type QrScannerProps = {
  onScanResult: (result: { 
    isValid: boolean; 
    message?: string; 
    household?: Household;
    destinationAddress?: string;
    accessCodeId?: string;
    estateId?: string;
    guestCommunicationUrl?: string;
  }) => void;
  isActive: boolean;
  onScanningStateChange: (isScanning: boolean) => void;
  estateId?: string; // Add estateId for proper estate boundary enforcement
  guardName?: string; // Guard's name for notification personalization
};

export default function QrScanner({ onScanResult, isActive, onScanningStateChange, estateId, guardName }: QrScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scanner = useRef<any>(null);
  const isStartingRef = useRef(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<CameraError | null>(null);
  // Bumping retryToken re-runs the start effect without us having to round-trip
  // through the parent's `isActive` toggle, so the user stays on the scanner
  // panel while we retry.
  const [retryToken, setRetryToken] = useState(0);

  const stopScanner = useCallback(async () => {
    if (!scanner.current) return;
    try {
      if (scanner.current.isScanning) {
        await scanner.current.stop();
      }
    } catch (err) {
      // Stopping a not-running scanner throws on some platforms; swallow.
      console.warn('[QrScanner] stop() warned:', err);
    }
  }, []);

  // Initialize scanner when component mounts and is active.
  // Note: we deliberately do NOT depend on `isProcessing` here — a successful
  // scan flips that flag, and re-running the effect would race with our
  // inline stop() and silently re-create the Html5Qrcode instance.
  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      if (!isActive) return;

      // Bail early with a clear message if the environment can't possibly work.
      const supportErr = checkMediaDevicesSupport();
      if (supportErr) { setError(supportErr); return; }
      const insecureErr = checkSecureContext();
      if (insecureErr) { setError(insecureErr); return; }

      // Wait one tick so the #qr-reader div is in the DOM. The previous
      // implementation used a 300ms setTimeout which was both slower and
      // racier than awaiting a microtask.
      await Promise.resolve();
      if (cancelled || !containerRef.current) return;

      // Reentrancy guard — React StrictMode runs effects twice in dev, and
      // we never want two concurrent start() calls on the same instance.
      if (isStartingRef.current) return;
      isStartingRef.current = true;

      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;

        if (!scanner.current) scanner.current = new Html5Qrcode('qr-reader');
        if (scanner.current.isScanning) return; // already running, nothing to do

        await scanner.current.start(
          { facingMode: 'environment' },
          { fps: 15, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
          onScanSuccess,
          () => { /* per-frame decode failures are normal; ignore */ },
        );
        setError(null);
      } catch (err) {
        console.error('[QrScanner] start failed:', err);
        setError(classifyCameraError(err));
      } finally {
        isStartingRef.current = false;
      }
    };

    if (isActive) {
      start();
    } else {
      stopScanner();
      setError(null);
    }

    return () => {
      cancelled = true;
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, retryToken]);

  const handleRetry = () => {
    setError(null);
    setRetryToken(t => t + 1);
  };

  const handleUseManualEntry = () => {
    onScanningStateChange(false);
  };

  const onScanSuccess = async (decodedText: string) => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      stopScanner();
      
      console.log('QR Code detected:', decodedText);

      let result: { isValid: boolean; message?: string; household?: any; destinationAddress?: string; accessCodeId?: string; estateId?: string };
      if (!navigator.onLine) {
        // Offline: verify against local cache
        console.log('[QrScanner] Offline — using local verification');
        result = verifyCodeOffline(decodedText, estateId || '');
      } else {
        try {
          result = await verifyAccessCode(decodedText, { estateId, guardName });
        } catch (networkErr) {
          // Network failed mid-request — fall back to offline
          console.warn('[QrScanner] Online verify failed, falling back to offline:', networkErr);
          result = verifyCodeOffline(decodedText, estateId || '');
        }
      }
      
      // Log the destination address if available
      if (result.isValid && result.destinationAddress) {
        console.log('Destination address:', result.destinationAddress);
      }
      
      // Create a new result object with all properties from original plus the guest communication URL
      const finalResult = {
        ...result,
        guestCommunicationUrl: result.isValid ? `/guest?code=${encodeURIComponent(decodedText)}` : undefined
      };
      
      if (onScanResult) {
        onScanResult(finalResult);
      }
      
    } catch (err) {
      console.error('Error verifying code:', err);
      onScanResult({ 
        isValid: false, 
        message: 'Failed to verify code: ' + (err instanceof Error ? err.message : 'Unknown error')
      });
    } finally {
      setIsProcessing(false);
      onScanningStateChange(false);
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Main scanner container */}
      <div id="qr-reader" ref={containerRef} className="w-full h-full overflow-hidden">
        {/* HTML5 QR Scanner will render here */}
      </div>

      {/* Camera error pane — replaces the silent toggle-off behavior */}
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="absolute inset-0 bg-gray-900/95 text-white flex items-center justify-center p-6 z-20"
        >
          <div className="max-w-sm text-center">
            <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-400/50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
              </svg>
            </div>
            <h3 className="text-base font-bold mb-2">{error.message}</h3>
            {error.hint && <p className="text-sm text-gray-300 mb-5">{error.hint}</p>}
            <div className="flex flex-col gap-2">
              {error.type !== 'no-camera' && error.type !== 'unsupported' && (
                <button
                  onClick={handleRetry}
                  className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 active:scale-[0.98] transition text-sm font-semibold"
                >
                  Retry
                </button>
              )}
              <Link
                href="/dashboard/guard"
                onClick={handleUseManualEntry}
                className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 transition text-sm font-semibold inline-block"
              >
                Use manual code entry
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Scanning overlay with visual guides */}
      {isActive && !error && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Overlay grid for better alignment */}
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
            {/* Top left corner */}
            <div className="border-t-4 border-l-4 border-primary w-16 h-16 rounded-tl-lg"></div>
            {/* Top right corner */}
            <div className="col-start-3 border-t-4 border-r-4 border-primary w-16 h-16 rounded-tr-lg justify-self-end"></div>
            {/* Bottom left corner */}
            <div className="row-start-3 border-b-4 border-l-4 border-primary w-16 h-16 rounded-bl-lg self-end"></div>
            {/* Bottom right corner */}
            <div className="col-start-3 row-start-3 border-b-4 border-r-4 border-primary w-16 h-16 rounded-br-lg self-end justify-self-end"></div>
          </div>

          {/* Center target indicator */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 border-2 border-dashed border-primary/40 rounded-lg"></div>
          </div>

          {/* Info text */}
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <p className="text-sm font-medium text-white bg-black/60 inline-block px-4 py-2 rounded-full">
              {isProcessing ? 'Verifying…' : 'Position the QR code in the frame'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
