"use client";

import * as React from "react";
import { useTranslations } from 'next-intl';
import Image from "next/image";
import { useParams } from "next/navigation";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { getProProfileById, listWorks, type Work } from "@/lib/api";
import WorkFlipModal from "@/components/WorkFlipModal";

export default function ProDetailPage() {
    const t = useTranslations('masters');
    const tCommon = useTranslations('common');
    const params = useParams<{ id?: string | string[] }>();
    const id = React.useMemo(() => {
        const raw = params?.id;
        return Array.isArray(raw) ? raw[0] : raw;
    }, [params]);
    
    const loadMoreRef = React.useRef<HTMLDivElement>(null);
    const limit = 30; // Количество работ за раз

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

    // его работы с infinite scroll
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: worksLoading,
        error: worksError,
    } = useInfiniteQuery({
        queryKey: ["works", "by-pro", id, "infinite"],
        queryFn: async ({ pageParam = 0 }) => {
            const url = new URL("/api/works", window.location.origin);
            url.searchParams.set("proId", id as string);
            url.searchParams.set("limit", String(limit));
            url.searchParams.set("offset", String(pageParam));
            const res = await fetch(url.toString());
            if (!res.ok) throw new Error("Failed to fetch works");
            const json = await res.json();
            return json.data || [];
        },
        getNextPageParam: (lastPage, allPages) => {
            return lastPage.length === limit ? allPages.length * limit : undefined;
        },
        initialPageParam: 0,
        enabled: !!id,
    });

    // Объединяем все страницы в один массив
    const works = data?.pages.flat() || [];
    
    const { data: session } = useSession();
    const [selectedWork, setSelectedWork] = React.useState<Work | null>(null);

    // Intersection Observer для автоматической загрузки при скролле
    React.useEffect(() => {
        if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) {
                    fetchNextPage();
                }
            },
            { rootMargin: "200px" }
        );

        observer.observe(loadMoreRef.current);
        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    if (!id) return <p className="opacity-70">{tCommon('loadingText')}</p>;

    const loading = profileLoading || worksLoading;

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="pt-16 md:pt-4 px-4">
                    <div className="h-16 rounded-2xl border animate-pulse" />
                </div>
                <div className="grid grid-cols-2 gap-2 px-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="aspect-[3/4] rounded-lg border animate-pulse bg-muted" />
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
        <section className="space-y-4">
            <div className="pt-16 md:pt-4 px-4">
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
            </div>

            {!works?.length && !worksLoading ? (
                <p className="opacity-70 px-4">{t('noWorks')}</p>
            ) : (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 pb-4 px-4">
                        {works.map((w: Work, index: number) => (
                            <figure 
                                key={w.id} 
                                className="rounded-xl overflow-hidden border relative cursor-pointer hover:border-foreground transition-colors"
                                onClick={() => setSelectedWork(w)}
                            >
                                <div className="relative aspect-[3/4]">
                                    <Image
                                        src={w.imageUrl}
                                        alt={w.caption ?? t('masterWork')}
                                        fill
                                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                        className="object-cover"
                                        priority={index < 4}
                                        loading={index < 4 ? "eager" : "lazy"}
                                    />
                                </div>
                                {w.caption && (
                                    <figcaption className="p-2 text-xs opacity-70 line-clamp-2">
                                        {w.caption}
                                    </figcaption>
                                )}
                            </figure>
                        ))}
                    </div>
                    
                    {/* Элемент для отслеживания скролла */}
                    {hasNextPage && (
                        <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
                            {isFetchingNextPage && (
                                <div className="text-sm text-muted-foreground">{tCommon('loading') || 'Загрузка...'}</div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Модальное окно с работой мастера */}
            {selectedWork && (
                <WorkFlipModal
                    work={selectedWork}
                    proId={id as string}
                    proName={profile.name}
                    onClose={() => setSelectedWork(null)}
                    session={session}
                />
            )}
        </section>
    );
}
