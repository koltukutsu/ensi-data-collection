/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'utfs.io',
        port: ''
      },
      {
        protocol: 'https',
        hostname: 'api.slingacademy.com',
        port: ''
      }
    ],
    domains: [
      'firebasestorage.googleapis.com',
      'storage.googleapis.com',
      'localhost'
    ]
  },
  transpilePackages: ['geist']
};

module.exports = nextConfig;
