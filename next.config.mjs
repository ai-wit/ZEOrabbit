/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/admin/reward/product-orders",
        destination: "/admin/reward/campaigns",
        permanent: false
      },
      {
        source: "/admin/reward/product-orders/:path*",
        destination: "/admin/reward/campaigns",
        permanent: false
      }
    ];
  }
};

export default nextConfig;


