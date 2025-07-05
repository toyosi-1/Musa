import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import Script from 'next/script';
import './globals.css';

import { getPublicEnvScript } from '@/utils/env';
import dynamic from 'next/dynamic';

// Dynamically import client components with no SSR
const ClientBody = dynamic(
  () => import('@/components/layout/ClientBody'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-musa-bg dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }
);

const MobileInitializer = dynamic(
  () => import('@/components/layout/MobileInitializer'),
  { ssr: false }
);

const ThemeProvider = dynamic(
  () => import('@/contexts/ThemeContext').then(mod => mod.ThemeProvider),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-musa-bg dark:bg-gray-900" />
    )
  }
);

const AuthWrapper = dynamic(
  () => import('@/components/auth/AuthWrapper'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-musa-bg dark:bg-gray-900" />
    )
  }
);

// Load Inter font with optimized settings
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['400', '500', '600', '700'],
  preload: true,
  adjustFontFallback: false,
});

// Define viewport configuration for better mobile and PWA support
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#3b82f6' },
    { media: '(prefers-color-scheme: dark)', color: '#1e40af' },
  ],
  colorScheme: 'light dark',
  maximumScale: 1,
  interactiveWidget: 'resizes-visual',
};

export const metadata: Metadata = {
  title: 'Musa - Estate Access Control',
  description: 'A seamless, fast, and user-friendly access control system for estates',
  generator: 'Next.js',
  keywords: ['estate', 'security', 'access control', 'pwa', 'nextjs'],
  authors: [{ name: 'Musa Team' }],
  creator: 'Musa Team',
  publisher: 'Musa',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://musa-security-app.windsurf.build'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Musa - Estate Access Control',
    description: 'A seamless, fast, and user-friendly access control system for estates',
    url: 'https://musa-security-app.windsurf.build',
    siteName: 'Musa',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Musa - Estate Access Control',
    description: 'A seamless, fast, and user-friendly access control system for estates',
    creator: '@musa',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Musa',
  },
  applicationName: 'Musa',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' },
      { url: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
      { url: '/images/icon-72x72.png', sizes: '72x72', type: 'image/png' },
      { url: '/images/icon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/images/icon-128x128.png', sizes: '128x128', type: 'image/png' },
      { url: '/images/icon-144x144.png', sizes: '144x144', type: 'image/png' },
      { url: '/images/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/images/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/images/icon-384x384.png', sizes: '384x384', type: 'image/png' },
      { url: '/images/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/images/icon-180x180.png', sizes: '180x180', type: 'image/png' },
      { url: '/images/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/images/icon-144x144.png', sizes: '144x144', type: 'image/png' },
      { url: '/images/icon-128x128.png', sizes: '128x128', type: 'image/png' },
    ]
  },
  other: {
    'mask-icon': '/safari-pinned-tab.svg',
    'msapplication-TileColor': '#3b82f6',
    'msapplication-config': '/browserconfig.xml',
  },
};



export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html 
      lang="en" 
      className={`${inter.variable} font-sans antialiased`}
      style={{
        height: '100%',
        width: '100%',
        margin: 0,
        padding: 0,
      } as React.CSSProperties}
      suppressHydrationWarning
    >
      <head>
        {/* Standard meta tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        
        {/* Preload critical resources */}
        <link 
          rel="preload" 
          href="/fonts/inter-var.woff2" 
          as="font" 
          type="font/woff2" 
          crossOrigin="anonymous" 
        />
        {/* iOS specific meta tags */}
        <meta name="apple-touch-startup-image" content="/splash/launch-1242x2688.png" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <meta name="apple-touch-startup-image" content="/splash/launch-1125x2436.png" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <meta name="apple-touch-startup-image" content="/splash/launch-828x1792.png" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        <meta name="apple-touch-startup-image" content="/splash/launch-1242x2208.png" media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <meta name="apple-touch-startup-image" content="/splash/launch-750x1334.png" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        <meta name="apple-touch-startup-image" content="/splash/launch-640x1136.png" media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        
        {/* Environment Script */}
        <Script
          id="env-script"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: getPublicEnvScript(),
          }}
        />
        
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
      </head>
      <ClientBody>
        <MobileInitializer />
        <ThemeProvider>
          <AuthWrapper>
            <div 
              className="flex-1 flex flex-col w-full h-full overflow-auto"
              style={{
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain',
                height: '100%',
                width: '100%',
                paddingTop: 'var(--safe-padding-top, 0px)',
                paddingBottom: 'var(--safe-padding-bottom, 0px)',
                paddingLeft: 'var(--safe-padding-left, 0px)',
                paddingRight: 'var(--safe-padding-right, 0px)'
              }}
            >
              <Suspense fallback={
                <div className="flex items-center justify-center min-h-screen">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              }>
                <div className="flex-1 flex flex-col w-full h-full max-w-full mx-auto relative">
                  <main 
                    className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"
                    style={{
                      minHeight: 'calc(100vh - env(safe-area-inset-top, 0px) - env(safe-area-bottom, 0px))',
                      height: '100%',
                      overflow: 'auto',
                      WebkitOverflowScrolling: 'touch'
                    }}
                  >
                    {children}
                  </main>
                </div>
              </Suspense>
            </div>
          </AuthWrapper>
        </ThemeProvider>
      </ClientBody>
    </html>
  );
}
