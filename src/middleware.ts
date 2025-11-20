import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { getProtectedPaths } from "@/config/protected-routes";
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;
    
    // Skip static files early - check for file extensions
    // This includes manifest.webmanifest, favicon.ico, etc.
    // This must happen BEFORE intlMiddleware to avoid authentication checks
    const staticFileExtensions = ['.webmanifest', '.ico', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.css', '.js', '.json', '.xml', '.txt', '.woff', '.woff2', '.ttf', '.eot', '.map'];
    const hasStaticExtension = staticFileExtensions.some(ext => pathname.endsWith(ext));
    
    // Also check for common static file paths (even if matcher didn't catch them)
    const isStaticFile = hasStaticExtension || 
                         pathname === '/manifest.webmanifest' ||
                         pathname === '/favicon.ico' ||
                         pathname.startsWith('/icons/') ||
                         pathname.startsWith('/images/');
    
    // Skip if it's a static file - let Next.js handle it without any processing
    if (isStaticFile) {
        return NextResponse.next();
    }
    
    // Handle internationalization
    const response = intlMiddleware(request);

    // If intlMiddleware already redirected, return it immediately
    if (response.status === 307 || response.status === 308) {
        return response;
    }

    // Get all protected paths (excluding locale prefix)
    const locale = pathname.split('/')[1];
    
    // Skip if locale is not valid (shouldn't happen, but safety check)
    if (!routing.locales.includes(locale as any)) {
        return response;
    }
    
    const pathWithoutLocale = pathname.replace(`/${locale}`, '') || '/';
    
    const protectedPaths = getProtectedPaths();
    const isProtected = protectedPaths.some((path) => {
        // Check if path exactly matches or starts with the protected path followed by '/' or end of string
        // This prevents /pros from matching /pro
        return pathWithoutLocale === path || 
               pathWithoutLocale.startsWith(path + '/');
    });

    // Only check authentication for protected routes
    if (isProtected) {
        const token = await getToken({ req: request });
        
        // Redirect to signin if accessing protected route without authentication
        if (!token) {
            const url = new URL(`/${locale}/signin`, request.url);
            url.searchParams.set("callbackUrl", pathWithoutLocale);
            return NextResponse.redirect(url);
        }
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - _vercel (Vercel internals)
         * - favicon.ico, manifest.webmanifest, and other static files
         * - files with extensions (images, fonts, etc.)
         */
        '/((?!api|_next/static|_next/image|_vercel|favicon.ico|manifest.webmanifest|.*\\.(?:ico|png|jpg|jpeg|gif|svg|css|js|json|xml|txt|woff|woff2|ttf|eot|map|webmanifest)).*)',
    ],
};

