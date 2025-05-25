
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.mtr.com.hk',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'wikrlnhtnqrggkabmamu.supabase.co', // Supabase storage hostname
        port: '',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;
