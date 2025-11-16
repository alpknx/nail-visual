"use client";

import * as React from "react";
import { useTranslations } from 'next-intl';
import Image from "next/image";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getProProfileById, listWorks, type Work } from "@/lib/api";

export default function ProDetailPage() {
    const t = useTranslations('masters');
    const tCommon = useTranslations('common');
    const params = useParams<{ id?: string | string[] }>();
    const id = React.useMemo(() => {
        const raw = params?.id;
        return Array.isArray(raw) ? raw[0] : raw;
    }, [params]);

    // профиль мастера
    const {
        data: profile,
        isLoading: profileLoading,
        error: profileError,
    } = useQuery({
        queryKey: ["pro", id],
        queryFn: () => getProProfileById(id as string),
        enabled: !!id,
    });

    // его работы — просим у API сразу по proId (не тянем все)
    const {
        data: works,
        isLoading: worksLoading,
        error: worksError,
    } = useQuery({
        queryKey: ["works", "by-pro", id],
        queryFn: () => listWorks({ proId: id as string, limit: 60 }),
        enabled: !!id,
    });

    if (!id) return <p className="opacity-70">{tCommon('loadingText')}</p>;

    const loading = profileLoading || worksLoading;

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-16 rounded-2xl border animate-pulse" />
                <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-[280px] rounded-2xl border animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (profileError) return <p className="text-red-600">{t('profileError')}</p>;
    if (worksError) return <p className="text-red-600">{t('worksError')}</p>;
    if (!profile) return <p className="opacity-70">{t('profileNotFound')}</p>;

    // нормализуем ссылку на инстаграм (разрешим как @handle, так и url)
    const instagramHref = profile.instagram
        ? profile.instagram.startsWith("http")
            ? profile.instagram
            : `https://instagram.com/${profile.instagram.replace(/^@/, "")}`
        : null;

    return (
        <section className="space-y-6">
            <header className="space-y-1">
                <h1 className="text-2xl font-semibold">
                    {profile.name || `${t('master')} ${String(id).slice(0, 6)}`}{" "}
                    {profile.isVerified ? <span title={t('verified')}>✅</span> : null}
                </h1>
                <p className="text-sm opacity-70">
                    {profile.city ? `${tCommon('city')}: ${profile.city}` : t('cityNotSpecified')}
                    {typeof profile.minPricePln === "number" ? ` • ${t('from')} ${profile.minPricePln} PLN` : ""}
                    {instagramHref ? (
                        <>
                            {" • "}
                            <a href={instagramHref} target="_blank" rel="noreferrer" className="underline">
                                Instagram
                            </a>
                        </>
                    ) : null}
                </p>
                {profile?.lastWorkAt ? <p className="text-sm opacity-80">{profile?.lastWorkAt}</p> : null}
                {!!profile.tags?.length && (
                    <p className="text-xs opacity-60">{tCommon('tags')}: {profile.tags.join(" • ")}</p>
                )}
                {!!profile.cities?.length && (
                    <p className="text-xs opacity-60">{t('cities')}: {profile.cities.join(" • ")}</p>
                )}
            </header>

            {!works?.length ? (
                <p className="opacity-70">{t('noWorks')}</p>
            ) : (
                <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
                    {works.map((w: Work, index: number) => (
                        <figure key={w.id} className="rounded-2xl overflow-hidden border relative">
                            <div className="relative aspect-[4/5]">
                                <Image
                                    src={w.imageUrl}
                                    alt={w.caption ?? t('masterWork')}
                                    fill
                                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                    className="object-cover"
                                    priority={index < 4}
                                />
                            </div>
                            <figcaption className="p-2 text-sm opacity-70">
                                {w.tags?.length ? w.tags.join(" • ") : tCommon('withoutTags')}
                            </figcaption>
                        </figure>
                    ))}
                </div>
            )}
        </section>
    );
}
