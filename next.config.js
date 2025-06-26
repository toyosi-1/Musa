/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: false, // Enable PWA in development for testing
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https?:\/\/.*\.(png|jpg|jpeg|svg|gif|webp|ico)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: {
          maxEntries: 1000,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    {
      urlPattern: /^https?:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-cache',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
      },
    },
  ],
});

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Disable static optimization for these pages
  output: 'standalone',
  // Configure page configurations for static generation
  experimental: {
    // This will handle the dynamic routes that can't be statically generated
    // and will properly export them as serverless functions
    serverComponentsExternalPackages: ['firebase-admin'],
  },
  // Configure page configurations for static generation
  exportPathMap: async function() {
    return {
      '/': { page: '/' },
      '/_error': { page: '/_error' },
      // Add other static pages here
    };
  },
  // Add transpilePackages to handle problematic packages
  transpilePackages: ['undici', 'firebase', 'react-firebase-hooks'],
  // Ensure compatibility with older Node.js versions and proper Firebase handling
  webpack: (config, { isServer }) => {
    // Browser-specific polyfills for Firebase
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        // Fixes npm packages that depend on `stream` module
        stream: require.resolve('stream-browserify'),
        // Fixes npm packages that depend on `crypto` module
        crypto: require.resolve('crypto-browserify'),
        // Fixes npm packages that depend on `buffer` module
        buffer: require.resolve('buffer/'),
        // Fixes npm packages that depend on `util` module
        util: require.resolve('util/'),
        // Fixes npm packages that depend on `url` module
        url: require.resolve('url/'),
        // Fixes npm packages that depend on `querystring` module
        querystring: require.resolve('querystring-es3/'),
        // Fixes npm packages that depend on `path` module
        path: require.resolve('path-browserify'),
        // Fixes npm packages that depend on `os` module
        os: require.resolve('os-browserify/browser'),
        // Fixes npm packages that depend on `net` module
        net: false,
        // Fixes npm packages that depend on `tls` module
        tls: false,
        // Fixes npm packages that depend on `fs` module
        fs: false,
        // Fixes npm packages that depend on `child_process` module
        child_process: false,
        // Fixes npm packages that depend on `dns` module
        dns: false,
        // Fixes npm packages that depend on `http2` module
        http2: false,
        // Fixes npm packages that depend on `zlib` module
        zlib: false,
        crypto: false,
        fs: false,
        os: false,
        path: false,
        net: false,
        tls: false,
        child_process: false,
        http: false,
        https: false,
        zlib: false
      };
    }
    
    // Force Firebase to be excluded from server bundle
    if (isServer) {
      config.externals = [...config.externals, 'firebase', 'firebase/app', 'firebase/auth', 'firebase/database'];
    }

    // Improve cache handling
    if (!config.cache) config.cache = {};
    config.cache.type = 'filesystem';
    config.cache.buildDependencies = {
      config: [__filename]
    };
    
    // Enable source maps in development for better debugging
    if (!isServer) {
      config.devtool = 'source-map';
    }

    return config;
  },
  // Add security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  // Add image optimization
  images: {
    domains: ['firebasestorage.googleapis.com'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    // Disable image optimization during export
    unoptimized: process.env.NODE_ENV === 'production',
  },
  // Skip type checking during build to speed up the process
  typescript: {
    ignoreBuildErrors: true,
  },
  // Skip linting during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable static optimization for these pages
  generateBuildId: async () => 'build',
  // Add compression
  compress: true,
  // Add ETag generation
  generateEtags: true,
  // Add trailing slash for better SEO
  trailingSlash: true,
  // Add production browser source maps
  productionBrowserSourceMaps: false,
  // Add powered by header
  poweredByHeader: false,
  // Add security headers
  devIndicators: {
    buildActivity: true,
    buildActivityPosition: 'bottom-right',
  },
  // Add experimental features
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
    legacyBrowsers: false,
  },
  // Add public directory
  output: 'standalone',
  // Add output file tracing
  outputFileTracing: true,
  // Add static export
  output: 'export',
};

module.exports = withPWA(nextConfig);
