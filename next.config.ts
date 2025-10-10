import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: {
    // Enable strict TypeScript checking
    tsconfigPath: './tsconfig.json',
  },
  eslint: {
    dirs: ['app', 'components', 'lib', 'types'],
  },
}

export default nextConfig
