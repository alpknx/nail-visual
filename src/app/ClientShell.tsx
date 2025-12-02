"use client";

import React, { useEffect } from "react";
import NextAuthProvider from "@/providers/NextAuthProvider";
import { ReactQueryClientProvider } from "@/lib/queryClient";
import { initPostHog } from "@/lib/analytics";
import { App } from "konsta/react";
import BottomNavbar from "@/components/BottomNavbar";

export default function ClientShell({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        initPostHog?.();

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
