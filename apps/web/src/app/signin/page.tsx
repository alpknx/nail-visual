"use client";
import { signIn, signOut, useSession } from "next-auth/react";
import { useState } from "react";

export default function SignInPage() {
    const { data: session } = useSession();
    const [email, setEmail] = useState("");

    if (session) {
        return (
            <div className="p-6">
                <p>Вы вошли как {session.user?.email} (роль: {(session as any).role})</p>
                <button className="underline" onClick={() => signOut()}>Выйти</button>
            </div>
        );
    }

    return (
        <div className="p-6 flex gap-2">
            <input
                className="border px-2 py-1 rounded"
                placeholder="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
            <button
                className="underline"
                onClick={() => signIn("credentials", { email, callbackUrl: "/" })}
            >
                Войти
            </button>
        </div>
    );
}
