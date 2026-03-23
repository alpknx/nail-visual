import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    compress: true, // Включить Gzip/Brotli компрессию
    poweredByHeader: false, // Убрать X-Powered-By header для безопасности
    productionBrowserSourceMaps: false, // Отключить source maps в продакшене (меньше размер)
        images: {
        remotePatterns: [
            { protocol: "https", hostname: "utfs.io", pathname: "/f/**" },
            { protocol: "https", hostname: "**.ufs.sh", pathname: "/f/**" },
            { protocol: "https", hostname: "i.pinimg.com", pathname: "/**" },
            { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
            { protocol: "https", hostname: "images.pexels.com", pathname: "/**" },
            { protocol: "https", hostname: "*.cdninstagram.com", pathname: "/**" },
            { protocol: "https", hostname: "scontent-*.xx.fbcdn.net", pathname: "/**" },
            { protocol: "https", hostname: "picsum.photos", pathname: "/**" },
        ],
        minimumCacheTTL: 60,
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    },
};

export default withNextIntl(nextConfig);
