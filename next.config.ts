import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['@simplewebauthn/browser', '@simplewebauthn/server'],
  },
}