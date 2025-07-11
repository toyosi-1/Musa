import type { Metadata, Viewport } from 'next';
import { Inter, Poppins } from 'next/font/google';
import Script from 'next/script';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { getPublicEnvScript } from '@/utils/env';
import PerformanceMonitor from '@/components/PerformanceMonitor';
import './globals.css';

// Import critical CSS as a string
const criticalCSS = require('!!raw-loader!./critical.css').default;

// Lazy load non-critical components with loading states
const MobileInitializer = dynamic(
  () => import('@/components/layout/MobileInitializer'),
  { 
    ssr: false,
    loading: () => null,
  }
);

// Lazy load the main layout to reduce initial JS
const LazyOptimizedLayout = dynamic(
  () => import('@/components/layout/OptimizedLayout'),
  { 
    ssr: true,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }
);

// Optimize font loading with variable fonts and better fallbacks
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['400', '500', '600', '700'],
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
  preload: true,
  adjustFontFallback: true,
});

const poppins = Poppins({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-poppins',
});

// Critical CSS is now in critical.css file
// This reduces the amount of JavaScript in the initial bundle

// Import critical CSS as a string
import criticalCSS from '!!raw-loader!./critical.css';

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
};

export const metadata: Metadata = {
  title: 'Musa - Secure Access Control',
  description: 'Secure access control system for modern communities',
  keywords: ['security', 'access control', 'community', 'safety', 'visitor management'],
  authors: [{ name: 'Musa Security' }],
  creator: 'Musa Security',
  publisher: 'Musa Security',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://musa-security.vercel.app'),
  openGraph: {
    title: 'Musa - Secure Access Control',
    description: 'Secure access control system for modern communities',
    url: 'https://musa-security.vercel.app',
    siteName: 'Musa Security',
    locale: 'en_US',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Musa - Secure Access Control',
    description: 'Secure access control system for modern communities',
    creator: '@musasecurity',
  },
  icons: {
    icon: [
      { url: '/icons/icon-72x72.png', sizes: '72x72', type: 'image/png' },
      { url: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
      { url: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Musa Security',
  },
  other: {
    'msapplication-TileColor': '#ffffff',
    'msapplication-config': '/browserconfig.xml',
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <head>
        {/* Preload critical resources */}
        <link
          rel="preload"
          href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/_next/static/media/${inter.variable}.woff2`}
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/_next/static/media/${poppins.variable}.woff2`}
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        
        {/* Inline critical CSS */}
        <style dangerouslySetInnerHTML={{ __html: criticalCSS }} />
        
        {/* Preload critical images */}
        <link
          rel="preload"
          href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/images/logo.svg`}
          as="image"
          type="image/svg+xml"
        />
        
        {/* Google Analytics */}
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');
              `}
            </Script>
          </>
        )}
      </head>
      <body className={`${inter.variable} min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white`}>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        }>
          <LazyOptimizedLayout>
            {children}
            <MobileInitializer />
          </LazyOptimizedLayout>
        </Suspense>
        
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
            title="Google Tag Manager"
          />
        </noscript>
        
        {/* Environment variables */}
        <Script
          id="env-vars"
          dangerouslySetInnerHTML={{
            __html: getPublicEnvScript(),
          }}
          strategy="beforeInteractive"
        />
        
        {/* Performance monitoring */}
        <PerformanceMonitor />
      </body>
    </html>
  );
}
