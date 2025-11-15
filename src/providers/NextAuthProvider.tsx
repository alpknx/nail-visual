"use client";
import { SessionProvider } from "next-auth/react";
import React from "react";

export default function NextAuthProvider({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider
            refetchInterval={5 * 60} // Обновлять сессию каждые 5 минут
            refetchOnWindowFocus={true} // Обновлять при фокусе на окне
        >
            {children}
        </SessionProvider>
    );
}
