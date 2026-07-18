"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, PropsWithChildren } from "react";

export function ReactQueryClientProvider({ children }: PropsWithChildren) {
    const [client] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000, // 1 minute
                gcTime: 5 * 60 * 1000, // 5 minutes
            },
        },
    }));
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
