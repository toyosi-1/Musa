/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Add transpilePackages to handle undici and other problematic packages
  transpilePackages: ['undici'],
  // Ensure compatibility with older Node.js versions
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, stream: false };
    return config;
  },
};

module.exports = nextConfig;
