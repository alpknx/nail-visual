import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";

export const viewport = {
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: "Nail Visual",
  description: "Search and responses from nail art masters",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
    title: "Nail Visual",
  },
  other: {
    "p:domain_verify": "db57b5002e17eb5680785647002de0b9",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black",
    "apple-mobile-web-app-title": "Nail Visual",
    "theme-color": "#ffffff",
  },
};

// Root layout - locale handling is done by middleware
// The actual locale-specific layout is in [locale]/layout.tsx
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html suppressHydrationWarning lang="en">
      <body className="min-h-dvh bg-background text-foreground flex flex-col">
        {children}
      </body>
    </html>
  );
}
