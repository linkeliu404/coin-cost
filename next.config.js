/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ["assets.coingecko.com"],
  },
  webpack: (config, { isServer }) => {
    // 让webpack处理更友好的路径解析
    config.resolve.fallback = { fs: false };
    config.resolve.alias = {
      ...config.resolve.alias,
      "@/components": "src/components",
      "@/lib": "src/lib",
      "@/hooks": "src/hooks",
    };
    return config;
  },
};

module.exports = nextConfig;
