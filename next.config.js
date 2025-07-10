/** @type {import('next').NextConfig} */
const path = require('path');
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
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
  // Core Next.js configurations
  reactStrictMode: true,
  swcMinify: true,
  
  // Performance optimizations
  staticPageGenerationTimeout: 300,
  output: 'standalone',
  
  // Optimize font loading
  optimizeFonts: true,
  
  // Experimental features
  experimental: {
    optimizePackageImports: ['@mui/material', '@emotion/styled', '@emotion/react'],
    // Server Actions are enabled by default in Next.js 14+
  },
  
  webpack: (config, { isServer, dev, isServer: isServerParam }) => {
    // Enable Webpack 5's filesystem caching in development
    if (!dev) {
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      };
    }
    
    // Configure optimization for production only
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        concatenateModules: true,
        sideEffects: true,
        minimize: true,
        minimizer: ['...'],
      };
    }
    
    config.resolve.fallback = {
      ...config.resolve.fallback,
      stream: require.resolve('stream-browserify'),
      crypto: require.resolve('crypto-browserify'),
      buffer: require.resolve('buffer/'),
      util: require.resolve('util/'),
      url: require.resolve('url/'),
      querystring: require.resolve('querystring-es3/'),
      path: require.resolve('path-browserify'),
      os: require.resolve('os-browserify/browser'),
      net: false,
      tls: false,
      fs: false,
      child_process: false,
      dns: false,
      http2: false,
      zlib: false,
    };
    
    config.plugins.push(
      new (require('webpack').ProvidePlugin)({
        process: 'process/browser',
        Buffer: ['buffer', 'Buffer'],
      })
    );
    
    return config;
  },
  
  images: {
    domains: ['firebasestorage.googleapis.com'],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 1 week
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
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
            value: 'SAMEORIGIN',
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
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
  
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  httpAgentOptions: {
    keepAlive: true,
  },
  
  env: {
    NEXT_PUBLIC_APP_ENV: process.env.NODE_ENV,
  },
};

// Generate a static build ID for caching
nextConfig.generateBuildId = async () => {
  try {
    const { execSync } = require('child_process');
    return execSync('git rev-parse HEAD').toString().trim();
  } catch (error) {
    return Date.now().toString();
  }
};

module.exports = withPWA(nextConfig);
