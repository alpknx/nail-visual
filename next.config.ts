import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from "@sentry/nextjs";
import path from "path";

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    compress: true, // Включить Gzip/Brotli компрессию
    poweredByHeader: false, // Убрать X-Powered-By header для безопасности
    productionBrowserSourceMaps: false, // Отключить source maps в продакшене (меньше размер)
    // A second pnpm-lock.yaml exists one directory up (the outer git
    // worktree checkout), which makes Next.js infer the wrong workspace
    // root for output file tracing - the mechanism that decides which
    // files (including sharp's native .node binary) get bundled into each
    // Vercel serverless function. Pin it explicitly so sharp (added for
    // upload-time blur placeholders) actually ships with the function.
    outputFileTracingRoot: path.join(__dirname),
    // sharp has a native binding - keep it external instead of letting
    // webpack/Turbopack try to bundle it, which is the standard fix for
    // "works locally, breaks on Vercel" native-module issues.
    serverExternalPackages: ["sharp"],
        images: {
        // AVIF first - typically 30-50% smaller than WebP for photos, which
        // is most of what this app serves (portfolio/reference images).
        formats: ["image/avif", "image/webp"],
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

export default withSentryConfig(withNextIntl(nextConfig), {
    // Suppresses source map upload logs during build.
    silent: true,

    // Sentry org/project used for source map uploads at build time. These
    // are only required when SENTRY_AUTH_TOKEN is set (e.g. in CI); without
    // a token, the build-time Sentry plugin skips source map upload and the
    // app still builds normally.
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,

    // This app doesn't use Session Replay - exclude its code from the
    // client bundle instead of shipping it dead.
    bundleSizeOptimizations: {
        excludeDebugStatements: true,
        excludeReplayShadowDom: true,
        excludeReplayIframe: true,
        excludeReplayWorker: true,
    },
});
