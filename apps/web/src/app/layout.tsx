import "./globals.css";
import ClientShell from "@/app/ClientShell";

export const metadata = {
    title: "Nail Visual",
    manifest: "/manifest.webmanifest",
    themeColor: "#0ea5e9",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="pl">
        <head>
            <link rel="manifest" href="/manifest.webmanifest" />
            <meta name="theme-color" content="#0ea5e9" />
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
            <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        </head>
        <body className="min-h-dvh bg-background text-foreground">
        <ClientShell>{children}</ClientShell>
        </body>
        </html>
    );
}
