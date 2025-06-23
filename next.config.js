/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Add transpilePackages to handle problematic packages
  transpilePackages: ['undici', 'firebase', 'react-firebase-hooks'],
  // Ensure compatibility with older Node.js versions and proper Firebase handling
  webpack: (config, { isServer }) => {
    // Browser-specific polyfills for Firebase
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        stream: false,
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
    
    // Add module rule to handle Firebase properly
    config.module.rules.push({
      test: /\.m?js$/,
      exclude: /node_modules/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['next/babel'],
        },
      },
    });

    return config;
  },
};

module.exports = nextConfig;
