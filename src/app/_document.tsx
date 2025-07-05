import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en" className="h-full">
      <Head>
        <meta name="application-name" content="Musa" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Musa" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#2B5797" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#000000" />
        
        {/* iOS specific */}
        <link rel="apple-touch-icon" href="/images/icon-180x180.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/images/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/images/icon-180x180.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/images/icon-152x152.png" />
        
        {/* Splash screens for iOS - using the largest icon as a fallback */}
        <link rel="apple-touch-startup-image" href="/images/icon-512x512.png" />
        
        {/* PWA related */}
        {/* Favicon and app icons */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="192x192" href="/images/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/images/icon-512x512.png" />
        
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.google-analytics.com" />
        
        {/* Preload critical resources */}
        <link rel="preload" href="/fonts/inter-var-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/static/css/app/layout.css" as="style" />
        <link rel="preload" href="/static/chunks/main-app.js" as="script" />
        
        {/* Ensure proper MIME type for CSS */}
        <link rel="stylesheet" href="/static/css/app/layout.css" type="text/css" media="all" />
      </Head>
      <body className="min-h-full bg-musa-bg dark:bg-gray-900 text-gray-900 dark:text-white">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
