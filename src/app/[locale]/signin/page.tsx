"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useState, FormEvent, useEffect } from "react";
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignInPage() {
    const t = useTranslations('auth.signIn');
    const tCommon = useTranslations('common');
    const { data: session } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

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
                setError(result?.error || t('invalidCredentials'));
                return;
            }

            // Сохранить email если выбрано "Запомнить меня"
            if (rememberMe && typeof window !== "undefined") {
                localStorage.setItem("nail_visual_email", email);
            } else if (typeof window !== "undefined") {
                localStorage.removeItem("nail_visual_email");
            }

            // Перенаправить на callbackUrl или на главную страницу
            const callbackUrl = searchParams.get('callbackUrl') || '/';
            router.push(callbackUrl);
        } catch {
            setError(t('error'));
        } finally {
            setLoading(false);
        }
    };

    if (session) {
        return (
            <div className="min-h-screen p-4 flex items-center justify-center">
                <div className="w-full max-w-md space-y-4 text-center">
                    <p className="text-sm text-muted-foreground">
                        {t('signedInAs')} {session.user?.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {tCommon('role')}: {session.user?.role === "pro" ? tCommon('rolePro') :
                                            session.user?.role === "client" ? tCommon('roleClient') :
                                            session.user?.role === "admin" ? tCommon('roleAdmin') :
                                            tCommon('roleGuest')}
                    </p>
                    <Button
                        variant="destructive"
                        onClick={async () => {
                            await signOut({ redirect: false });
                            router.push('/signin');
                        }}
                        className="w-full"
                    >
                        {t('signOut')}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 flex items-center justify-center bg-background">
            <div className="w-full max-w-md space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold">{t('title')}</h1>
                    <p className="text-sm text-muted-foreground">
                        {t('subtitle')}
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
                                {t('email')}
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
                                {t('password')}
                            </label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                placeholder={t('password')}
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
                            {t('rememberMe')}
                        </label>
                    </div>

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full"
                        size="lg"
                    >
                        {loading ? t('submitting') : t('submit')}
                    </Button>

                    <div className="text-center text-sm">
                        <span className="text-muted-foreground">{t('noAccount')} </span>
                        <button
                            type="button"
                            onClick={() => router.push("/signup")}
                            className="font-medium text-primary hover:underline"
                        >
                            {t('register')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
