import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";

import ClientShell from "./ClientShell";

export const viewport = {
    themeColor: "#0ea5e9",
};

export const metadata: Metadata = {
    title: "Nail Visual",
    description: "Поиск и отклики мастеров маникюра",
    other: {
        "p:domain_verify": "db57b5002e17eb5680785647002de0b9",
    },
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="ru">
        <body className="min-h-dvh bg-background text-foreground flex flex-col">
        <ClientShell>{children}</ClientShell>
        </body>
        </html>
    );
}
