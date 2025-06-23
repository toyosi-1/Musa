'use client';

import React from 'react';

// Modern illustrated gate access graphic
export default function AccessIllustration({ className = '' }: { className?: string }) {
  return (
    <div className={`w-full max-w-sm mx-auto ${className}`}>
      <svg 
        viewBox="0 0 400 300" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto animate-fade-in"
      >
        {/* Background */}
        <rect x="0" y="0" width="400" height="300" rx="12" fill="var(--illustration-bg, #f3f4f6)" className="transition-colors duration-300" />
        
        {/* Estate/Community Gate */}
        <rect x="140" y="40" width="120" height="160" rx="4" fill="var(--gate-color, #e5e7eb)" stroke="var(--gate-border, #9ca3af)" strokeWidth="2" className="transition-colors duration-300" />
        <rect x="160" y="60" width="80" height="120" rx="2" fill="var(--gate-window, #d1d5db)" stroke="var(--gate-border, #9ca3af)" strokeWidth="1" className="transition-colors duration-300" />
        
        {/* Gate Posts */}
        <rect x="130" y="40" width="10" height="180" fill="var(--post-color, #6b7280)" className="transition-colors duration-300" />
        <rect x="260" y="40" width="10" height="180" fill="var(--post-color, #6b7280)" className="transition-colors duration-300" />
        
        {/* Digital Access Panel */}
        <rect x="90" y="120" width="40" height="60" rx="4" fill="var(--panel-color, #3B82F6)" className="transition-colors duration-300" />
        <rect x="95" y="130" width="30" height="20" rx="2" fill="var(--screen-color, #bfdbfe)" className="transition-colors duration-300" />
        <circle cx="110" cy="165" r="8" fill="var(--button-color, #10B981)" className="transition-colors duration-300 animate-pulse-slow" />
        
        {/* Person with phone */}
        <circle cx="60" cy="150" r="15" fill="var(--person-color, #4B5563)" className="transition-colors duration-300" />
        <rect x="50" y="165" width="20" height="40" rx="8" fill="var(--person-color, #4B5563)" className="transition-colors duration-300" />
        <rect x="40" y="185" width="10" height="30" rx="4" fill="var(--person-color, #4B5563)" className="transition-colors duration-300" />
        <rect x="70" y="185" width="10" height="30" rx="4" fill="var(--person-color, #4B5563)" className="transition-colors duration-300" />
        
        {/* Phone in hand */}
        <rect x="70" y="170" width="15" height="25" rx="2" fill="var(--phone-color, #1F2937)" className="transition-colors duration-300" />
        <rect x="72" y="173" width="11" height="19" rx="1" fill="var(--screen-color, #bfdbfe)" className="transition-colors duration-300" />
        
        {/* QR code scanning visualization */}
        <path d="M85 180 L 95 155" stroke="var(--scan-line, #3B82F6)" strokeWidth="1.5" strokeDasharray="3 2" className="transition-colors duration-300 animate-pulse-slow" />
        
        {/* Road */}
        <rect x="0" y="220" width="400" height="80" fill="var(--road-color, #9ca3af)" className="transition-colors duration-300" />
        <rect x="20" y="255" width="60" height="10" rx="2" fill="var(--road-marking, #f3f4f6)" className="transition-colors duration-300" />
        <rect x="120" y="255" width="60" height="10" rx="2" fill="var(--road-marking, #f3f4f6)" className="transition-colors duration-300" />
        <rect x="220" y="255" width="60" height="10" rx="2" fill="var(--road-marking, #f3f4f6)" className="transition-colors duration-300" />
        <rect x="320" y="255" width="60" height="10" rx="2" fill="var(--road-marking, #f3f4f6)" className="transition-colors duration-300" />
      </svg>

      <style jsx>{`
        :root {
          --illustration-bg: #f3f4f6;
          --gate-color: #e5e7eb;
          --gate-border: #9ca3af;
          --gate-window: #d1d5db;
          --post-color: #6b7280;
          --panel-color: #3B82F6;
          --screen-color: #bfdbfe;
          --button-color: #10B981;
          --person-color: #4B5563;
          --phone-color: #1F2937;
          --scan-line: #3B82F6;
          --road-color: #9ca3af;
          --road-marking: #f3f4f6;
        }

        .dark {
          --illustration-bg: #111827;
          --gate-color: #374151;
          --gate-border: #6b7280;
          --gate-window: #4b5563;
          --post-color: #9ca3af;
          --panel-color: #2563eb;
          --screen-color: #1e40af; 
          --button-color: #059669;
          --person-color: #d1d5db;
          --phone-color: #e5e7eb;
          --scan-line: #60a5fa;
          --road-color: #4b5563;
          --road-marking: #9ca3af;
        }
      `}</style>
    </div>
  );
}
