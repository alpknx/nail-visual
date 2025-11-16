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
    useEffect(() => { initPostHog?.(); }, []);

    return (
        <ReactQueryClientProvider>
            <NextAuthProvider>
                <GeolocationProvider>
                    <PinterestMeta />
                    <PWARegister />
                    <GeolocationWarning />
                    <BurgerMenu>
                        <main className="min-h-screen p-2">{children}</main>
                    </BurgerMenu>
                </GeolocationProvider>
            </NextAuthProvider>
        </ReactQueryClientProvider>
    );
}
