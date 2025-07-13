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

const inter = Inter({ 
  subsets: ['latin'], 
  variable: '--font-inter',
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial']
});

// Define viewport configuration for better mobile and PWA support
export const viewport: Viewport = {
  // Core viewport settings
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1, // Disable zooming for better mobile experience
  userScalable: false,
  
  // PWA and theme settings
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#3b82f6' },
    { media: '(prefers-color-scheme: dark)', color: '#1e40af' },
  ],
  
  // Viewport behavior
  viewportFit: 'cover',
  interactiveWidget: 'resizes-visual',
  
  // Mobile browser UI
  colorScheme: 'light dark',
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
      { url: '/images/icon-72x72.png?version=v1752395417209', sizes: '72x72', type: 'image/png' },
      { url: '/images/icon-96x96.png?version=v1752395417209', sizes: '96x96', type: 'image/png' },
      { url: '/images/icon-128x128.png?version=v1752395417209', sizes: '128x128', type: 'image/png' },
      { url: '/images/icon-144x144.png?version=v1752395417209', sizes: '144x144', type: 'image/png' },
      { url: '/images/icon-152x152.png?version=v1752395417209', sizes: '152x152', type: 'image/png' },
      { url: '/images/icon-192x192.png?version=v1752395417209', sizes: '192x192', type: 'image/png' },
      { url: '/images/icon-384x384.png?version=v1752395417209', sizes: '384x384', type: 'image/png' },
      { url: '/images/icon-512x512.png?version=v1752395417209', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      // Apple Touch Icons - using the available icon sizes
      { url: '/images/icon-180x180.png?version=v1752395417209', sizes: '180x180', type: 'image/png' }, // iPhone 6 Plus and up
      { url: '/images/icon-152x152.png?version=v1752395417209', sizes: '152x152', type: 'image/png' }, // iPad and iPad mini with @2x
      { url: '/images/icon-144x144.png?version=v1752395417209', sizes: '144x144', type: 'image/png' }, // Alternative for iPad
      { url: '/images/icon-128x128.png?version=v1752395417209', sizes: '128x128', type: 'image/png' }, // Fallback for older devices
    ]
  },
  // Additional meta tags for better PWA support
  other: {
    // Safari pinned tab
    'mask-icon': '/safari-pinned-tab.svg',
    // Apple touch icon for older iOS versions
    'apple-touch-icon': '/images/icon-180x180.png?version=v1752395417209',
    'apple-touch-icon-sizes': '180x180',
    // Windows 8/10 tile
    'msapplication-TileImage': '/images/icon-144x144.png?version=v1752395417209',
    // Windows 8/10 tile color and config
    'msapplication-TileColor': '#3b82f6',
    'msapplication-config': '/browserconfig.xml',
    // PWA capabilities
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'Musa',
  },
};



export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} font-sans`}>
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
        
        {/* Prevent text size changes on orientation change in iOS */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no" />
        
        {/* Disable auto-zoom on input focus in mobile Safari */}
        <meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no" />
        
        {/* Theme color for address bar */}
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#3b82f6" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#1e40af" />
        
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
        
        {/* Preload critical resources */}
        <link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        
        {/* PWA manifest for Android/Chrome support */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Direct iOS icon links for better Add to Home Screen support */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?version=v1752395417209" />
        <link rel="apple-touch-icon" sizes="180x180" href="/images/icon-180x180.png?version=v1752395417209" />
        <link rel="apple-touch-icon" sizes="152x152" href="/images/icon-152x152.png?version=v1752395417209" />
        <link rel="apple-touch-icon" sizes="144x144" href="/images/icon-144x144.png?version=v1752395417209" />
        <link rel="apple-touch-icon" sizes="128x128" href="/images/icon-128x128.png?version=v1752395417209" />
        
        {/* Explicit iOS meta tags for home screen app behavior */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Musa" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-musa-bg dark:bg-gray-900 text-gray-800 dark:text-gray-200 min-h-screen overflow-x-hidden`}>
        <MobileInitializer />
        <ThemeProvider>
          <AuthWrapper>
            <Suspense fallback={<LoadingScreen />}>
              <div className="min-h-screen flex flex-col">
                {children}
              </div>
            </Suspense>
          </AuthWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
