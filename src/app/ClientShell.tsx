"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import NextAuthProvider from "@/providers/NextAuthProvider";
import { ReactQueryClientProvider } from "@/lib/queryClient";
import { initPostHog } from "@/lib/analytics";
import { useSession, signOut } from "next-auth/react";
import { useClient } from "@/hooks/useClient";

export default function ClientShell({ children }: { children: React.ReactNode }) {
    useEffect(() => { initPostHog?.(); }, []);

    return (
        <ReactQueryClientProvider>
            <NextAuthProvider>
                <TopBar />
                <main className="flex-1 container mx-auto px-4 py-6">{children}</main>
            </NextAuthProvider>
        </ReactQueryClientProvider>
    );
}

function TopBar() {
    const { data: session, status } = useSession();
    const mounted = useClient();

    const role = (session)?.user?.role ?? "guest";
    const isMaster = role === "pro" || role === "admin";
    const isClient = role === "client" || role === "admin";

    return (
        <header className="border-b">
            <nav className="container mx-auto px-4 h-12 flex items-center gap-4">
                <Link href="/" className="font-semibold">Nail Visual</Link>
                {mounted && isMaster && (
                    <Link href="/works/new" className="text-sm opacity-80 hover:opacity-100">Загрузить работу</Link>
                )}
                {mounted && isClient && (
                    <Link href="/references/new" className="text-sm opacity-80 hover:opacity-100">Хочу такой маникюр</Link>
                )}
                <Link href="/pros" className="text-sm opacity-80 hover:opacity-100">Мастера</Link>

                <div className="ml-auto flex items-center gap-3 text-sm">
                    {status === "authenticated" ? (
                        <>
                            <span className="opacity-70">{session?.user?.email}</span>
                            <span className="opacity-70">Роль: <b>{role}</b></span>
                            {mounted && isMaster && (
                                <Link href="/pro/orders" className="underline hover:opacity-80">Заказы</Link>
                            )}
                            <Link href={role === "pro" ? "/pro/profile" : "/profile"} className="underline hover:opacity-80">Профиль</Link>
                            <button onClick={() => signOut({ callbackUrl: "/" })} className="underline">Выйти</button>
                        </>
                    ) : (
                        <>
                            <span className="opacity-70">Роль: <b>{role}</b></span>
                            <Link href="/signin" className="underline">Войти</Link>
                        </>
                    )}
                </div>
            </nav>
        </header>
    );
}
