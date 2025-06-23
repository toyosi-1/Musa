import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import './globals.css';
import AuthWrapper from '@/components/auth/AuthWrapper';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { ThemeProvider } from '@/contexts/ThemeContext';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

// Define viewport configuration separately as required by Next.js 14
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  userScalable: false,
  minimumScale: 1,
  maximumScale: 1,
  themeColor: '#3b82f6',
};

export const metadata: Metadata = {
  title: 'Musa',
  description: 'A seamless, fast, and user-friendly access control system for estates',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Musa'
  },
  // Prevent PWA installations that might show headers
  applicationName: 'Musa',
  manifest: undefined, // Prevent auto manifest generation
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans`}>
        <ThemeProvider>
          <Suspense fallback={<LoadingScreen message="Loading application..." />}>
            <AuthWrapper>
              <Suspense fallback={<LoadingScreen message="Loading content..." />}>
                {children}
              </Suspense>
            </AuthWrapper>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
