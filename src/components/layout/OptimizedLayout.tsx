import dynamic from 'next/dynamic';
import { Suspense } from 'react';
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
if (typeof document !== 'undefined') {
  document.head.appendChild(style);
}
