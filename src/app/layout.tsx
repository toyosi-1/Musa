import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import Script from 'next/script';
import './globals.css';
import AuthWrapper from '@/components/auth/AuthWrapper';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { getPublicEnvScript } from '@/utils/env';
import MobileInitializer from '@/components/layout/MobileInitializer';

// Load Inter font with all required weights and subsets
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['300', '400', '500', '600', '700'],
});

// Define viewport configuration for better mobile and PWA support
export const viewport: Viewport = {
  // Core viewport settings for PWA
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  
  // Theme colors for different modes
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#3b82f6' },
    { media: '(prefers-color-scheme: dark)', color: '#1e40af' },
  ],
  
  // Mobile browser UI
  colorScheme: 'light dark',
  
  // iOS specific
  appleMobileWebAppCapable: 'yes',
  appleMobileWebAppStatusBarStyle: 'black-translucent',
  
  // Disable zooming
  maximumScale: 1,
  userScalable: false,
  
  // Interactive widget support
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
      // Apple Touch Icons - using the available icon sizes
      { url: '/images/icon-180x180.png', sizes: '180x180', type: 'image/png' }, // iPhone 6 Plus and up
      { url: '/images/icon-152x152.png', sizes: '152x152', type: 'image/png' }, // iPad and iPad mini with @2x
      { url: '/images/icon-144x144.png', sizes: '144x144', type: 'image/png' }, // Alternative for iPad
      { url: '/images/icon-128x128.png', sizes: '128x128', type: 'image/png' }, // Fallback for older devices
    ]
  },
  // Additional meta tags for better PWA support
  other: {
    // Safari pinned tab
    'mask-icon': '/safari-pinned-tab.svg',
    'msapplication-TileColor': '#3b82f6',
    'msapplication-config': '/browserconfig.xml',
    'theme-color': '#3b82f6',
  },
  // iOS specific meta tags
  appleWebApp: {
    title: 'Musa',
    statusBarStyle: 'black-translucent',
    capable: true,
  },
  // Viewport settings are now handled by the viewport export
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
        overflowX: 'hidden',
      } as React.CSSProperties}
    >
      <head>
        {/* PWA and Mobile Web App Capabilities */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Musa" />
        
        {/* iOS specific meta tags */}
        <meta name="apple-touch-startup-image" content="/splash/launch-1242x2688.png" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <meta name="apple-touch-startup-image" content="/splash/launch-1242x2688.png" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        <meta name="apple-touch-startup-image" content="/splash/launch-1125x2436.png" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <meta name="apple-touch-startup-image" content="/splash/launch-828x1792.png" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        <meta name="apple-touch-startup-image" content="/splash/launch-1242x2208.png" media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <meta name="apple-touch-startup-image" content="/splash/launch-750x1334.png" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        <meta name="apple-touch-startup-image" content="/splash/launch-640x1136.png" media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        
        {/* Viewport settings */}
        <meta 
          name="viewport" 
          content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no" 
        />
        
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/images/icon-192x192.png" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#3b82f6" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#1e40af" />
        
        <Script
          id="env-script"
          dangerouslySetInnerHTML={{
            __html: getPublicEnvScript(),
          }}
        />
        
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        
        {/* Preload critical resources */}
        <link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-musa-bg dark:bg-gray-900 text-gray-900 dark:text-white relative overflow-x-hidden touch-manipulation" 
        style={{
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorY: 'auto',
          minHeight: '100vh',
          width: '100vw',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          margin: 0,
          padding: 0,
          position: 'relative',
          overflowX: 'hidden',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}>
        <MobileInitializer />
        <ThemeProvider>
          <AuthWrapper>
            <div className="flex-1 flex flex-col w-full h-full overflow-auto" 
              style={{
                WebkitOverflowScrolling: 'touch',
                paddingTop: 'env(safe-area-inset-top, 0px)',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                paddingLeft: 'env(safe-area-inset-left, 0px)',
                paddingRight: 'env(safe-area-inset-right, 0px)'
              }}>
              <Suspense fallback={<LoadingScreen />}>
                <div className="flex-1 flex flex-col w-full max-w-full mx-auto relative">
                  <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {children}
                  </main>
                </div>
              </Suspense>
            </div>
          </AuthWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
