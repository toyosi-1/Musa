import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import dynamic from 'next/dynamic';
import NonCriticalCSS from '@/components/layout/NonCriticalCSS';
import './globals.css';
import { getPublicEnvScript } from '@/utils/env';
import OptimizedLayout from '@/components/layout/OptimizedLayout';

// Lazy load non-critical components
const MobileInitializer = dynamic(() => import('@/components/layout/MobileInitializer'), {
  ssr: false
});

// Optimize font loading with variable fonts and better fallbacks
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
  preload: true,
  adjustFontFallback: true,
});

// Critical CSS for above-the-fold content
const criticalCSS = `
  /*! Critical CSS - Inlined for optimal performance */
  :root {
    --font-sans: var(--font-inter), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
    --bg-light: #f9fafb;
    --text-light: #111827;
    --bg-dark: #111827;
    --text-dark: #f9fafb;
  }
  
  /* Critical layout styles */
  *, *::before, *::after { box-sizing: border-box; }
  
  html {
    -webkit-text-size-adjust: 100%;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    font-size: 16px;
    line-height: 1.5;
    tab-size: 4;
    text-rendering: optimizeLegibility;
  }
  
  body {
    margin: 0;
    padding: 0;
    min-height: 100vh;
    font-family: var(--font-sans);
    background-color: var(--bg-light);
    color: var(--text-light);
    line-height: 1.5;
    overflow-x: hidden;
  }
  
  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    body {
      background-color: var(--bg-dark);
      color: var(--text-dark);
    }
  }
  
  /* Critical layout components */
  #__next {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }
  
  /* Improve readability and tap targets */
  a, button, input, textarea {
    -webkit-tap-highlight-color: transparent;
  }
`;

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

// Define type for preload assets
interface PreloadAsset {
  href: string;
  as: 'style' | 'font' | 'image';
  type?: string;
  crossOrigin?: 'anonymous' | 'use-credentials';
  imageSrcSet?: string;
  imageSizes?: string;
  'data-font-display'?: string;
}

// Preload critical assets
const preloadedAssets: PreloadAsset[] = [
  // Critical CSS
  { 
    href: '/_next/static/css/app/layout.css',
    as: 'style',
    crossOrigin: 'anonymous'
  },
  // Variable font with all weights
  { 
    href: '/_next/static/media/Inter.var.woff2',
    as: 'font',
    type: 'font/woff2',
    crossOrigin: 'anonymous',
    // Add font-display descriptor
    'data-font-display': 'swap'
  },
  // Preload hero image if exists
  // { 
  //   href: '/images/hero.jpg',
  //   as: 'image',
  //   imageSrcSet: '/images/hero-640.jpg 640w, /images/hero-1024.jpg 1024w, /images/hero-1280.jpg 1280w',
  //   imageSizes: '(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 1280px'
  // }
];

export const metadata: Metadata = {
  title: {
    default: 'Musa - Estate Access Control',
    template: '%s | Musa',
  },
  description: 'A seamless, fast, and user-friendly access control system for estates',
  generator: 'Next.js',
  keywords: ['estate', 'security', 'access control', 'pwa', 'nextjs'],
  authors: [{ name: 'Musa Team' }],
  creator: 'Musa Team',
  publisher: 'Musa',
  metadataBase: new URL('https://musa-security-app.windsurf.build'),
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
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
    // Apple touch icon for older iOS versions
    'apple-touch-icon': '/images/icon-180x180.png',
    'apple-touch-icon-sizes': '180x180',
    // Windows 8/10 tile
    'msapplication-TileImage': '/images/icon-144x144.png',
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
    <html 
      lang="en" 
      className={`${inter.variable} font-sans`}
      suppressHydrationWarning
    >
      <head>
        {/* Preload critical resources */}
        {preloadedAssets.map((asset, index) => (
          <link 
            key={index}
            rel="preload"
            href={asset.href}
            as={asset.as}
            type={asset.type}
            crossOrigin={asset.crossOrigin}
          />
        ))}
        
        {/* Inline critical CSS */}
        <style dangerouslySetInnerHTML={{ __html: criticalCSS }} />
        
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        
        {/* PWA and Mobile Web App Capabilities */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Musa" />
        
        {/* iOS specific meta tags */}
        <meta name="apple-touch-startup-image" content="/splash/launch-1242x2688.png" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <meta name="apple-touch-startup-image" content="/splash/launch-1125x2436.png" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <meta name="apple-touch-startup-image" content="/splash/launch-1242x2208.png" media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <meta name="apple-touch-startup-image" content="/splash/launch-750x1334.png" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        <meta name="apple-touch-startup-image" content="/splash/launch-640x1136.png" media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        
        {/* Format detection */}
        <meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no" />
        
        {/* Environment variables */}
        <Script
          id="env-script"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: getPublicEnvScript(),
          }}
        />
      </head>
      <body className="min-h-screen bg-musa-bg dark:bg-gray-900 text-gray-900 dark:text-white relative touch-manipulation overflow-x-hidden">
        <MobileInitializer />
        <OptimizedLayout>
          {children}
        </OptimizedLayout>
        
        {/* Load non-critical CSS asynchronously */}
        <NonCriticalCSS />
      </body>
    </html>
  );
}
