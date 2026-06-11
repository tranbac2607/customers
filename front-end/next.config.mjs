/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['antd', '@ant-design/icons', 'lodash'],
  },
  transpilePackages: ['antd', '@ant-design/icons', 'rc-util', 'rc-pagination', 'rc-picker'],
};

export default nextConfig;
