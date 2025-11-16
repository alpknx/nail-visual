import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { getProtectedPaths } from "@/config/protected-routes";
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
    const token = await getToken({ req: request });

    // Handle internationalization first
    const response = intlMiddleware(request);

    // If intlMiddleware already redirected, return it immediately
    if (response.status === 307 || response.status === 308) {
        return response;
    }

    // Get all protected paths (excluding locale prefix)
    const pathname = request.nextUrl.pathname;
    const locale = pathname.split('/')[1];
    
    // Skip if locale is not valid (shouldn't happen, but safety check)
    if (!routing.locales.includes(locale as any)) {
        return response;
    }
    
    const pathWithoutLocale = pathname.replace(`/${locale}`, '') || '/';
    
    const protectedPaths = getProtectedPaths();
    const isProtected = protectedPaths.some((path) =>
        pathWithoutLocale.startsWith(path)
    );

    // Redirect to signin if accessing protected route without authentication
    if (isProtected && !token) {
        const url = new URL(`/${locale}/signin`, request.url);
        url.searchParams.set("callbackUrl", pathWithoutLocale);
        return NextResponse.redirect(url);
    }

    return response;
}

export const config = {
    matcher: [
        // Match all pathnames except for
        // - … if they start with `/api`, `/_next` or `/_vercel`
        // - … the ones containing a dot (e.g. `favicon.ico`)
        '/((?!api|_next|_vercel|.*\\..*).*)',
        // Optional: only run on root (/) URL
        // '/'
    ],
};

