"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignInPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    if (session) {
        return (
            <div className="min-h-screen p-4 flex items-center justify-center">
                <div className="w-full max-w-md space-y-4 text-center">
                    <p className="text-sm text-muted-foreground">
                        Вы вошли как {session.user?.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Роль: {session.user?.role === "pro" ? "master" : session.user?.role}
                    </p>
                    <Button
                        variant="destructive"
                        onClick={() => signOut()}
                        className="w-full"
                    >
                        Выйти
                    </Button>
                </div>
            </div>
        );
    }

    // Загрузить сохраненный email при монтировании
    useEffect(() => {
        if (typeof window !== "undefined") {
            const savedEmail = localStorage.getItem("nail_visual_email");
            if (savedEmail) {
                setEmail(savedEmail);
                setRememberMe(true);
            }
        }
    }, []);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (!result?.ok) {
                setError(result?.error || "Неверные учетные данные");
                return;
            }

            // Сохранить email если выбрано "Запомнить меня"
            if (rememberMe && typeof window !== "undefined") {
                localStorage.setItem("nail_visual_email", email);
            } else if (typeof window !== "undefined") {
                localStorage.removeItem("nail_visual_email");
            }

            router.push("/");
        } catch {
            setError("Произошла ошибка");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen p-4 flex items-center justify-center bg-background">
            <div className="w-full max-w-md space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold">Вход</h1>
                    <p className="text-sm text-muted-foreground">
                        Войдите в свой аккаунт
                    </p>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
                    {error && (
                        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                            <p className="text-sm text-destructive font-medium">{error}</p>
                        </div>
                    )}

                    <div className="space-y-3">
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium">
                                Email
                            </label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                placeholder="your@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium">
                                Пароль
                            </label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                placeholder="Введите пароль"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full"
                            />
                        </div>
                    </div>

                    {/* Запомнить меня */}
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="remember"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                            Запомнить меня
                        </label>
                    </div>

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full"
                        size="lg"
                    >
                        {loading ? "Вход..." : "Войти"}
                    </Button>

                    <div className="text-center text-sm">
                        <span className="text-muted-foreground">Нет аккаунта? </span>
                        <button
                            type="button"
                            onClick={() => router.push("/signup")}
                            className="font-medium text-primary hover:underline"
                        >
                            Зарегистрироваться
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
