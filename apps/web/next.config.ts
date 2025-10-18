import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            // UploadThing CDN
            { protocol: "https", hostname: "utfs.io", pathname: "/f/**" },
            { protocol: "https", hostname: "**.ufs.sh", pathname: "/f/**" },

            // (опционально, если планируешь) Pinterest / Unsplash / Instagram
            { protocol: "https", hostname: "i.pinimg.com", pathname: "/**" },
            { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
            { protocol: "https", hostname: "*.cdninstagram.com", pathname: "/**" },
            { protocol: "https", hostname: "scontent-*.xx.fbcdn.net", pathname: "/**" },
        ],
        domains: ["utfs.io", "uploadthing.com"],
    },
    // если Next ругается на корень воркспейса — можешь явно указать:
    // experimental: { turbopack: { root: "../../" } },
};

export default nextConfig;
