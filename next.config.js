/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Disable server request logging for cleaner terminal output
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  onDemandEntries: {
    // Keep pages in memory for longer to reduce rebuilds
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 5,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig 