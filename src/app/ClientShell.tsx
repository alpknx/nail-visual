"use client";

import React, { useEffect } from "react";
import NextAuthProvider from "@/providers/NextAuthProvider";
import { ReactQueryClientProvider } from "@/lib/queryClient";
import { initPostHog } from "@/lib/analytics";
import { GeolocationProvider } from "@/contexts/GeolocationContext";
import BurgerMenu from "@/components/BurgerMenu";
import PinterestMeta from "@/components/PinterestMeta";
import PWARegister from "@/components/PWARegister";
import GeolocationWarning from "@/components/GeolocationWarning";

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
            appleStatusBar.setAttribute('content', 'black');
        } else {
            const meta = document.createElement('meta');
            meta.name = 'apple-mobile-web-app-status-bar-style';
            meta.content = 'black';
            document.head.appendChild(meta);
        }
    }, []);

    return (
        <ReactQueryClientProvider>
            <NextAuthProvider>
                <GeolocationProvider>
                    <PinterestMeta />
                    <PWARegister />
                    <GeolocationWarning />
                    <BurgerMenu>
                        <main className="flex-1 p-2">{children}</main>
                    </BurgerMenu>
                </GeolocationProvider>
            </NextAuthProvider>
        </ReactQueryClientProvider>
    );
}
