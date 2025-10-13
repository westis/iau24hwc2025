import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: {
    // Enable strict TypeScript checking
    tsconfigPath: './tsconfig.json',
  },
  eslint: {
    dirs: ['app', 'components', 'lib', 'types'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.albi24h.fr',
        pathname: '/wp-content/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'cxvlndgqwlpeddupqpuf.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default nextConfig
