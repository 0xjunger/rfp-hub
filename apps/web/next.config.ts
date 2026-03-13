import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@rfp-hub/schema', '@rfp-hub/sdk'],
};

export default nextConfig;
