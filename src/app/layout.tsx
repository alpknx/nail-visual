import type { ReactNode } from "react";
import "./globals.css";

import ClientShell from "./ClientShell";

export const viewport = {
    themeColor: "#0ea5e9",
};

export const metadata = {
    title: "Nail Visual",
    description: "Поиск и отклики мастеров маникюра",
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
