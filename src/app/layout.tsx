import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Suspense, useEffect } from 'react';
import Script from 'next/script';
import './globals.css';
import AuthWrapper from '@/components/auth/AuthWrapper';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { getPublicEnvScript } from '@/utils/env';
import { isMobileDevice } from '@/utils/mobileUtils';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

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
      { url: '/images/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/images/icon-180x180.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/safari-pinned-tab.svg',
        color: '#3b82f6',
      },
    ],
  },
  manifest: '/manifest.json',
  other: {
    'msapplication-TileColor': '#3b82f6',
    'msapplication-config': '/browserconfig.xml',
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'Musa',
  },
};

// Client component to handle mobile-specific initializations
function MobileInitializer() {
  useEffect(() => {
    const html = document.documentElement;
    const isMobile = isMobileDevice();
    
    // Add mobile class to HTML element
    if (isMobile) {
      html.classList.add('is-mobile');
      
      // Add touch-action manipulation for better scrolling
      document.body.style.touchAction = 'manipulation';
    }

    // Handle viewport height for mobile browsers
    const setAppHeight = () => {
      if (typeof window !== 'undefined') {
        // Get the viewport height and multiple it by 1% to get a value for a vh unit
        const vh = window.innerHeight * 0.01;
        // Set the value in the --vh custom property to the root of the document
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        
        // Add a class when the virtual keyboard is visible (only for mobile)
        if (isMobile) {
          const isKeyboardVisible = window.innerHeight < window.outerHeight * 0.8;
          html.classList.toggle('keyboard-visible', isKeyboardVisible);
        }
      }
    };

    // Set initial height
    setAppHeight();

    // Add event listeners
    const events = ['resize', 'orientationchange', 'focusin', 'focusout'];
    events.forEach(event => {
      window.addEventListener(event, setAppHeight, { passive: true });
    });
    
    // Handle iOS viewport height changes
    if (isIOS()) {
      // iOS viewport height fix
      const iOSViewportHeight = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      };
      
      // Listen for the virtual keyboard events
      window.visualViewport?.addEventListener('resize', iOSViewportHeight);
      
      // Cleanup iOS specific listeners
      return () => {
        window.visualViewport?.removeEventListener('resize', iOSViewportHeight);
        events.forEach(event => {
          window.removeEventListener(event, setAppHeight);
        });
      };
    }
    
    // Cleanup for non-iOS devices
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, setAppHeight);
      });
    };
  }, []);

  return null;
}

// Helper function to detect iOS
export function isIOS() {
  if (typeof window === 'undefined') return false;
  return [
    'iPad Simulator',
    'iPhone Simulator',
    'iPod Simulator',
    'iPad',
    'iPhone',
    'iPod'
  ].includes(navigator.platform) ||
  (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html 
      lang="en" 
      className={`${inter.variable} font-sans`}
      style={{
        '--vh': '1vh', // CSS variable for viewport height
        height: '100%',
        overflow: 'hidden',
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
      </head>
      <body className="min-h-screen bg-musa-bg dark:bg-gray-900 text-gray-900 dark:text-white relative overflow-x-hidden touch-manipulation" style={{
        WebkitOverflowScrolling: 'touch',
        overscrollBehaviorY: 'none',
        height: '100%',
        width: '100%',
        position: 'fixed',
        overflow: 'hidden',
      }}>
        <MobileInitializer />
        <ThemeProvider>
          <AuthWrapper>
            <Suspense fallback={<LoadingScreen />}>
              <div className="min-h-[calc(var(--vh,1vh)*100)] flex flex-col">
                {children}
              </div>
            </Suspense>
          </AuthWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
