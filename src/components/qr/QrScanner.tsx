'use client';

import { useState, useEffect, useRef } from 'react';
import { verifyAccessCode } from '@/services/accessCodeService';
import { Household } from '@/types/user';

type QrScannerProps = {
  onScanResult: (result: { 
    isValid: boolean; 
    message?: string; 
    household?: Household;
    destinationAddress?: string;
    guestCommunicationUrl?: string;
  }) => void;
  isActive: boolean;
  onScanningStateChange: (isScanning: boolean) => void;
};

export default function QrScanner({ onScanResult, isActive, onScanningStateChange }: QrScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const scanner = useRef<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanActive, setScanActive] = useState(false);

  // Initialize scanner when component mounts and is active
  useEffect(() => {
    let isMounted = true;
    
    const initializeScanner = async () => {
      if (!isActive || !scannerRef.current || isProcessing) return;
      
      try {
        // Dynamic import of the HTML5-QRCode library
        const { Html5Qrcode } = await import('html5-qrcode');
        
        if (!isMounted) return;
        
        scanner.current = new Html5Qrcode("qr-reader");
        
        await scanner.current.start(
          { facingMode: "environment" },
          {
            fps: 15,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1
          },
          onScanSuccess,
          (errorMessage: string) => {
            console.log('QR Code scan error:', errorMessage);
          }
        );
      } catch (error) {
        console.error('Error initializing QR scanner:', error);
        if (isMounted) {
          onScanningStateChange(false);
        }
      }
    };

    if (isActive) {
      // Short delay to ensure DOM is ready
      setTimeout(initializeScanner, 300);
    } else {
      stopScanner();
    }

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isActive, isProcessing]);

  const stopScanner = () => {
    if (!scanner.current) return;
    
    try {
      if (scanner.current.isScanning) {
        scanner.current.stop()
          .then(() => {
            console.log('QR Code scanning stopped');
            setScanActive(false);
          })
          .catch((err: any) => {
            console.error('Error stopping QR Code scanning:', err);
          });
      } else {
        setScanActive(false);
      }
    } catch (error) {
      console.error('Error stopping scanner:', error);
      setScanActive(false);
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      stopScanner();
      
      console.log('QR Code detected:', decodedText);
      const result = await verifyAccessCode(decodedText);
      
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
      <div id="qr-reader" ref={scannerRef} className="w-full h-full overflow-hidden">
        {/* HTML5 QR Scanner will render here */}
      </div>
      
      {/* Scanning overlay with visual guides */}
      {isActive && (
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
          
          {/* Scanning animation */}
          {scanActive && (
            <div className="absolute left-0 right-0 h-1 bg-primary opacity-80 animate-scan-line">
              {/* Moving scan line */}
            </div>
          )}
          
          {/* Center target indicator */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 border-2 border-dashed border-primary/40 rounded-lg"></div>
          </div>
          
          {/* Info text */}
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <p className="text-sm font-medium text-white bg-black/60 inline-block px-4 py-2 rounded-full">
              {scanActive ? "Scanning..." : "Ready to scan"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
