/** @type {import('next').NextConfig} */
const path = require('path');
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV !== 'production', // Disable PWA in development
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    // Authentication routes should never be cached for security
    {
      urlPattern: ({ url }) => {
        const authPaths = [
          '/api/auth',
          '/login',
          '/register',
          '/reset-password',
          '/sign-in',
          '/sign-out',
          '/__/auth',
        ];
        
        return authPaths.some(path => 
          url.pathname.startsWith(path) || 
          url.pathname.includes('/auth/')
        );
      },
      handler: 'NetworkOnly',
      options: {
        cacheName: 'auth-cache',
      },
    },
    // Firebase API endpoints (always use network first to ensure fresh auth state)
    {
      urlPattern: ({ url }) => {
        return (
          url.hostname.includes('firebaseio.com') || 
          url.hostname.includes('googleapis.com') ||
          url.hostname.includes('firebase')
        );
      },
      handler: 'NetworkFirst',
      options: {
        cacheName: 'firebase-api-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60, // 1 hour
        },
        networkTimeoutSeconds: 10,
      },
    },
    // API routes (use network first with timeout fallback)
    {
      urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 5, // 5 minutes
        },
        networkTimeoutSeconds: 10,
      },
    },
    // Images can be cached aggressively
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
    // Google fonts can be cached for a long time
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
    // Default handler for everything else
    {
      urlPattern: /.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'default-cache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 60 * 60 * 24, // 1 day
        },
        networkTimeoutSeconds: 10,
      },
    },
  ],
});

const nextConfig = {
  // Core Next.js configurations
  reactStrictMode: true,
  swcMinify: true,
  
  // TypeScript and ESLint configurations
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Experimental features
  experimental: {
    // Enable server components external packages
    serverComponentsExternalPackages: ['firebase-admin'],
    // Enable app directory
    appDir: true,
    // Enable server actions
    serverActions: true,
  },
  // Static generation is now handled by Next.js App Router automatically
  // Add transpilePackages to handle problematic packages
  transpilePackages: ['undici', 'firebase', 'react-firebase-hooks'],
  // Ensure compatibility with older Node.js versions and proper Firebase handling
  webpack: (config, { isServer }) => {
    // Add path aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/lib/firebase': path.resolve(__dirname, 'src/lib/firebase.ts'),
      '@/lib': path.resolve(__dirname, 'src/lib'),
      '@': path.resolve(__dirname, 'src')
    };
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
  // Image optimization configuration
  images: {
    domains: ['firebasestorage.googleapis.com'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    // Disable image optimization during export
    unoptimized: true,
  },
  // Generate a static build ID for caching
  generateBuildId: async () => 'build',
  // Add compression
  compress: true,
  // Enable ETag generation for better caching
  generateEtags: true,
  // Disable X-Powered-By header for security
  poweredByHeader: false,
  // Enable React strict mode
  reactStrictMode: true,
  // Enable production browser source maps
  productionBrowserSourceMaps: false,
  // Add trailing slash for better SEO
  trailingSlash: true,
  // Add security headers
  devIndicators: {
    buildActivity: true,
    buildActivityPosition: 'bottom-right',
  },
  // Add experimental features
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
  },
  // Enable output file tracing for better optimization
  outputFileTracing: true,
};

module.exports = withPWA(nextConfig);
