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
  applicationName: 'Musa',
  icons: {
    icon: [
      { url: '/images/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/images/icon-512x512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [
      { url: '/images/icon-152x152.png', sizes: '152x152', type: 'image/png' }
    ]
  },
  manifest: '/manifest.json'
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
