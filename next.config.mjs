/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // API 라우트의 body 크기 제한을 10MB로 설정
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
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


