"use client";

import { useTranslations } from 'next-intl';
import { useParams } from "next/navigation";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { listWorks, getProProfileById } from "@/lib/api";
import * as React from "react";

export default function ProPortfolioPage() {
    const t = useTranslations('pro.portfolio');
    const tCommon = useTranslations('common');
    const params = useParams<{ id?: string | string[] }>();
    const proId = React.useMemo(() => {
        const raw = params?.id;
        return Array.isArray(raw) ? raw[0] : raw;
    }, [params]);

    const { data: profile, isLoading: profileLoading } = useQuery({
        queryKey: ["pro", proId],
        queryFn: () => getProProfileById(proId as string),
        enabled: !!proId,
    });

    const { data: works, isLoading: worksLoading } = useQuery({
        queryKey: ["works", "pro", proId],
        queryFn: () => listWorks({ proId }),
        enabled: !!proId,
    });

    const isLoading = profileLoading || worksLoading;

    if (!proId) return <p className="opacity-70">{tCommon('loadingText')}</p>;
    if (isLoading) {
        return (
            <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-[280px] rounded-2xl border animate-pulse" />
                ))}
            </div>
        );
    }

    if (!works?.length) {
        return <p className="opacity-70">{t('noWorks')}</p>;
    }

    return (
        <div className="space-y-4">
            <header className="space-y-2">
                <h1 className="text-2xl font-semibold">
                    {t('title')} {profile?.name ? `${t('master')} ${profile.name}` : t('master')}
                </h1>
                {profile?.instagram && (
                    <a
                        href={`https://instagram.com/${profile.instagram.replace(/^@/, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                    >
                        @{profile.instagram.replace(/^@/, "")}
                    </a>
                )}
            </header>
            <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
                {works.map((w) => (
                    <figure key={w.id} className="rounded-2xl overflow-hidden border relative aspect-[4/5]">
                        <Image 
                            src={w.imageUrl} 
                            alt={w.caption ?? t('masterWork')} 
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            className="object-cover"
                        />
                        <figcaption className="absolute bottom-0 left-0 right-0 p-2 text-sm opacity-70 bg-gradient-to-t from-black/50 to-transparent">
                            {w.tags?.length ? w.tags.join(" • ") : "—"}
                        </figcaption>
                    </figure>
                ))}
            </div>
        </div>
    );
}
