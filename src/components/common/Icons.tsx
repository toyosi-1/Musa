'use client';

import Head from 'next/head';

export default function Icons() {
  return (
    <Head>
      {/* Preload critical icons */}
      <link
        rel="preload"
        href="/images/icon-192x192.png"
        as="image"
        type="image/png"
        sizes="192x192"
      />
      <link
        rel="preload"
        href="/images/icon-512x512.png"
        as="image"
        type="image/png"
        sizes="512x512"
      />

      {/* Favicons */}
      <link rel="icon" href="/favicon.ico" sizes="32x32" type="image/x-icon" />
      <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      
      {/* Apple Touch Icons */}
      <link rel="apple-touch-icon" href="/images/icon-180x180.png" sizes="180x180" />
      <link rel="apple-touch-icon" href="/images/icon-152x152.png" sizes="152x152" />
      
      {/* Standard Icons */}
      <link rel="icon" href="/images/icon-192x192.png" sizes="192x192" type="image/png" />
      <link rel="icon" href="/images/icon-512x512.png" sizes="512x512" type="image/png" />
      
      {/* Pinned Tab Icon */}
      <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#3b82f6" />
      
      {/* Microsoft Tiles */}
      <meta name="msapplication-TileColor" content="#3b82f6" />
      <meta name="msapplication-config" content="/browserconfig.xml" />
    </Head>
  );
}
