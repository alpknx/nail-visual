import type { ReactNode } from "react";
import "./globals.css";

// серверный layout может импортировать клиентский компонент
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
        <body className="min-h-dvh bg-background text-foreground">
        <ClientShell>{children}</ClientShell>
        </body>
        </html>
    );
}
