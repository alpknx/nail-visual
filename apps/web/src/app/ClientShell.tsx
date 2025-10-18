"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import NextAuthProvider from "@/providers/NextAuthProvider";
import { ReactQueryClientProvider } from "@/lib/queryClient";
import { initPostHog } from "@/lib/analytics";
import { useSession, signOut } from "next-auth/react";

export default function ClientShell({ children }: { children: React.ReactNode }) {
    useEffect(() => { initPostHog?.(); }, []);

    return (
        <ReactQueryClientProvider>
            <NextAuthProvider>
                <TopBar />
                <main className="container mx-auto px-4 py-6">{children}</main>
            </NextAuthProvider>
        </ReactQueryClientProvider>
    );
}

function TopBar() {
    const { data: session, status } = useSession();
    const role = (session as any)?.role ?? "guest";

    return (
        <header className="border-b">
            <nav className="container mx-auto px-4 h-12 flex items-center gap-4">
                <Link href="/" className="font-semibold">Nail Visual</Link>
                <Link href="/works/new" className="text-sm opacity-80 hover:opacity-100">Загрузить работу</Link>
                <Link href="/references/new" className="text-sm opacity-80 hover:opacity-100">Хочу такой маникюр</Link>
                <Link href="/pros" className="text-sm opacity-80 hover:opacity-100">Мастера</Link>

                <div className="ml-auto flex items-center gap-3 text-sm">
                    <span className="opacity-70">Роль: <b>{role}</b></span>
                    {status === "authenticated" ? (
                        <button onClick={() => signOut({ callbackUrl: "/" })} className="underline">Выйти</button>
                    ) : (
                        <Link href="/signin" className="underline">Войти</Link>
                    )}
                </div>
            </nav>
        </header>
    );
}
