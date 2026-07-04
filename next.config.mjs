// Content-Security-Policy
// - script-src: Meta Pixel 로더(connect.facebook.net) + 인라인 픽셀 부트스트랩('unsafe-inline')
// - connect-src: Supabase REST + Meta Pixel 전송(facebook.com)
// - img-src: noscript 픽셀/트래킹 비콘(facebook.com), data: (인라인 SVG 등)
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://connect.facebook.net",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "img-src 'self' data: https://www.facebook.com",
  "connect-src 'self' https://*.supabase.co https://www.facebook.com",
  "font-src 'self' data: https://cdn.jsdelivr.net",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspDirectives.join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
