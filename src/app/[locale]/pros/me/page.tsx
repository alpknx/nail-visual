"use client";

import { useTranslations } from 'next-intl';
import { useQuery } from "@tanstack/react-query";
import { getProProfile, type ProProfileInput } from "@/lib/api";
import ProProfileForm from "./pro-profile-form";
import { useSession } from "next-auth/react";

// Prevent static generation - this page requires authentication
export const dynamic = 'force-dynamic';

export default function ProMePage() {
    const t = useTranslations('pro.profile');
    const sessionResult = useSession();
    const status = sessionResult?.status ?? 'loading';

    // грузим профиль текущего pro
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["pro", "me"],
        queryFn: () => getProProfile("me"),
    });

    if (status === "loading" || isLoading) {
        return <div className="h-24 rounded-xl border animate-pulse" />;
    }

    if (isError) {
        return (
            <p className="text-sm text-red-600">
                {t('loadError')}: {String((error as Error)?.message ?? "unknown")}
            </p>
        );
    }

    // API может вернуть либо объект профиля, либо { data: ... } — нормализуем:
    const initial: ProProfileInput | null = data ? (typeof data === "object" && "data" in data ? (data as { data: ProProfileInput }).data : data) : null;

    return (
        <section className="space-y-6 max-w-2xl">
            <header>
                <h1 className="text-2xl font-semibold">{t('title')}</h1>
                <p className="text-sm opacity-70">
                    {t('subtitle')}
                </p>
            </header>

            <ProProfileForm
                initialData={
                    initial
                        ? {
                            bio: initial.bio ?? null,
                            instagram: initial.instagram ?? null,
                            minPricePln: initial.minPricePln ?? null,
                            city: initial.city ?? null,
                        }
                        : null
                }
            />
        </section>
    );
}
