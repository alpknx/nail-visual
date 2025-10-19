import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { getProtectedPaths } from "@/config/protected-routes";

export async function middleware(request: NextRequest) {
    const token = await getToken({ req: request });

    // Get all protected paths
    const protectedPaths = getProtectedPaths();
    const isProtected = protectedPaths.some((path) =>
        request.nextUrl.pathname.startsWith(path)
    );

    // Redirect to signin if accessing protected route without authentication
    if (isProtected && !token) {
        const url = new URL("/signin", request.url);
        url.searchParams.set("callbackUrl", request.nextUrl.pathname);
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/references/:path*", "/admin/:path*", "/pro/:path*"],
};

