'use client';

import dynamic from 'next/dynamic';
import { Suspense, useEffect } from 'react';
import SplashScreen from '@/components/ui/SplashScreen';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

// Lazy load non-critical components
const ThemeProvider = dynamic(() => import('@/contexts/ThemeContext').then(mod => mod.ThemeProvider), {
  ssr: false,
  loading: () => <SplashScreen />
});

const AuthWrapper = dynamic(() => import('@/components/auth/AuthWrapper'), {
  ssr: false,
  loading: () => <LoadingSkeleton />
});

interface OptimizedLayoutProps {
  children: React.ReactNode;
}

export default function OptimizedLayout({ children }: OptimizedLayoutProps) {
  useEffect(() => {
    // Add fade-in animation for initial page load
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .animate-fade-in {
        animation: fadeIn 0.3s ease-in-out;
      }
    `;
    
    document.head.appendChild(style);
    
    // Cleanup function to remove the style element when component unmounts
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <ThemeProvider>
        <AuthWrapper>
          <div className="min-h-screen flex flex-col animate-fade-in">
            {children}
          </div>
        </AuthWrapper>
      </ThemeProvider>
    </Suspense>
  );
}
