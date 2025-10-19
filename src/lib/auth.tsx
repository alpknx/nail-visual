"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { uid } from "@/lib/uid";
import { posthog } from "@/lib/analytics";

type Role = "client" | "pro";
type AuthState = { userId: string; role: Role; setRole: (r: Role) => void };

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [userId, setUserId] = useState<string>("");
    const [role, setRole] = useState<Role>("pro"); // по умолчанию мастер на MVP

    useEffect(() => {
        const saved = localStorage.getItem("auth:userId");
        const r = (localStorage.getItem("auth:role") as Role) || "pro";
        if (saved) setUserId(saved);
        else {
            const id = `u_${uid()}`;
            localStorage.setItem("auth:userId", id);
            setUserId(id);
        }
        setRole(r);
    }, []);

    useEffect(() => {
        if (userId) posthog.identify(userId, { role });
    }, [userId, role]);

    const value = useMemo<AuthState>(() => ({ userId, role, setRole }), [userId, role]);
    if (!userId) return null; // короткий сплэш

    return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthCtx);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
