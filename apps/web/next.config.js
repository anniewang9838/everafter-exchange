/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: require('path').join(__dirname, '../../'),
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.amazonaws.com' },
    ],
  },
}

module.exports = nextConfig
