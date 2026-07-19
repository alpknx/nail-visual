"use client";

import React, { useEffect } from "react";
import NextAuthProvider from "@/providers/NextAuthProvider";
import { ReactQueryClientProvider } from "@/lib/queryClient";
import BottomNavbar from "@/components/BottomNavbar";

// NOTE: `<App>` is intentionally kept as a static import here — see below.
//
// `konsta/react`'s only entry point is a single barrel file that eagerly
// imports all ~68 components, so `import { App } from "konsta/react"` pulls
// in the whole barrel's JS. konsta's App component itself is trivial enough
// to make a flash-free `next/dynamic` fallback possible in principle: for
// theme="ios" (not "parent") it just renders
// `<div className="k-ios k-app w-full h-full min-h-screen relative safe-areas">`
// (see konsta/react/components/App.js + shared/classes/AppClasses.js) wrapped
// in a context provider with no DOM output of its own, and none of that
// className's CSS is gated on the JS chunk (konsta/react/theme.css is
// statically imported in globals.css) — so a static placeholder div with the
// same classes would be pixel-identical at first paint.
//
// That was tried (`dynamic(() => import("konsta/react").then(m => m.App))`)
// and reverted: konsta@5.0.6's package.json `exports["./react"]` only
// declares an `"import"` condition, and its internal source uses
// extensionless relative imports (e.g. `from '../shared/cls'`, not
// `'../shared/cls.js'`), which are invalid under strict ESM resolution.
// Next's webpack build resolves the *static* top-level `import` leniently
// (bundler-style resolution) but fails to resolve the *dynamic* `import()`
// used by `next/dynamic`'s code-splitting path with
// "Module not found: Package path ./react is not exported from package
// konsta (see exports field in .../konsta/package.json)". This reproduces
// consistently and is a konsta packaging issue, not fixable from this file.
//
// Separately, even if it did resolve: `BottomNavbar` (rendered below, also
// statically imported here) itself does
// `import { Tabbar, TabbarLink, Icon } from "konsta/react"` at module scope,
// so the barrel would still be reachable synchronously through BottomNavbar
// regardless of whether `App` were dynamic — a real win would require
// dynamic-importing BottomNavbar too.
import { App } from "konsta/react";

export default function ClientShell({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        import("@/lib/analytics").then(({ initPostHog }) => initPostHog?.());

        // Set theme-color meta tag dynamically
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', '#ffffff');
        } else {
            const meta = document.createElement('meta');
            meta.name = 'theme-color';
            meta.content = '#ffffff';
            document.head.appendChild(meta);
        }

        // Set Apple status bar style
        const appleStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
        if (appleStatusBar) {
            appleStatusBar.setAttribute('content', 'black-translucent');
        } else {
            const meta = document.createElement('meta');
            meta.name = 'apple-mobile-web-app-status-bar-style';
            meta.content = 'black-translucent';
            document.head.appendChild(meta);
        }

        // Add Apple Touch Icon if not present
        let appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]');
        if (!appleTouchIcon) {
            appleTouchIcon = document.createElement('link');
            appleTouchIcon.setAttribute('rel', 'apple-touch-icon');
            appleTouchIcon.setAttribute('href', '/icons/icon-512.png');
            appleTouchIcon.setAttribute('sizes', '180x180');
            document.head.appendChild(appleTouchIcon);
        }

        // Lock screen orientation to portrait
        if (typeof window !== 'undefined' && 'screen' in window && 'orientation' in window.screen) {
            try {
                // Use Screen Orientation API if available
                if ('lock' in window.screen.orientation) {
                    (window.screen.orientation.lock as (orientation: string) => Promise<void>)('portrait').catch((err) => {
                        // Lock may fail if not in fullscreen or user gesture required
                        console.log('Orientation lock not available:', err);
                    });
                }
            } catch (e) {
                console.log('Screen Orientation API not supported');
            }
        }

        // Prevent zoom on input focus
        const preventZoom = (e: Event) => {
            const target = e.target as HTMLElement;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
                // Ensure font size is at least 16px to prevent zoom on iOS
                const computedStyle = window.getComputedStyle(target);
                const fontSize = parseFloat(computedStyle.fontSize);
                if (fontSize < 16) {
                    target.style.fontSize = '16px';
                }
            }
        };

        // Add event listeners to prevent zoom
        document.addEventListener('focusin', preventZoom);
        document.addEventListener('touchstart', preventZoom, { passive: true });

        // Register Service Worker for PWA
        if ('serviceWorker' in navigator && typeof window !== 'undefined') {
            window.addEventListener('load', () => {
                navigator.serviceWorker
                    .register('/sw.js', { scope: '/' })
                    .then((registration) => {
                        console.log('Service Worker registered successfully:', registration.scope);
                    })
                    .catch((error) => {
                        console.error('Service Worker registration failed:', error);
                    });
            });
        }

        return () => {
            document.removeEventListener('focusin', preventZoom);
            document.removeEventListener('touchstart', preventZoom);
        };
    }, []);

    return (
        <ReactQueryClientProvider>
            <NextAuthProvider>
                <App theme="ios" safeAreas>
                    {children}
                    <BottomNavbar />
                </App>
            </NextAuthProvider>
        </ReactQueryClientProvider>
    );
}
