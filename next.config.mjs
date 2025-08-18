/** @type {import('next').NextConfig} */
const nextConfig = {
  swcMinify: false,
  compiler: {
    removeConsole: false,
  },
  experimental: {
    forceSwcTransforms: false,
  },
  experimental: { serverActions: { allowedOrigins: ['*'] } },
};
export default nextConfig;
