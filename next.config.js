/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  transpilePackages: ['jspdf', 'jspdf-autotable'],
}

module.exports = nextConfig
