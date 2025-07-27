/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['webapi.amap.com'],
  },
  // 服务器组件外部包配置
  experimental: {
    serverComponentsExternalPackages: ['pg'],
  },
  output: 'standalone',
}

module.exports = nextConfig