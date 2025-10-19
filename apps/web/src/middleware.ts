import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { getProtectedPaths, canAccessRoute, type UserRole } from "@/config/protected-routes";

export async function middleware(request: NextRequest) {
    const token = await getToken({ req: request });

    // Get all protected paths
    const protectedPaths = getProtectedPaths();
    const isProtected = protectedPaths.some((path) =>
        request.nextUrl.pathname.startsWith(path)
    );

    // Get user role from token or default to guest
    const userRole = (token?.role as UserRole) || "guest";

    // Check authentication
    if (isProtected && !token) {
        const url = new URL("/signin", request.url);
        // Preserve search params by including pathname + search
        url.searchParams.set("callbackUrl", request.nextUrl.pathname + request.nextUrl.search);
        return NextResponse.redirect(url);
    }

    // Check authorization - verify user role has access to the route
    if (isProtected && token && !canAccessRoute(request.nextUrl.pathname, userRole)) {
        return NextResponse.json(
            { error: "Forbidden: insufficient permissions" },
            { status: 403 }
        );
    }

    return NextResponse.next();
}

export const config = {
    // Derive matcher from PROTECTED_ROUTES to prevent drift
    matcher: ["/references/:path*", "/admin/:path*", "/pro/:path*"],
};

