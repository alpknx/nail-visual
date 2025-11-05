"use client";

import React, { useEffect } from "react";
import NextAuthProvider from "@/providers/NextAuthProvider";
import { ReactQueryClientProvider } from "@/lib/queryClient";
import { initPostHog } from "@/lib/analytics";
import BurgerMenu from "@/components/BurgerMenu";
import PinterestMeta from "@/components/PinterestMeta";

export default function ClientShell({ children }: { children: React.ReactNode }) {
    useEffect(() => { initPostHog?.(); }, []);

    return (
        <ReactQueryClientProvider>
            <NextAuthProvider>
                <PinterestMeta />
                <BurgerMenu>
                    <main className="min-h-screen">{children}</main>
                </BurgerMenu>
            </NextAuthProvider>
        </ReactQueryClientProvider>
    );
}
