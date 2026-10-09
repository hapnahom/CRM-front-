/**
 * When embedded in Core (`NEXT_PUBLIC_IS_CORE=true`), the app is served behind
 * the Core origin at `/business` via reverse proxy — Next must emit asset and
 * route URLs under that prefix.
 *
 * Standalone (`NEXT_PUBLIC_IS_CORE=false`, e.g. crm-test) is served at the host
 * root. A hardcoded `/business` basePath makes the browser request
 * `/business/_next/static/...`, which 404s as HTML and surfaces as
 * ChunkLoadError / "literal not terminated" SyntaxError on first load.
 */
const isCore =
  (process.env.NEXT_PUBLIC_IS_CORE ?? process.env.IS_CORE ?? '')
    .trim()
    .toLowerCase() === 'true';

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(isCore ? { basePath: '/business' } : {}),
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    esmExternals: false,
    optimizePackageImports: [
      'antd',
      '@ant-design/icons',
      'lucide-react',
      'react-icons',
      'react-icons/ai',
      'react-icons/cg',
      'react-icons/fi',
      'react-icons/hi',
      'react-icons/md',
    ],
  },
  images: {
    domains: [
      'cdn.prod.website-files.com',
      'files.ienetworks.co',
      'example.com',
    ],
  },
  env: {
    NEXT_PUBLIC_CRM_URL: process.env.NEXT_PUBLIC_CRM_URL,
    NEXT_PUBLIC_FILE_URL:
      process.env.NEXT_PUBLIC_FILE_URL ?? process.env.FILE_URL,
    NOTIFICATION_URL: process.env.NOTIFICATION_URL,
    EMAIL_URL: process.env.EMAIL_URL,
  },
};

export default nextConfig;
