"use client";

import { signIn } from "next-auth/react";
import { useState, FormEvent } from "react";
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SignUpPage() {
    const t = useTranslations('auth.signUp');
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [role, setRole] = useState<"client" | "pro">("client");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError(t('passwordsNotMatch'));
            return;
        }

        if (password.length < 6) {
            setError(t('passwordMinLength'));
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, role }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || t('registrationError'));
                return;
            }

            // Sign in after registration
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (result?.ok) {
                router.push("/");
            } else {
                setError(t('signInAfterRegistrationError'));
            }
        } catch {
            setError(t('error'));
        } finally {
            setLoading(false);
        }
    };

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
                            <label htmlFor="role" className="text-sm font-medium">
                                {t('iWant')}
                            </label>
                            <Select
                                value={role}
                                onValueChange={(value) => setRole(value as "client" | "pro")}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="client">{t('findMaster')}</SelectItem>
                                    <SelectItem value="pro">{t('offerServices')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium">
                                {t('password')}
                            </label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                required
                                placeholder={t('passwordMinLength')}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="confirm-password" className="text-sm font-medium">
                                {t('confirmPassword')}
                            </label>
                            <Input
                                id="confirm-password"
                                name="confirm-password"
                                type="password"
                                autoComplete="new-password"
                                required
                                placeholder={t('confirmPassword')}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full"
                            />
                        </div>
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
                        <span className="text-muted-foreground">{t('hasAccount')} </span>
                        <button
                            type="button"
                            onClick={() => router.push("/signin")}
                            className="font-medium text-primary hover:underline"
                        >
                            {t('signIn')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
