export { default } from "next-auth/middleware";

export const config = {
    matcher: ["/references/:path*", "/admin/:path*", "/pro/:path*"],
};
