"use client";

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface QRCodeScannerProps {
  onScan: (code: string) => void;
  isActive: boolean;
}

export default function QRCodeScanner({ onScan, isActive }: QRCodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isCameraAvailable, setIsCameraAvailable] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize scanner
  useEffect(() => {
    // Wait for DOM to be fully ready
    const initScanner = setTimeout(() => {
      if (!containerRef.current) {
        console.log('Container ref is not available yet');
        return;
      }
      
      try {
        const containerId = 'qr-scanner-container';
        containerRef.current.id = containerId;
        
        console.log('Initializing QR scanner with container ID:', containerId);
        
        // Create scanner instance with error handling
        scannerRef.current = new Html5Qrcode(containerId);
        console.log('Scanner instance created successfully');
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing QR scanner:', error);
        setIsCameraAvailable(false);
      }
    }, 500); // Small delay to ensure DOM is ready
    
    // Cleanup scanner on unmount
    return () => {
      clearTimeout(initScanner); // Clear the timeout to prevent memory leaks
      
      if (scannerRef.current?.isScanning) {
        console.log('Stopping scanner on cleanup');
        scannerRef.current.stop()
          .catch(err => console.error('Error stopping scanner:', err));
      }
      scannerRef.current = null;
    };
  }, []);
  
  // Start/stop scanner when active status changes or after initialization
  useEffect(() => {
    if (!isInitialized || !scannerRef.current) {
      console.log('Scanner not initialized yet or scanner ref is null');
      return;
    }
    
    if (isActive) {
      try {
        console.log('Starting QR scanner');
        
        // Get container dimensions safely
        let width = 250;
        let height = 250;
        
        if (containerRef.current) {
          const containerWidth = containerRef.current.clientWidth || 250;
          width = Math.min(containerWidth - 40, 250); // Use safe dimensions
          height = width;
        }
        
        const config = {
          fps: 10,
          qrbox: { width: width, height: height },
          aspectRatio: 1,
        };
        
        console.log('Starting scanner with config:', config);
        
        scannerRef.current.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            console.log('QR code scanned successfully:', decodedText);
            onScan(decodedText);
          },
          (errorMessage) => {
            // Ignore errors during normal scanning
            console.log('QR scanning error:', errorMessage);
          }
        ).catch(err => {
          console.error('Error starting scanner:', err);
          setIsCameraAvailable(false);
        });
      } catch (error) {
        console.error('Exception while starting scanner:', error);
        setIsCameraAvailable(false);
      }
    } else {
      // Stop scanner if not active
      if (scannerRef.current.isScanning) {
        scannerRef.current.stop()
          .catch(err => console.error('Error stopping scanner:', err));
      }
    }
    
    // Stop scanner on component cleanup
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop()
          .catch(err => console.error('Error stopping scanner:', err));
      }
    };
  }, [isActive, isInitialized, onScan]);

  if (!isCameraAvailable) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <h3 className="text-lg font-medium">Camera Not Available</h3>
        <p className="text-sm text-gray-500 mt-1">
          Please allow camera access to scan QR codes or use manual code entry.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div 
        ref={containerRef} 
        className="h-full relative flex items-center justify-center"
      >
        {!isActive && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-white z-10">
            <div className="text-center p-4">
              <div className="text-3xl mb-2">⏸️</div>
              <p>Scanner paused</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
